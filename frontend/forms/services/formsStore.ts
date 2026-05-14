// ─── Forms Storage Service (Firestore-backed) ─────────────────────────────────
//
// Collections:
//   forms/{formId}          — working draft (auto-saved, not public-facing)
//   live_forms/{formId}     — published snapshot (written ONLY on explicit Publish/Republish)
//   responses/{responseId}  — one doc per response (form_id field for querying)
//
// All functions are async and return Promises.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { formsDb } from './firebaseConfig';
import type { Form, FormResponse, FormStatus, AnswerValue } from '../types/forms.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Strip Firestore Timestamps → ISO strings so the rest of the app stays pure JSON */
function toForm(data: Record<string, unknown>): Form {
  const fix = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : (v as string);
  return {
    ...(data as Form),
    created_at: fix(data.created_at),
    updated_at: fix(data.updated_at),
  };
}

function toResponse(data: Record<string, unknown>): FormResponse {
  const fix = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : (v as string);
  return {
    ...(data as FormResponse),
    submitted_at: fix(data.submitted_at),
  };
}

// ─── Sanitizer ────────────────────────────────────────────────────────────────

/**
 * Recursively remove all `undefined` values from an object before writing to
 * Firestore. Firestore rejects `undefined`; all optional fields must be either
 * a real value or simply absent.
 */
function sanitize<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(sanitize) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        // Strip both undefined AND null — null is used as "clear this key" signal
        // from FieldPropertiesPanel when switching field types
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, sanitize(v)])
    ) as T;
  }
  return obj;
}


const formsCol    = collection(formsDb, 'forms');
const liveCol     = collection(formsDb, 'live_forms');
const responsesCol = collection(formsDb, 'responses');

// ─── Public Form (live snapshot only) ────────────────────────────────────────

/**
 * Read the PUBLISHED snapshot of a form (no auth required — used by PublicFormPage).
 * This document is only written by publishSnapshot(), never by saveForm().
 */
export async function getPublicForm(formId: string): Promise<Form | null> {
  try {
    const snap = await getDoc(doc(liveCol, formId));
    if (!snap.exists()) return null;
    return toForm(snap.data() as Record<string, unknown>);
  } catch { return null; }
}

/**
 * Write the live snapshot — call ONLY on explicit Publish / Republish.
 * This is what the public form page reads.
 */
export async function publishSnapshot(form: Form): Promise<void> {
  await setDoc(doc(liveCol, form.id), sanitize({
    ...form,
    updated_at: serverTimestamp(),
  }));
}

/**
 * Remove the live snapshot — called on Unpublish so the public link returns 404.
 */
export async function unpublishSnapshot(formId: string): Promise<void> {
  await deleteDoc(doc(liveCol, formId));
}

// ─── Forms CRUD (working draft) ───────────────────────────────────────────────

/** Get all draft forms belonging to a user, newest first. */
export async function getForms(ownerUid: string): Promise<Form[]> {
  try {
    const q = query(formsCol, where('owner_uid', '==', ownerUid), orderBy('updated_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => toForm(d.data() as Record<string, unknown>));
  } catch { return []; }
}

/** Upsert a draft form. Returns the saved form. */
export async function saveForm(form: Form): Promise<Form> {
  const now = new Date().toISOString();
  const updated: Form = { ...form, updated_at: now };
  await setDoc(doc(formsCol, form.id), sanitize(updated));
  return updated;
}

/** Create a brand-new blank form. */
export async function createForm(ownerUid: string): Promise<Form> {
  const now = new Date().toISOString();
  const form: Form = {
    id: uid(),
    owner_uid: ownerUid,
    title: 'Untitled Form',
    description: '',
    fields: [],
    status: 'draft',
    created_at: now,
    updated_at: now,
    response_count: 0,
  };
  return saveForm(form);
}

/** Fetch a single draft form by ID. */
export async function getForm(ownerUid: string, formId: string): Promise<Form | null> {
  try {
    const snap = await getDoc(doc(formsCol, formId));
    if (!snap.exists()) return null;
    const form = toForm(snap.data() as Record<string, unknown>);
    // Guard: only allow owner to access
    if (form.owner_uid !== ownerUid) return null;
    return form;
  } catch { return null; }
}

/** Hard-delete a form, its live snapshot, and all its responses. */
export async function deleteForm(ownerUid: string, formId: string): Promise<void> {
  // Verify ownership first
  const form = await getForm(ownerUid, formId);
  if (!form) return;

  await Promise.all([
    deleteDoc(doc(formsCol, formId)),
    unpublishSnapshot(formId),
  ]);

  // Delete all responses for this form
  const q = query(responsesCol, where('form_id', '==', formId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

/** Update just the status field on the draft. */
export async function publishForm(ownerUid: string, formId: string, status: FormStatus): Promise<void> {
  const form = await getForm(ownerUid, formId);
  if (form) await saveForm({ ...form, status });
}

// ─── Responses CRUD ───────────────────────────────────────────────────────────

/** Fetch all responses for a form, newest first. */
export async function getResponses(formId: string): Promise<FormResponse[]> {
  try {
    const q = query(responsesCol, where('form_id', '==', formId), orderBy('submitted_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => toResponse(d.data() as Record<string, unknown>));
  } catch { return []; }
}

/** Submit a new response. Also increments response_count on the draft form. */
export async function addResponse(
  formId: string,
  ownerUid: string,
  answers: Record<string, AnswerValue>,
  meta?: { respondent_name?: string; respondent_email?: string },
): Promise<FormResponse> {
  const now = new Date().toISOString();
  const resp: FormResponse = {
    id: uid(),
    form_id: formId,
    submitted_at: now,
    answers,
    ...meta,
  };
  await setDoc(doc(responsesCol, resp.id), resp);

  // Bump the response_count on the draft form
  try {
    const form = await getForm(ownerUid, formId);
    if (form) {
      await saveForm({ ...form, response_count: (form.response_count ?? 0) + 1 });
    }
  } catch { /* non-critical */ }

  return resp;
}

/** Delete a single response by ID. */
export async function deleteResponse(formId: string, responseId: string): Promise<void> {
  await deleteDoc(doc(responsesCol, responseId));
}
