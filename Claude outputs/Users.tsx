import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Mail, Pencil, Phone, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Profile, UserRole } from '../lib/types';
import { Badge, Button, Empty, Select, Spinner } from '../components/ui';

// Carries the phone-number metadata, so it is fetched on first open rather
// than shipped in the initial bundle.
const UserFormModal = lazy(() => import('../components/UserFormModal'));

/** 'new' opens the add form; a Profile opens the edit form. */
type Editing = Profile | 'new' | null;

export default function Users() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) toast(error.message, 'error');
    setRows((data as Profile[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setRole = async (row: Profile, role: UserRole) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', row.id);
    if (error) return toast(error.message, 'error');
    toast(`${row.full_name || row.email} is now ${role}`, 'success');
    void load();
  };

  const remove = async (row: Profile) => {
    if (!window.confirm(`Remove ${row.email} from HE IS?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', row.id);
    if (error) return toast(error.message, 'error');
    toast('Removed', 'success');
    void load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900">Users</h1>
          <p className="text-sm text-ink-500">Who can sign in, and what they can do</p>
        </div>
        <Button icon={<UserPlus className="size-4" />} onClick={() => setEditing('new')}>
          <span className="hidden sm:inline">Add user</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-500">
        <p className="mb-2 font-semibold text-ink-700">How access works</p>
        You add somebody's email here first. They then sign in with that <em>exact</em>{' '}
        address — by Google or with a password — and the two link up automatically. It also
        works the other way round: if they signed in before you added them, they are linked
        the next time they open the app. Anyone who signs in without being added here sees
        nothing.
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty title="No users yet" />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isSelf = row.id === profile?.id;
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-ink-200 bg-white p-4 sm:flex sm:items-center sm:gap-3"
              >
                {/* Identity block. On a phone this gets the full width and the
                    controls drop below it, rather than everything competing
                    for one cramped row. */}
                <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      row.role === 'admin'
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {row.role === 'admin' ? (
                      <ShieldCheck className="size-5" />
                    ) : (
                      <Mail className="size-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">
                      {row.full_name || row.email}
                      {isSelf && <span className="ml-2 text-xs text-ink-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-ink-500">{row.email}</p>
                    {row.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                        <Phone className="size-3 shrink-0" />
                        {row.phone}
                      </p>
                    )}
                    {(!row.user_id || !row.is_active) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {!row.user_id && <Badge tone="muted">Not signed up</Badge>}
                        {!row.is_active && <Badge tone="muted">Suspended</Badge>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3 sm:mt-0 sm:shrink-0 sm:border-0 sm:pt-0">
                  {/* Kept inline: changing a role is the one thing an admin
                      does often enough to not want a dialog for. */}
                  <Select
                    value={row.role}
                    disabled={isSelf}
                    onChange={(e) => void setRole(row, e.target.value as UserRole)}
                    className="flex-1 py-2 text-sm disabled:opacity-50 sm:w-auto sm:flex-none sm:py-1.5"
                  >
                    <option value="registrar">Registrar</option>
                    <option value="admin">Admin</option>
                  </Select>

                  <button
                    onClick={() => setEditing(row)}
                    className="rounded-lg p-2.5 text-ink-500 hover:bg-ink-100"
                    aria-label={`Edit ${row.full_name || row.email}`}
                    title="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>

                  {!isSelf && (
                    <button
                      onClick={() => void remove(row)}
                      className="rounded-lg p-2.5 text-rose-500 hover:bg-rose-50"
                      aria-label={`Remove ${row.email}`}
                      title="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Suspense fallback={null}>
          <UserFormModal
            profile={editing === 'new' ? null : editing}
            isSelf={editing !== 'new' && editing.id === profile?.id}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
