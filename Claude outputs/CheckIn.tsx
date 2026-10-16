import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Baby,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Lock,
  Search,
  Undo2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useServiceSnapshot } from '../hooks/useServiceSnapshot';
import type { SearchResult, Service, ServiceReport } from '../lib/types';
import { downloadCSV, formatDate, isServiceOpen, toCSV } from '../lib/utils';
import { Badge, Button, Empty, Field, Input, Modal, ModalActions, Spinner, Stat } from '../components/ui';

// Split out: it pulls in the phone-number metadata and flag set, which the
// check-in path itself never needs. Loads the first time a registrar opens
// the register modal.
const RegisterForm = lazy(() => import('../components/RegisterForm'));

export default function CheckIn() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [serviceLoading, setServiceLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [registering, setRegistering] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);

  const { snapshot, loading, error, checkedIn, totals, refresh, markPending, clearPending } =
    useServiceSnapshot(serviceId);

  const searchRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  /* ---- service record ---- */
  useEffect(() => {
    if (!serviceId) return;
    void (async () => {
      const { data, error: err } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .maybeSingle();
      if (err) toast(err.message, 'error');
      setService((data as Service) ?? null);
      setServiceLoading(false);
    })();
  }, [serviceId, toast]);

  const open = service ? isServiceOpen(service.service_date) : false;

  /* ---- debounced server-side search ---- */
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('search_members', {
        p_query: term,
        p_service_id: serviceId,
        p_limit: 40,
      });
      if (id !== requestId.current) return; // a newer keystroke won
      if (err) toast(err.message, 'error');
      setResults((data as SearchResult[]) ?? []);
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, serviceId, toast]);

  /* ---- check in / undo ---- */
  const checkIn = useCallback(
    async (memberId: string, name: string) => {
      if (!serviceId) return;
      setBusyId(memberId);
      markPending(memberId, true);

      const { error: err } = await supabase
        .from('attendance')
        .insert({ service_id: serviceId, member_id: memberId });

      setBusyId(null);

      if (err) {
        // 23505 = already there, which is a success from the desk's point of view.
        if (err.code === '23505') {
          toast(`${name} was already checked in`, 'info');
          refresh();
          return;
        }
        clearPending(memberId);
        toast(err.message, 'error');
        return;
      }

      toast(`${name} checked in`, 'success');
      setQuery('');
      searchRef.current?.focus();
      refresh();
    },
    [serviceId, markPending, clearPending, refresh, toast],
  );

  const undo = useCallback(
    async (memberId: string, name: string) => {
      if (!serviceId) return;
      if (!window.confirm(`Remove ${name}'s check-in for this service?`)) return;
      setBusyId(memberId);
      markPending(memberId, false);

      const { error: err } = await supabase
        .from('attendance')
        .delete()
        .eq('service_id', serviceId)
        .eq('member_id', memberId);

      setBusyId(null);
      if (err) {
        clearPending(memberId);
        return toast(err.message, 'error');
      }
      toast(`${name}'s check-in removed`, 'success');
      refresh();
    },
    [serviceId, markPending, clearPending, refresh, toast],
  );

  /* ---- report ---- */
  const buildReport = useCallback(async (): Promise<ServiceReport | null> => {
    if (!serviceId) return null;
    const { data, error: err } = await supabase.rpc('service_report', {
      p_service_id: serviceId,
    });
    if (err) {
      toast(err.message, 'error');
      return null;
    }
    return data as ServiceReport;
  }, [serviceId, toast]);

  const copyReport = async () => {
    const r = await buildReport();
    if (!r) return;
    const text = [
      `*${r.title}*`,
      `${formatDate(r.date)}${r.time ? ` · ${r.time}` : ''}`,
      '',
      `Adults: ${r.adults}`,
      `Children: ${r.children}`,
      `*Total: ${r.total}*`,
      `First timers: ${r.first_timers}`,
      `Male: ${r.male} · Female: ${r.female}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Report copied', 'success');
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  };

  const exportAttendance = async () => {
    if (!snapshot || !service) return;
    const rows = snapshot.attendees.map((a) => ({
      name: a.name,
      phone: a.phone ?? '',
      category: a.category === 'first_timer' ? 'First timer' : 'Member',
      first_timer_here: snapshot.first_timer_ids.includes(a.id) ? 'Yes' : 'No',
    }));
    downloadCSV(
      `${service.title.replace(/\s+/g, '_')}_${service.service_date}.csv`,
      toCSV(rows, ['name', 'phone', 'category', 'first_timer_here']),
    );
  };

  if (serviceLoading) return <Spinner label="Loading service…" />;
  if (!service) return <Empty title="Service not found" hint="It may have been deleted." />;

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/services')}
          className="mt-0.5 rounded-lg p-2 text-ink-500 hover:bg-ink-100"
          aria-label="Back to services"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-black tracking-tight text-ink-900">
              {service.title}
            </h1>
            {!open && <Badge tone="muted">Closed</Badge>}
          </div>
          <p className="text-sm text-ink-500">
            {formatDate(service.service_date)}
            {service.service_time ? ` · ${service.service_time}` : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
          <WifiOff className="size-4 shrink-0" />
          Showing the last known numbers — reconnecting.
        </div>
      )}

      {/* Stats ------------------------------------------------------------- */}
      {loading && !snapshot ? (
        <Spinner label="Loading attendance…" />
      ) : (
        <>
          {/* Phones: one compact strip. The tiles are a glance, not the job,
              and at four big cards they pushed search below the fold. */}
          <div className="grid grid-cols-4 divide-x divide-ink-100 rounded-2xl border border-ink-200 bg-white sm:hidden">
            {[
              { label: 'Total', value: totals.total, accent: 'text-ink-900' },
              { label: 'Adults', value: totals.adults, accent: 'text-ink-900' },
              { label: 'First', value: totals.firstTimers, accent: 'text-brand-700' },
              {
                label: 'Children',
                value: totals.children,
                accent: 'text-ink-900',
                onClick: open ? () => setChildrenOpen(true) : undefined,
              },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={s.onClick}
                disabled={!s.onClick}
                className="px-1 py-2.5 text-center disabled:cursor-default"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                  {s.label}
                </p>
                <p className={`text-2xl font-black tabular-nums ${s.accent}`}>{s.value}</p>
              </button>
            ))}
          </div>

          <div className="hidden gap-3 sm:grid sm:grid-cols-4">
            <Stat label="Total" value={totals.total} tone="dark" />
            <Stat label="Adults" value={totals.adults} />
            <Stat label="First timers" value={totals.firstTimers} tone="brand" />
            <Stat
              label="Children"
              value={totals.children}
              onClick={open ? () => setChildrenOpen(true) : undefined}
            />
          </div>
        </>
      )}

      {/* Search ------------------------------------------------------------ */}
      {open && (
        <div className="sticky top-14 z-20 -mx-4 bg-ink-50/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="py-4 pl-11 text-lg"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Actions ----------------------------------------------------------- */}
      <div className="flex flex-wrap gap-2">
        {open && (
          <Button icon={<UserPlus className="size-4" />} onClick={() => setRegistering(true)}>
            Register new
          </Button>
        )}
        {open && (
          <Button
            variant="secondary"
            icon={<Baby className="size-4" />}
            onClick={() => setChildrenOpen(true)}
          >
            Children
          </Button>
        )}
        {/* Reporting is an admin job. A registrar's toolbar stays down to the
            one action they need mid-service: register somebody new. */}
        {isAdmin && (
          <>
            <Button
              variant="secondary"
              icon={<Copy className="size-4" />}
              onClick={() => void copyReport()}
            >
              Copy report
            </Button>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              onClick={() => void exportAttendance()}
            >
              Export
            </Button>
          </>
        )}
      </div>

      {/* Closed notice ----------------------------------------------------- */}
      {!open && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-ink-200 bg-white px-4 py-3.5 text-sm text-ink-500">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            This service closed at the end of the day after {formatDate(service.service_date)}.
            The numbers above are final; check-ins can no longer be added or removed.
          </span>
        </div>
      )}

      {/* Results ----------------------------------------------------------- */}
      {open && (
        <div className="space-y-3">
          {query.trim().length >= 2 && (
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {searching && results.length === 0 ? (
                <Spinner />
              ) : results.length === 0 ? (
                <div className="space-y-3 px-4 py-8 text-center">
                  <p className="text-ink-500">Nobody found matching “{query.trim()}”.</p>
                  <Button
                    icon={<UserPlus className="size-4" />}
                    onClick={() => setRegistering(true)}
                  >
                    Register {query.trim()}
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {results.map((m) => {
                    const isIn = checkedIn.has(m.id);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink-900">{m.name}</p>
                          <p className="truncate text-xs text-ink-500">
                            {m.phone || 'No phone'}
                            {m.residency ? ` · ${m.residency}` : ''}
                          </p>
                        </div>
                        {m.category === 'first_timer' && <Badge tone="brand">First timer</Badge>}
                        {isIn ? (
                          isAdmin ? (
                            <button
                              onClick={() => void undo(m.id, m.name)}
                              disabled={busyId === m.id}
                              className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-emerald-600 hover:bg-rose-50 hover:text-rose-600"
                              title="Undo check-in"
                            >
                              <CheckCircle2 className="size-4 group-hover:hidden" />
                              <Undo2 className="hidden size-4 group-hover:block" />
                              <span className="group-hover:hidden">In</span>
                              <span className="hidden group-hover:inline">Undo</span>
                            </button>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-sm font-bold text-emerald-600">
                              <CheckCircle2 className="size-4" /> In
                            </span>
                          )
                        ) : (
                          <Button
                            className="shrink-0 px-3 py-1.5"
                            loading={busyId === m.id}
                            icon={<Check className="size-4" />}
                            onClick={() => void checkIn(m.id, m.name)}
                          >
                            Check in
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {query.trim().length < 2 && snapshot && (
            <RecentlyCheckedIn snapshot={snapshot} />
          )}
        </div>
      )}

      {/* Modals ------------------------------------------------------------ */}
      <Modal
        open={registering}
        onClose={() => setRegistering(false)}
        title="Register & check in"
        wide
      >
        <Suspense fallback={<Spinner label="Loading form…" />}>
          <RegisterForm
            serviceId={serviceId}
            prefillName={query.trim().length >= 2 ? query.trim() : undefined}
            onCancel={() => setRegistering(false)}
            onDone={(result) => {
              setRegistering(false);
              setQuery('');
              markPending(result.member.id, true);
              refresh();
            }}
          />
        </Suspense>
      </Modal>

      <ChildrenModal
        open={childrenOpen}
        onClose={() => setChildrenOpen(false)}
        serviceId={service.id}
        current={totals.children}
        onSaved={() => {
          setChildrenOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RecentlyCheckedIn({ snapshot }: { snapshot: { attendees: { id: string; name: string; phone: string | null }[] } }) {
  const recent = snapshot.attendees.slice(0, 8); // already newest-first
  if (recent.length === 0) {
    return <Empty title="Nobody checked in yet" hint="Search for a name to get started." />;
  }
  return (
    <div className="rounded-2xl border border-ink-200 bg-white">
      <p className="border-b border-ink-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-400">
        Checked in
      </p>
      <ul className="divide-y divide-ink-100">
        {recent.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
              {a.name}
            </span>
            <span className="shrink-0 text-xs text-ink-400">{a.phone}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChildrenModal({
  open,
  onClose,
  serviceId,
  current,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  current: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(String(current));
  }, [open, current]);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return toast('Enter a number of 0 or more', 'error');
    setBusy(true);
    // Goes through set_children_count rather than a direct update: `services`
    // is admin-only, and this is the one field the door staff must be able
    // to change.
    const { error } = await supabase.rpc('set_children_count', {
      p_service_id: serviceId,
      p_count: Math.round(n),
    });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast('Children count saved', 'success');
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Children count">
      <div className="space-y-4">
        <Field label="Children present" hint="Counted as a headcount, not individual records.">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-2xl font-black"
          />
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
