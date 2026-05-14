import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MapPin, CheckCircle2, AlertCircle, Upload, X, Camera } from 'lucide-react';
import { getPublicForm, addResponse } from '../services/formsStore';
import type { Form, FormField, AnswerValue } from '../types/forms.types';
import PhoneField from '../components/fields/PhoneField';

// ─── GPS Button ───────────────────────────────────────────────────────────────

const GpsField: React.FC<{
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
}> = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      err => {
        setError(err.code === 1 ? 'Location permission denied.' : 'Could not get location.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <MapPin className="w-4 h-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-green-700">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
              target="_blank" rel="noreferrer"
              className="text-[10px] text-blue-500 hover:underline"
            >
              View on Google Maps ↗
            </a>
          </div>
          <button onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-xl text-gray-500 hover:text-orange-600 transition-all text-sm font-medium"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Capturing location…</>
          ) : (
            <><MapPin className="w-4 h-4" /> Capture Current Location</>
          )}
        </button>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
};

// ─── File / Image Upload Field ────────────────────────────────────────────────

const FileField: React.FC<{
  field: FormField;
  value: string | null;        // base64 data-url
  onChange: (v: string | null) => void;
}> = ({ field, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = field.type === 'image';

  const accept = isImage
    ? 'image/*'
    : (field.allowedFileTypes?.join(',') || '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMb = field.maxFileSizeMb ?? (isImage ? 5 : 10);
    if (file.size > maxMb * 1024 * 1024) {
      alert(`File too large. Maximum is ${maxMb} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden">
          {isImage ? (
            <img src={value} className="w-full max-h-56 object-contain bg-gray-50" alt="preview" />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-sm text-gray-700 font-medium truncate flex-1">File selected ✓</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-500 shadow-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-xl text-gray-400 hover:text-orange-500 transition-all"
        >
          {isImage
            ? <><Camera className="w-7 h-7" /><span className="text-sm font-medium">Tap to choose photo</span><span className="text-xs text-gray-400">From camera or gallery</span></>
            : <><Upload className="w-7 h-7" /><span className="text-sm font-medium">Tap to choose file</span><span className="text-xs text-gray-400">{accept.replace(/\./g, '').toUpperCase()}</span></>
          }
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={isImage ? 'environment' : undefined}
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
};

// ─── Single Field Renderer ────────────────────────────────────────────────────

const FieldInput: React.FC<{
  field: FormField;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}> = ({ field, value, onChange }) => {
  const base = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all";

  switch (field.type) {
    case 'short_text':
      return <input type="text" className={base} placeholder={field.placeholder || 'Your answer'} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;

    case 'long_text':
      return <textarea className={base} rows={4} placeholder={field.placeholder || 'Your answer'} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;

    case 'number':
      return (
        <input
          type="number"
          className={base}
          placeholder={field.placeholder || '0'}
          value={(value as number) ?? ''}
          min={field.min}
          max={field.max}
          step={field.allowDecimals ? 'any' : 1}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );

    case 'contact': {
      // Email-only: simple email input
      if (field.contactType === 'email') {
        return (
          <input
            type="email"
            className={base}
            placeholder="email@example.com"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
          />
        );
      }
      // Phone or both: international phone picker
      // Store format: "+27|821234567" — on 'both' we show phone picker (email is a separate question)
      return (
        <PhoneField
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
        />
      );
    }

    case 'yes_no':
      return (
        <div className="flex gap-3">
          {[true, false].map(v => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                value === v
                  ? v ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              {v ? '✓  Yes' : '✗  No'}
            </button>
          ))}
        </div>
      );

    case 'dropdown':
      return (
        <select
          className={base + ' appearance-none cursor-pointer'}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select an option…</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options ?? []).map(o => (
            <label key={o} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${value === o ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${value === o ? 'border-orange-500' : 'border-gray-300'}`}>
                {value === o && <div className="w-2 h-2 rounded-full bg-orange-500" />}
              </div>
              <span className="text-sm text-gray-700">{o}</span>
              <input type="radio" className="hidden" checked={value === o} onChange={() => onChange(o)} />
            </label>
          ))}
        </div>
      );

    case 'multi_select': {
      const sel: string[] = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (o: string) => sel.includes(o) ? onChange(sel.filter(x => x !== o)) : onChange([...sel, o]);
      return (
        <div className="space-y-2">
          {(field.options ?? []).map(o => (
            <label key={o} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel.includes(o) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel.includes(o) ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                {sel.includes(o) && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
              </div>
              <span className="text-sm text-gray-700">{o}</span>
              <input type="checkbox" className="hidden" checked={sel.includes(o)} onChange={() => toggle(o)} />
            </label>
          ))}
        </div>
      );
    }

    case 'datetime':
      return (
        <input
          type={field.dateOnly ? 'date' : field.timeOnly ? 'time' : 'datetime-local'}
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'gps':
      return <GpsField value={value as { lat: number; lng: number } | null} onChange={onChange} />;

    case 'file':
    case 'image':
      return <FileField field={field} value={value as string | null} onChange={onChange} />;

    case 'signature':
      return (
        <div className="h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
          ✍️ Signature (coming soon)
        </div>
      );

    default:
      return null;
  }
};

