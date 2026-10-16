import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import type { MemberCategory, Member } from '../lib/types';
import { Button, Field, Input, ModalActions, Select } from './ui';
import PhoneInput, { isPossiblePhone } from './PhoneInput';

export interface RegisterResult {
  member: Member;
  matched_existing: boolean;
  checked_in: boolean;
}

const empty = {
  name: '',
  phone: '',
  gender: 'Male',
  residency: '',
  email: '',
  occupation: '',
  place_of_work: '',
  referral_source: '',
  category: 'first_timer' as MemberCategory,
  born_again: 'No',
};

/**
 * One form for both "register and check in" (a service is passed) and
 * "just add to the database" (no service).
 *
 * The category the user picks is sent through unchanged — registering during
 * a service does not silently turn somebody into a first timer.
 */
export default function RegisterForm({
  serviceId,
  prefillName,
  onDone,
  onCancel,
}: {
  serviceId?: string;
  prefillName?: string;
  onDone: (result: RegisterResult) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...empty, name: prefillName ?? '' });
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const set = (patch: Partial<typeof empty>) => setForm({ ...form, ...patch });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('A name is required', 'error');
    // A blank phone is fine — plenty of people give none. A half-typed one is not.
    if (form.phone && !isPossiblePhone(form.phone)) {
      return toast('That phone number is incomplete for the country selected', 'error');
    }
    setBusy(true);

    const { data, error } = await supabase.rpc('register_member', {
      p_name: form.name.trim(),
      p_phone: form.phone,
      p_category: form.category,
      p_service_id: serviceId ?? null,
      p_gender: form.gender,
      p_residency: form.residency.trim(),
      p_email: form.email.trim(),
      p_occupation: form.occupation.trim(),
      p_place_of_work: form.place_of_work.trim(),
      p_born_again: form.born_again === 'Yes',
      p_referral_source: form.referral_source.trim(),
    });

    setBusy(false);

    if (error) {
      const msg = error.message.includes('members_identity_key')
        ? 'Somebody with this exact name and phone number is already on file.'
        : error.message;
      return toast(msg, 'error');
    }

    const result = data as RegisterResult;
    if (result.matched_existing) {
      toast(
        result.checked_in
          ? `${result.member.name} was already on file — checked in.`
          : `${result.member.name} was already on file.`,
        'info',
      );
    } else {
      toast(
        serviceId ? `${result.member.name} registered and checked in` : `${result.member.name} added`,
        'success',
      );
    }
    onDone(result);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name" required>
        <Input
          required
          autoFocus
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="John Doe"
        />
      </Field>

      <Field label="Phone" hint="Used to spot duplicates. Pick the country if it isn't Uganda.">
        <PhoneInput value={form.phone} onChange={(phone) => set({ phone })} />
      </Field>

      <Field label="Gender">
        <Select value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
          <option>Male</option>
          <option>Female</option>
        </Select>
      </Field>

      <Field label="Residence">
        <Input
          value={form.residency}
          onChange={(e) => set({ residency: e.target.value })}
          placeholder="Entebbe, Kitoro"
        />
      </Field>

      <Field label="Category" hint="This is saved exactly as you choose it.">
        <Select
          value={form.category}
          onChange={(e) => set({ category: e.target.value as MemberCategory })}
        >
          <option value="first_timer">First timer</option>
          <option value="member">Member</option>
        </Select>
      </Field>

      {!showMore ? (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          + More details
        </button>
      ) : (
        <div className="space-y-4 border-t border-ink-100 pt-4">
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="john@example.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Occupation">
              <Input
                value={form.occupation}
                onChange={(e) => set({ occupation: e.target.value })}
              />
            </Field>
            <Field label="Place of work">
              <Input
                value={form.place_of_work}
                onChange={(e) => set({ place_of_work: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Born again">
              <Select
                value={form.born_again}
                onChange={(e) => set({ born_again: e.target.value })}
              >
                <option>No</option>
                <option>Yes</option>
              </Select>
            </Field>
            <Field label="Invited by">
              <Input
                value={form.referral_source}
                onChange={(e) => set({ referral_source: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      <ModalActions>
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={busy}>
          {serviceId ? 'Register & check in' : 'Save'}
        </Button>
      </ModalActions>
    </form>
  );
}
