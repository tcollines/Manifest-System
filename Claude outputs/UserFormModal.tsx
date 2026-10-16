import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import type { Profile, UserRole } from '../lib/types';
import { Button, Field, Input, Modal, ModalActions, Select } from './ui';
import PhoneInput, { isPossiblePhone } from './PhoneInput';

/**
 * Add or edit a staff member. One component for both, because the fields are
 * the same and the differences are small enough to express as conditions:
 *
 *  - Adding: email is the whole point, since it is what the person's account
 *    links to when they sign in.
 *  - Editing somebody who has already signed in: email is locked. Changing it
 *    here would not change the address they authenticate with, it would just
 *    break the link between the two and lock them out.
 *  - Editing yourself: role and access are locked, so an admin cannot
 *    accidentally demote or suspend the last way into the app.
 *
 * Kept in its own file so the phone-number metadata it pulls in stays out of
 * the initial bundle, same as RegisterForm and EditMemberModal.
 */
export default function UserFormModal({
  profile,
  isSelf,
  onClose,
  onSaved,
}: {
  /** null = adding somebody new */
  profile: Profile | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const editing = profile !== null;
  const hasSignedUp = !!profile?.user_id;

  const [form, setForm] = useState({
    email: profile?.email ?? '',
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    role: (profile?.role ?? 'registrar') as UserRole,
    is_active: profile?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!editing && !form.email.trim()) {
      return toast('An email address is required', 'error');
    }
    if (form.phone && !isPossiblePhone(form.phone)) {
      return toast('That phone number is incomplete for the country selected', 'error');
    }

    setBusy(true);

    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      phone: form.phone,
      role: form.role,
      is_active: form.is_active,
    };
    // Only send the email when it can legitimately change: on a new invite,
    // or on one nobody has claimed yet.
    if (!editing || !hasSignedUp) {
      payload.email = form.email.trim().toLowerCase();
    }

    const { error } = editing
      ? await supabase.from('profiles').update(payload).eq('id', profile.id)
      : await supabase.from('profiles').insert(payload);

    setBusy(false);

    if (error) {
      return toast(
        error.message.includes('profiles_email_key')
          ? 'That email is already on the list.'
          : error.message,
        'error',
      );
    }

    toast(editing ? 'Saved' : `${form.email.trim()} can now create an account`, 'success');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit user' : 'Add user'}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email"
          required={!editing}
          hint={
            hasSignedUp
              ? 'Locked: this is the address their account signs in with.'
              : 'Must match the address they sign up with.'
          }
        >
          <Input
            type="email"
            required={!editing}
            autoFocus={!editing}
            disabled={hasSignedUp}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usher@church.org"
            className={hasSignedUp ? 'bg-ink-50 text-ink-500' : undefined}
          />
        </Field>

        <Field label="Name">
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Mary Nakato"
          />
        </Field>

        <Field label="Phone" hint="Optional. Pick the country if it isn't Uganda.">
          <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        </Field>

        <Field
          label="Role"
          hint={
            isSelf
              ? 'You cannot change your own role.'
              : form.role === 'admin'
                ? 'Admins create services, manage users, undo check-ins and see the database.'
                : 'Registrars search, check people in and register new people. They cannot undo a check-in.'
          }
        >
          <Select
            value={form.role}
            disabled={isSelf}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className={isSelf ? 'bg-ink-50 text-ink-500' : undefined}
          >
            <option value="registrar">Registrar</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>

        {editing && !isSelf && (
          <label className="flex items-start gap-3 rounded-xl bg-ink-50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="mt-0.5 size-4 accent-ink-900"
            />
            <span className="text-sm">
              <span className="font-semibold text-ink-900">Access enabled</span>
              <span className="block text-xs text-ink-500">
                Turn this off to suspend them without deleting anything. Their past
                check-ins stay on record.
              </span>
            </span>
          </label>
        )}

        <ModalActions>
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={busy}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
