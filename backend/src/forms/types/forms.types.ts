// Forms Domain Types
// TypeScript interfaces and enums for the Manifest Forms domain.

export interface Form {
  id: string;
  owner_id: string;          // Supabase user id
  title: string;
  description?: string;
  fields: FormField[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];        // for select / radio / checkbox
}

export interface FormResponse {
  id: string;
  form_id: string;
  respondent_id?: string;    // null for anonymous responses
  answers: Record<string, any>;
  submitted_at: string;
}

export interface FormsUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}
