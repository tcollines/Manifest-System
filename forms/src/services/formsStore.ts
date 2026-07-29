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
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { formsDb } from './firebaseConfig';
import type { Form, FormResponse, FormStatus, AnswerValue } from '../types/forms.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Strip Firestore Timestamps → ISO strings so the rest of the app stays pure JSON.
 *  Also normalises FormField.required to always be a boolean (defaults to false
 *  when the key is absent — older documents may not have it stored). */
function toForm(data: Record<string, unknown>): Form {
  const fix = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : (v as string);

  // Normalise fields so `required` is always a boolean
  const rawFields = (data.fields ?? []) as Record<string, unknown>[];
  const fields = rawFields.map(f => ({
    ...f,
    required: f.required === true, // treat missing / null / undefined as false
  }));

  return {
    ...(data as unknown as Form),
    fields: fields as Form['fields'],
    created_at: fix(data.created_at),
    updated_at: fix(data.updated_at),
  };
}

function toResponse(data: Record<string, unknown>): FormResponse {
  const fix = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : (v as string);
  return {
    ...(data as unknown as FormResponse),
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
  const normalizedFields = (form.fields ?? []).map(f => ({
    ...f,
    required: f.required === true,
  }));
  await setDoc(doc(liveCol, form.id), sanitize({
    ...form,
    fields: normalizedFields,
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

/** Get all draft forms belonging to a user, newest first.
 *  Also finds and claims any unclaimed forms (owner_uid == '') — legacy of the empty-uid bug. */
export async function getForms(ownerUid: string): Promise<Form[]> {
  if (!ownerUid) return [];
  try {
    // Query owned forms
    const ownedQ = query(formsCol, where('owner_uid', '==', ownerUid), orderBy('updated_at', 'desc'));
    // Query unclaimed forms (owner_uid == '') from the empty-uid bug
    const unclaimedQ = query(formsCol, where('owner_uid', '==', ''));

    const [ownedSnap, unclaimedSnap] = await Promise.all([
      getDocs(ownedQ),
      getDocs(unclaimedQ),
    ]);

    const owned = ownedSnap.docs.map(d => toForm(d.data() as Record<string, unknown>));

    // Claim any unclaimed forms by updating their owner_uid
    if (!unclaimedSnap.empty) {
      const batch = writeBatch(formsDb);
      unclaimedSnap.docs.forEach(d => {
        batch.update(d.ref, { owner_uid: ownerUid });
      });
      await batch.commit();
      const claimed = unclaimedSnap.docs.map(d => ({
        ...toForm(d.data() as Record<string, unknown>),
        owner_uid: ownerUid,
      }));
      // Merge owned + newly claimed, deduplicated by id
      const allById = new Map([...owned, ...claimed].map(f => [f.id, f]));
      return [...allById.values()].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    return owned;
  } catch { return []; }
}

/** Upsert a draft form. Returns the saved form. */
export async function saveForm(form: Form): Promise<Form> {
  const now = new Date().toISOString();
  // Ensure every field always has an explicit boolean `required` before writing
  // to Firestore. Without this, undefined values get stripped by sanitize() and
  // the toggle state is "forgotten" on the next read.
  const normalizedFields = (form.fields ?? []).map(f => ({
    ...f,
    required: f.required === true,
  }));
  const updated: Form = { ...form, fields: normalizedFields, updated_at: now };
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

/** Fetch a single draft form by ID.
 *  If the form exists but is unclaimed (owner_uid == ''), claims it and returns it. */
export async function getForm(ownerUid: string, formId: string): Promise<Form | null> {
  if (!ownerUid) return null;
  try {
    const snap = await getDoc(doc(formsCol, formId));
    if (!snap.exists()) return null;
    const form = toForm(snap.data() as Record<string, unknown>);
    // Exact owner match — normal path
    if (form.owner_uid === ownerUid) return form;
    // Unclaimed form (from the empty-uid bug) — claim it now
    if (form.owner_uid === '') {
      const claimed = { ...form, owner_uid: ownerUid };
      await saveForm(claimed);
      return claimed;
    }
    // Owned by someone else
    return null;
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

  // Delete all responses in batches of 499 (Firestore batch limit is 500)
  const BATCH_SIZE = 499;
  const q = query(responsesCol, where('form_id', '==', formId));
  let snap = await getDocs(q);
  while (!snap.empty) {
    const batch = writeBatch(formsDb);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    if (snap.docs.length < BATCH_SIZE) break;
    // Fetch next page
    snap = await getDocs(query(
      responsesCol,
      where('form_id', '==', formId),
      startAfter(snap.docs[snap.docs.length - 1]),
      limit(BATCH_SIZE),
    ));
  }
}

/** Update just the status field on the draft. */
export async function publishForm(ownerUid: string, formId: string, status: FormStatus): Promise<void> {
  const form = await getForm(ownerUid, formId);
  if (form) await saveForm({ ...form, status });
}

// ─── Responses CRUD ───────────────────────────────────────────────────────────

const PAGE_SIZE = 200; // responses loaded per page

/**
 * Fetch responses for a form, paginated.
 * - First call: pass no cursor → returns newest PAGE_SIZE responses
 * - Next page: pass the last doc snapshot as cursor
 * Returns { responses, nextCursor } — nextCursor is null when no more pages.
 */
export async function getResponses(
  formId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{ responses: FormResponse[]; nextCursor: QueryDocumentSnapshot<DocumentData> | null }> {
  try {
    const constraints = [
      where('form_id', '==', formId),
      orderBy('submitted_at', 'desc'),
      limit(PAGE_SIZE),
      ...(cursor ? [startAfter(cursor)] : []),
    ] as const;
    const snap = await getDocs(query(responsesCol, ...constraints));
    const responses = snap.docs.map(d => toResponse(d.data() as Record<string, unknown>));
    const nextCursor = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;
    return { responses, nextCursor };
  } catch { return { responses: [], nextCursor: null }; }
}

/** Submit a new response. Uses atomic increment — no read required. */
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

  // Step 1: Write the response document. Rules allow create from anyone (unauthenticated).
  // This MUST NOT be batched with the counter update because anonymous users cannot
  // update forms/{formId} — mixing them in one batch causes the entire commit to fail.
  await setDoc(doc(responsesCol, resp.id), sanitize(resp));

  // Step 2: Best-effort counter increment on the draft form.
  // This only succeeds when the owner is signed in (expected in the builder).
  // Anonymous public submitters will get a permission error here which we silently ignore.
  try {
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(formsCol, formId), { response_count: increment(1) });
  } catch {
    // Silently ignored — counter will be reconciled lazily or via Cloud Function.
  }

  return resp;
}


/** Delete a single response by ID. Decrements response_count atomically. */
export async function deleteResponse(formId: string, responseId: string): Promise<void> {
  const batch = writeBatch(formsDb);
  batch.delete(doc(responsesCol, responseId));
  batch.update(doc(formsCol, formId), { response_count: increment(-1) });
  await batch.commit();
}

// ─── Migration Utilities ──────────────────────────────────────────────────────

/**
 * Returns ALL draft forms for an owner — used by the migration tool to find
 * forms regardless of what document ID they are stored under.
 */
export async function getAllForms(ownerUid: string): Promise<Form[]> {
  try {
    const q = query(formsCol, where('owner_uid', '==', ownerUid));
    const snap = await getDocs(q);
    return snap.docs.map(d => toForm(d.data() as Record<string, unknown>));
  } catch { return []; }
}

/**
 * One-time migration: copies a form from its current (wrong) Firestore document
 * ID to a canonical target ID, republishes the live snapshot under the new ID,
 * and deletes the old stale documents.
 *
 * @param ownerUid   - UID of the authenticated owner
 * @param sourceId   - The current (wrong) document ID to copy FROM
 * @param targetId   - The permanent canonical ID to copy TO
 */
export async function migrateFormToId(
  ownerUid: string,
  sourceId: string,
  targetId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    // 1. Read source draft
    const sourceSnap = await getDoc(doc(formsCol, sourceId));
    if (!sourceSnap.exists()) {
      return { ok: false, message: `Source form "${sourceId}" not found in forms collection.` };
    }
    const sourceData = sourceSnap.data() as Record<string, unknown>;
    if (sourceData.owner_uid !== ownerUid) {
      return { ok: false, message: 'Permission denied: you are not the owner of the source form.' };
    }

    // 2. Build new form doc with the target ID
    const now = new Date().toISOString();
    const migratedForm: Form = {
      ...toForm(sourceData),
      id: targetId,
      updated_at: now,
      status: 'published',
    };

    // 3. Write draft + live snapshot under targetId, delete old docs — all in one batch
    const batch = writeBatch(formsDb);
    batch.set(doc(formsCol,  targetId), sanitize(migratedForm));
    batch.set(doc(liveCol,   targetId), sanitize({ ...migratedForm, updated_at: serverTimestamp() }));

    // Delete old stale documents if sourceId differs from targetId
    if (sourceId !== targetId) {
      batch.delete(doc(formsCol, sourceId));
      // Also try to clean up old live snapshot (ignore if it doesn't exist)
      const oldLiveSnap = await getDoc(doc(liveCol, sourceId));
      if (oldLiveSnap.exists()) batch.delete(doc(liveCol, sourceId));
    }

    await batch.commit();
    return { ok: true, message: `Form successfully migrated to ID "${targetId}" and republished.` };
  } catch (e) {
    return { ok: false, message: `Migration failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Scans the ENTIRE responses collection (auth required) and returns:
 * - all orphaned responses (form_id !== canonicalFormId)
 * - total count of ALL response documents found
 * - all distinct form_ids found across the collection
 */
export async function findOrphanedResponses(
  canonicalFormId: string,
): Promise<{ responses: FormResponse[]; formIds: string[]; totalCount: number; allFormIds: string[] }> {
  try {
    const snap = await getDocs(responsesCol);
    const all = snap.docs.map(d => toResponse(d.data() as Record<string, unknown>));
    const orphans = all.filter(r => r.form_id !== canonicalFormId);
    const formIds = [...new Set(orphans.map(r => r.form_id))];
    const allFormIds = [...new Set(all.map(r => r.form_id))];
    return { responses: orphans, formIds, totalCount: all.length, allFormIds };
  } catch (e) {
    console.error('findOrphanedResponses error:', e);
    return { responses: [], formIds: [], totalCount: -1, allFormIds: [] };
  }
}

/**
 * Re-stamps all provided response IDs with a new form_id so they appear
 * under the canonical form. Runs in batches of 490 to stay within Firestore limits.
 */
export async function migrateResponsesToFormId(
  responseIds: string[],
  newFormId: string,
): Promise<{ ok: boolean; count: number; message: string }> {
  try {
    const CHUNK = 490;
    let migrated = 0;
    for (let i = 0; i < responseIds.length; i += CHUNK) {
      const chunk = responseIds.slice(i, i + CHUNK);
      const batch = writeBatch(formsDb);
      for (const id of chunk) {
        batch.update(doc(responsesCol, id), { form_id: newFormId });
      }
      await batch.commit();
      migrated += chunk.length;
    }
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(formsCol, newFormId), { response_count: migrated });
    } catch { /* best effort */ }
    return { ok: true, count: migrated, message: `${migrated} response(s) re-linked to "${newFormId}".` };
  } catch (e) {
    return { ok: false, count: 0, message: `Response migration failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Force-claims the form at formId by stamping owner_uid = currentUid,
 * regardless of what owner_uid is currently stored. Also refreshes live_forms
 * so the public link stays published. Use when getForms() returns nothing
 * because the form's owner_uid is a stale/wrong value.
 */
export async function forceClaimForm(
  currentUid: string,
  formId: string,
): Promise<{ ok: boolean; currentOwner: string; message: string }> {
  try {
    // Read the form WITHOUT owner check (just the raw doc)
    const snap = await getDoc(doc(formsCol, formId));
    if (!snap.exists()) {
      return { ok: false, currentOwner: '', message: `No form found at forms/${formId}` };
    }
    const data = snap.data() as Record<string, unknown>;
    const currentOwner = String(data.owner_uid ?? '(none)');
    const updated: Form = { ...toForm(data), owner_uid: currentUid, id: formId, status: 'published' };

    const batch = writeBatch(formsDb);
    batch.set(doc(formsCol, formId), sanitize(updated));
    batch.set(doc(liveCol,  formId), sanitize({ ...updated, updated_at: serverTimestamp() }));
    await batch.commit();

    return {
      ok: true,
      currentOwner,
      message: `Form claimed! Was owned by "${currentOwner}", now owned by "${currentUid}".`,
    };
  } catch (e) {
    return { ok: false, currentOwner: '', message: `Force claim failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
