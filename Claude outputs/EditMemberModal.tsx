import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import type { Member } from '../lib/types';
import { Button, Field, Input, Modal, ModalActions, Select } from './ui';
import PhoneInput, { isPossiblePhone } from './PhoneInput';

/**
 * Kept in its own file so the phone-number metadata it pulls in is code-split
 * away from the initial bundle, same as RegisterForm.
 */
export default function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  // Plain strings: the <select> hands back a string, and the database
  // constraint is the thing that actually validates the value.
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    gender: string;
    residency: string;
    category: string;
  }>({
    name: member.name,
    phone: member.phone ?? '',
    gender: member.gender ?? 'Male',
    residency: member.residency ?? '',
    category: member.category,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: member.name,
      phone: member.phone ?? '',
      gender: member.gender ?? 'Male',
      residency: member.residency ?? '',
      category: member.category,
    });
  }, [member]);

  const save = async () => {
    if (!form.name.trim()) return toast('A name is required', 'error');
    if (form.phone && !isPossiblePhone(form.phone)) {
      return toast('That phone number is incomplete for the country selected', 'error');
    }
    setBusy(true);
    const { error } = await supabase
      .from('members')
      .update({
        name: form.name.trim(),
        phone: form.phone,
        gender: form.gender,
        residency: form.residency.trim(),
        category: form.category,
      })
      .eq('id', member.id);
    setBusy(false);
    if (error) {
      return toast(
        error.message.includes('members_identity_key')
          ? 'Another record already has this name and phone number.'
          : error.message,
        'error',
      );
    }
    toast('Saved', 'success');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Edit person">
      <div className="space-y-4">
        <Field label="Full name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        </Field>
        <Field label="Gender">
          <Select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option>Male</option>
            <option>Female</option>
          </Select>
        </Field>
        <Field label="Residence">
          <Input
            value={form.residency}
            onChange={(e) => setForm({ ...form, residency: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="first_timer">First timer</option>
            <option value="member">Member</option>
          </Select>
        </Field>
        <ModalActions>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={busy} onClick={() => void save()}>
            Save
          </Button>
        </ModalActions>
      </div>
    </Modal>
  );
}
