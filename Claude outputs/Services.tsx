import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronRight, Lock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Service } from '../lib/types';
import { formatDate, isServiceOpen, relativeDay, todayISO } from '../lib/utils';
import { Badge, Button, Empty, Field, Input, Modal, ModalActions, Spinner } from '../components/ui';

export default function Services() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('service_date', { ascending: false })
      .limit(200);
    if (error) toast(error.message, 'error');
    setServices((data as Service[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = services.filter((s) => isServiceOpen(s.service_date));
  const past = services.filter((s) => !isServiceOpen(s.service_date));
  const visible = isAdmin && showPast ? past : open;

  const remove = async (service: Service) => {
    if (
      !window.confirm(
        `Delete "${service.title}"? Every check-in recorded against it is removed too. This cannot be undone.`,
      )
    )
      return;
    const { error } = await supabase.from('services').delete().eq('id', service.id);
    if (error) return toast(error.message, 'error');
    toast('Service deleted', 'success');
    void load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900">Services</h1>
          <p className="text-sm text-ink-500">
            {isAdmin && showPast ? 'Closed services — view only' : 'Open for check-in'}
          </p>
        </div>
        {isAdmin && !showPast && (
          <Button icon={<CalendarPlus className="size-4" />} onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">New service</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      {/* Past services are a reporting view, so only admins get the switch.
          A registrar sees the services they can actually work, and nothing
          else to get lost in mid-service. */}
      {isAdmin && (
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {[
            { key: false, label: `Open (${open.length})` },
            { key: true, label: `Past (${past.length})` },
          ].map((tab) => (
            <button
              key={String(tab.key)}
              onClick={() => setShowPast(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                showPast === tab.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner label="Loading services…" />
      ) : visible.length === 0 ? (
        <Empty
          title={showPast ? 'No past services yet' : 'No open services'}
          hint={
            isAdmin
              ? 'Create one to start checking people in.'
              : 'An admin needs to create a service first.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => {
            const openNow = isServiceOpen(service.service_date);
            const rel = relativeDay(service.service_date);
            return (
              <div
                key={service.id}
                className="group rounded-2xl border border-ink-200 bg-white p-4 transition-all hover:border-brand-500/40 hover:shadow-md"
              >
                <button
                  onClick={() => navigate(`/services/${service.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-ink-50 text-ink-500">
                      <CalendarDays className="size-5" />
                    </span>
                    {openNow ? (
                      <Badge tone="green">{rel ?? 'Open'}</Badge>
                    ) : (
                      <Badge tone="muted">Closed</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 font-bold leading-tight text-ink-900">
                    {service.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {formatDate(service.service_date)}
                    {service.service_time ? ` · ${service.service_time}` : ''}
                  </p>
                  {service.location && (
                    <p className="mt-0.5 truncate text-xs text-ink-400">{service.location}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-sm font-semibold text-ink-700">
                    <span className="inline-flex items-center gap-1.5">
                      {openNow ? (
                        'Open check-in'
                      ) : (
                        <>
                          <Lock className="size-3.5" /> View report
                        </>
                      )}
                    </span>
                    <ChevronRight className="size-4 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => void remove(service)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewServiceModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          void load();
          navigate(`/services/${id}`);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function NewServiceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: 'Sunday Service',
    service_date: todayISO(),
    service_time: '09:00',
    location: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from('services')
      .insert(form)
      .select('id')
      .single();
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast('Service created', 'success');
    onCreated((data as { id: string }).id);
  };

  return (
    <Modal open={open} onClose={onClose} title="New service">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" required>
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Sunday Service"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required>
            <Input
              type="date"
              required
              value={form.service_date}
              onChange={(e) => setForm({ ...form, service_date: e.target.value })}
            />
          </Field>
          <Field label="Time">
            <Input
              type="time"
              value={form.service_time}
              onChange={(e) => setForm({ ...form, service_time: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Location">
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Main auditorium"
          />
        </Field>
        <p className="rounded-xl bg-ink-50 px-3 py-2.5 text-xs leading-relaxed text-ink-500">
          Check-in stays open until the end of the day after the service date, then the
          service locks itself and becomes a read-only report.
        </p>
        <ModalActions>
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={busy}>
            Create
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