// ─── Public Form Page ─────────────────────────────────────────────────────────

type PageState = 'loading' | 'not_found' | 'unpublished' | 'form' | 'submitted';

const PublicFormPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();

  const [state, setState] = useState<PageState>('loading');
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!formId) { setState('not_found'); return; }
    let cancelled = false;
    (async () => {
      const f = await getPublicForm(formId);
      if (cancelled) return;
      if (!f) { setState('not_found'); return; }
      if (f.status !== 'published') { setState('unpublished'); return; }
      setForm(f);
      setState('form');
    })();
    return () => { cancelled = true; };
  }, [formId]);

  const setAnswer = (fieldId: string, val: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [fieldId]: val }));
    setErrors(prev => { const next = { ...prev }; delete next[fieldId]; return next; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    const errs: Record<string, string> = {};
    for (const f of form.fields) {
      if (!f.required) continue;
      const v = answers[f.id];
      const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) errs[f.id] = 'This field is required.';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    await addResponse(form.id, form.owner_uid, answers);
    setSubmitting(false);
    setState('submitted');
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (state === 'loading') return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  if (state === 'not_found') return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Form not found</h1>
      <p className="text-gray-500 text-sm">This link may be invalid or the form has been deleted.</p>
    </div>
  );

  if (state === 'unpublished') return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Form not available</h1>
      <p className="text-gray-500 text-sm">This form is currently unpublished or closed.</p>
    </div>
  );

  if (state === 'submitted') return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Response submitted!</h1>
      <p className="text-gray-500 text-sm max-w-xs">Thank you for completing this form. Your response has been recorded.</p>
    </div>
  );

  if (!form) return null;

  // ── Form Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-gray-50 py-8 px-4">
      {/* Branding strip */}
      <div className="text-center mb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Powered by </span>
        <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">Manifest Forms</span>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-0">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
          {/* Cover photo */}
          {form.cover_image && (
            <img
              src={form.cover_image}
              alt="Form cover"
              className="w-full h-44 object-cover"
            />
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{form.title}</h1>
            {form.description && <p className="text-gray-500 text-sm leading-relaxed">{form.description}</p>}
            <p className="text-gray-400 text-xs mt-3">
              <span className="text-red-500">*</span> Required fields
            </p>
          </div>
        </div>

        {/* Field cards */}
        {form.fields.map((field, idx) => (
          <div key={field.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${errors[field.id] ? 'border-red-300' : 'border-gray-100'} mb-3`}>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-800 mb-0.5">
                {idx + 1}. {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-gray-400">{field.description}</p>
              )}
            </div>
            <FieldInput
              field={field}
              value={answers[field.id] ?? null}
              onChange={val => setAnswer(field.id, val)}
            />
            {errors[field.id] && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors[field.id]}
              </p>
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold rounded-2xl transition-all hover:scale-[1.01] shadow-lg shadow-orange-200 text-base mt-4"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Response'}
        </button>

        <p className="text-center text-gray-400 text-[10px] mt-4 pb-8">
          🔒 Your response is secure and private
        </p>
      </form>
    </div>
  );
};

export default PublicFormPage;
