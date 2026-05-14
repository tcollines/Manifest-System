// ─── Field Types ──────────────────────────────────────────────────────────────

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'gps'
  | 'file'
  | 'image'
  | 'contact'
  | 'dropdown'
  | 'radio'
  | 'yes_no'
  | 'multi_select'
  | 'datetime'
  | 'signature';

// ─── Field Definition (used in builder) ──────────────────────────────────────

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  // Type-specific options
  options?: string[];              // dropdown / radio / multi_select
  placeholder?: string;           // text / number
  min?: number;                   // number
  max?: number;                   // number
  allowDecimals?: boolean;        // number
  contactType?: 'phone' | 'email' | 'both'; // contact
  allowedFileTypes?: string[];    // file / image
  maxFileSizeMb?: number;         // file / image
  autoGps?: boolean;              // gps — auto-capture on open
  dateOnly?: boolean;             // datetime
  timeOnly?: boolean;             // datetime
}

// ─── Form (stored in localStorage / Firestore) ────────────────────────────────

export type FormStatus = 'draft' | 'published';

export interface Form {
  id: string;
  owner_uid: string;
  title: string;
  description: string;
  fields: FormField[];
  status: FormStatus;
  created_at: string;   // ISO
  updated_at: string;   // ISO
  response_count: number;
  accent_color?: string;
  cover_image?: string; // base64 data-url for the cover photo
}

// ─── Response ─────────────────────────────────────────────────────────────────

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | { lat: number; lng: number }
  | null;

export interface FormResponse {
  id: string;
  form_id: string;
  submitted_at: string; // ISO
  answers: Record<string, AnswerValue>; // fieldId → value
  respondent_name?: string;
  respondent_email?: string;
}

// ─── Field type metadata (for UI) ────────────────────────────────────────────

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  icon: string;        // emoji
  group: string;
  description: string;
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  // Basic
  { type: 'short_text',  label: 'Short Text',    icon: '🔤', group: 'Basic',     description: 'Single line text input' },
  { type: 'long_text',   label: 'Long Text',     icon: '📝', group: 'Basic',     description: 'Multi-line paragraph' },
  { type: 'number',      label: 'Number',        icon: '🔢', group: 'Basic',     description: 'Numeric with validation' },
  { type: 'yes_no',      label: 'Yes / No',      icon: '✅', group: 'Basic',     description: 'Boolean toggle' },
  { type: 'datetime',    label: 'Date / Time',   icon: '📅', group: 'Basic',     description: 'Date and/or time picker' },
  // Selection
  { type: 'dropdown',    label: 'Dropdown',      icon: '🔽', group: 'Selection', description: 'Single-select list' },
  { type: 'radio',       label: 'Radio Buttons', icon: '🔘', group: 'Selection', description: 'One-of-many options' },
  { type: 'multi_select',label: 'Multi-Select',  icon: '☑️', group: 'Selection', description: 'Checkboxes — many options' },
  // Contact & Files
  { type: 'contact',     label: 'Contact Field', icon: '📞', group: 'Contact & Files', description: 'Phone or email' },
  { type: 'file',        label: 'File Upload',   icon: '📎', group: 'Contact & Files', description: 'PDFs, docs, etc.' },
  { type: 'image',       label: 'Image Upload',  icon: '🖼️', group: 'Contact & Files', description: 'Photos' },
  // Advanced
  { type: 'gps',         label: 'GPS Location',  icon: '📍', group: 'Advanced',  description: 'Capture lat/lng' },
  { type: 'signature',   label: 'Signature',     icon: '✍️', group: 'Advanced',  description: 'Draw signature' },
];
