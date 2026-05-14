import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Globe, Lock, Eye, Plus, Trash2, Copy,
  ChevronUp, ChevronDown, GripVertical, Settings2, Loader2, CheckCircle2,
  Link2, Check, X as XIcon, Download,
} from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';
import { getForm, saveForm, createForm, publishSnapshot, unpublishSnapshot } from '../services/formsStore';
import type { Form, FormField, FieldType } from '../types/forms.types';
import { FIELD_TYPE_META } from '../types/forms.types';
import FieldPalette from '../components/builder/FieldPalette';
import FieldPropertiesPanel from '../components/builder/FieldPropertiesPanel';
import { parseGoogleForm } from '../services/googleFormsParser';
import type { GFField } from '../services/googleFormsParser';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ─── Import Google Form Modal ─────────────────────────────────────────────────

const FIELD_TYPE_ICON: Record<string, string> = {
  short_text: '✏️', long_text: '📝', number: '🔢', yes_no: '✅',
  dropdown: '▾', radio: '🔘', multi_select: '☑️', datetime: '📅',
  gps: '📍', file: '📎', image: '🖼️', contact: '📞', signature: '✍️',
};

const ImportGoogleFormModal: React.FC<{
  onImport: (fields: GFField[], title: string) => void;
  onClose: () => void;
}> = ({ onImport, onClose }) => {
  const [url, setUrl] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState('');
  const [parsed, setParsed] = React.useState<{ title: string; fields: GFField[] } | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setStatus('loading');
    setError('');
    setParsed(null);
    try {
      const result = await parseGoogleForm(url.trim());
      setParsed({ title: result.title, fields: result.fields });
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Import from Google Forms</h2>
              <p className="text-gray-400 text-xs">Paste a public Google Forms link to import its fields</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* URL Input */}
        <div className="flex gap-2 mb-4">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://docs.google.com/forms/d/..."
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-orange-400 transition-all"
          />
          <button
            onClick={handleFetch}
            disabled={status === 'loading' || !url.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {status === 'loading' ? 'Analyzing...' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 space-y-1">
            <p className="font-semibold">⚠️ Could not import form</p>
            <p className="text-red-500">{error}</p>
            <p className="text-red-400 text-xs mt-1">Tip: Make sure the form sharing is set to <strong>"Anyone with the link"</strong> in Google Forms → Share.</p>
          </div>
        )}

        {/* Loading hint */}
        {status === 'loading' && (
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600 text-sm mb-4 space-y-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="font-medium">Fetching form structure...</span>
            </div>
            <p className="text-blue-400 text-xs pl-7">Trying available proxies — this can take up to 30 seconds on a slow connection.</p>
          </div>
        )}

        {/* Results */}
        {parsed && (
          <>
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Detected {parsed.fields.length} field{parsed.fields.length !== 1 ? 's' : ''} in &ldquo;{parsed.title}&rdquo;
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {parsed.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-base w-6 text-center shrink-0">{FIELD_TYPE_ICON[f.type] ?? '❓'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.label}</p>
                      <p className="text-[10px] text-gray-400">{f.gfTypeName} → {f.type.replace('_', ' ')}{f.required ? ' · required' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => { onImport(parsed.fields, parsed.title); onClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-all"
              >
                Import {parsed.fields.length} Fields
              </button>
            </div>
          </>
        )}

        {status === 'idle' && (
          <p className="text-center text-gray-400 text-xs">
            💡 Make sure the form is set to &ldquo;Anyone with the link can view&rdquo; in Google Forms sharing settings.
          </p>
        )}
      </div>
    </div>
  );
};


// ─── Publish Modal ────────────────────────────────────────────────────────────

const PublishModal: React.FC<{ formId: string; onClose: () => void }> = ({ formId, onClose }) => {
  const publicUrl = `${window.location.origin}/forms/f/${formId}`;
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Form Published! 🎉</h2>
              <p className="text-gray-500 text-xs">Anyone with this link can fill the form</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* URL Box */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4">
          <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="flex-1 text-xs font-mono text-gray-700 truncate select-all">{publicUrl}</p>
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'
            }`}
          >
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>

        {/* QR hint */}
        <p className="text-center text-gray-400 text-xs mb-5">
          Share this link via WhatsApp, email, or print it as a QR code.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
            Done
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold text-center transition-all"
          >
            Open Form ↗
          </a>
        </div>
      </div>
    </div>
  );
};

const defaultField = (type: FieldType): FormField => ({
  id: uid(),
  type,
  label: FIELD_TYPE_META.find(m => m.type === type)?.label ?? 'Question',
  required: false,
  options: ['dropdown', 'radio', 'multi_select'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
});

const FormBuilderPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const { formsUser } = useFormsAuth();
  const navigate = useNavigate();
  const uid_user = formsUser?.uid ?? '';

  const [form, setForm] = useState<Form | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Cover photo
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const handleCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ cover_image: reader.result as string });
    reader.readAsDataURL(file);
  };

  // Google Forms import handler
  const handleImport = (fields: import('../services/googleFormsParser').GFField[], title: string) => {
    const newFields = fields.map(f => ({
      id: uid(),
      type: f.type,
      label: f.label,
      required: f.required,
      description: f.description,
      options: f.options,
      placeholder: undefined,
    }));
    update({
      fields: [...(form?.fields ?? []), ...newFields],
      // Only update title if the form is still untitled
      ...(form?.title === 'Untitled Form' ? { title } : {}),
    });
  };

  // Load or create
  useEffect(() => {
    if (!formId || !uid_user) return;
    let cancelled = false;
    (async () => {
      const existing = await getForm(uid_user, formId);
      if (cancelled) return;
      if (existing) { setForm(existing); return; }
      const fresh = await createForm(uid_user);
      if (!cancelled) setForm({ ...fresh, id: formId });
    })();
    return () => { cancelled = true; };
  }, [formId, uid_user]);

  const update = useCallback((patch: Partial<Form>) => {
    setForm(prev => prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev);
    setSaved(false);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    await saveForm(form);
    setSaving(false);
    setSaved(true);
    setIsDirty(false);
    setTimeout(() => setSaved(false), 2000);
  }, [form]);

  // Auto-save the WORKING DRAFT on change (does NOT update the public live snapshot)
  useEffect(() => {
    if (!form) return;
    const t = setTimeout(async () => {
      await saveForm(form);   // draft only — public form is NOT affected
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1200);
    return () => clearTimeout(t);
  }, [form]);

  const addField = (type: FieldType) => {
    const f = defaultField(type);
    update({ fields: [...(form?.fields ?? []), f] });
    setSelectedId(f.id);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    update({ fields: form!.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const deleteField = (id: string) => {
    update({ fields: form!.fields.filter(f => f.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateField = (id: string) => {
    const src = form!.fields.find(f => f.id === id);
    if (!src) return;
    const clone = { ...src, id: uid(), label: src.label + ' (copy)' };
    const idx = form!.fields.findIndex(f => f.id === id);
    const next = [...form!.fields];
    next.splice(idx + 1, 0, clone);
    update({ fields: next });
    setSelectedId(clone.id);
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = form!.fields.findIndex(f => f.id === id);
    if (idx + dir < 0 || idx + dir >= form!.fields.length) return;
    const next = [...form!.fields];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    update({ fields: next });
  };

  /**
   * Publish: marks form published in working draft, writes the live snapshot,
   * and opens the share modal.
   * Unpublish: marks draft as draft and removes the live snapshot.
   */
  const togglePublish = async () => {
    if (!form) return;
    if (form.status === 'published') {
      // Unpublish — remove the public snapshot
      const next = { ...form, status: 'draft' as const };
      update({ status: 'draft' });
      await saveForm(next);
      await unpublishSnapshot(form.id);
      setIsDirty(false);
    } else {
      // Publish for the first time — write the live snapshot
      const next = { ...form, status: 'published' as const };
      update({ status: 'published' });
      const saved = await saveForm(next);
      await publishSnapshot(saved);
      setIsDirty(false);
      setShowPublishModal(true);
    }
  };

  /** Called by the Republish button — saves draft then pushes to live snapshot */
  const handleRepublish = async () => {
    if (!form) return;
    setSaving(true);
    const latestSaved = await saveForm(form);  // persist working draft
    await publishSnapshot(latestSaved);         // overwrite live snapshot with latest
    setSaving(false);
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setShowPublishModal(true);
  };

  const selectedField = form?.fields.find(f => f.id === selectedId) ?? null;

  if (!form) return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  const isPublished = form.status === 'published';
  // isDirty && isPublished → show Republish instead of Unpublish
  const needsRepublish = isPublished && isDirty;

  return (
    <div className="h-[100dvh] bg-gray-50 text-gray-900 font-sans flex flex-col overflow-hidden">

      {/* Publish modal */}
      {showPublishModal && form && (
        <PublishModal formId={form.id} onClose={() => setShowPublishModal(false)} />
      )}
      {/* Import modal */}
      {showImportModal && (
        <ImportGoogleFormModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-gray-200 flex items-center gap-4 px-4 bg-white shadow-sm sticky top-0 z-40">
        <button onClick={() => navigate('/forms/dashboard')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <input
          value={form.title}
          onChange={e => update({ title: e.target.value })}
          className="flex-1 bg-transparent text-gray-900 font-semibold text-base focus:outline-none placeholder-gray-300 max-w-xs"
          placeholder="Form title..."
        />

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <div className={`flex items-center gap-1.5 text-xs transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 font-medium">Saved</span>
          </div>

          {/* Import from Google Forms */}
          <button
            onClick={() => setShowImportModal(true)}
            title="Import fields from a Google Form"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-sm text-blue-600 hover:text-blue-700 font-medium transition-all border border-blue-100"
          >
            <span className="text-base leading-none">📋</span>
            Import
          </button>

          <button onClick={() => navigate(`/forms/responses/${form.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-500 hover:text-gray-900 transition-all">
            <Eye className="w-4 h-4" /> Responses
          </button>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-500 hover:text-gray-900 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          {/* Publish / Republish / Unpublish button */}
          {needsRepublish ? (
            // Published but has unsaved changes → offer to republish
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRepublish}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white shadow-lg shadow-orange-200 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Republish
              </button>
              <button
                onClick={togglePublish}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
                title="Unpublish form"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={togglePublish}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isPublished
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  : 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-200'
              }`}
            >
              {isPublished
                ? <><Lock className="w-4 h-4" /> Unpublish</>
                : <><Globe className="w-4 h-4" /> Publish</>}
            </button>
          )}
        </div>
      </header>

      {/* ── 3-Column Layout ──────────────────────────────────────────── */}
      {/* Each column gets overflow-y-auto so they scroll independently */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Field Palette ──────────────────────────────────── */}
        <div className="w-56 shrink-0 border-r border-gray-200 overflow-y-auto bg-white hidden md:flex md:flex-col">
          <FieldPalette onAdd={addField} />
        </div>

        {/* ── Center: Canvas ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-8 bg-gray-50">
          <div className="max-w-2xl mx-auto space-y-3">

            {/* Form header card — cover photo + title/description */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-6">
              {/* Cover photo zone */}
              <div className="relative">
                {form.cover_image ? (
                  <div className="relative group">
                    <img
                      src={form.cover_image}
                      className="w-full h-40 object-cover"
                      alt="Cover"
                    />
                    {/* Overlay controls */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        ✏️ Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ cover_image: undefined })}
                        className="px-3 py-1.5 bg-white/90 hover:bg-white text-red-600 text-xs font-bold rounded-lg transition-all"
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-orange-50 border-b border-dashed border-gray-200 hover:border-orange-300 transition-all text-gray-400 hover:text-orange-400 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🖼️</span>
                    <span className="text-xs font-semibold">Add Cover Photo</span>
                    <span className="text-[10px] text-gray-300">Click to upload a banner image</span>
                  </button>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPick}
                />
              </div>

              {/* Title + Description */}
              <div className="p-6">
                <input
                  value={form.title}
                  onChange={e => update({ title: e.target.value })}
                  className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none placeholder-gray-300 mb-2"
                  placeholder="Form title"
                />
                <textarea
                  value={form.description}
                  onChange={e => update({ description: e.target.value })}
                  rows={2}
                  className="w-full bg-transparent text-sm text-gray-400 focus:outline-none placeholder-gray-300 resize-none"
                  placeholder="Form description (optional)"
                />
              </div>
            </div>

            {/* Fields */}
            {form.fields.map((field, idx) => {
              const meta = FIELD_TYPE_META.find(m => m.type === field.type)!;
              const isSelected = selectedId === field.id;
              return (
                <div key={field.id}
                  onClick={() => setSelectedId(field.id)}
                  className={`relative group rounded-2xl border transition-all duration-150 ${
                    isSelected
                      ? 'border-orange-400 bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
                  }`}>

                  {/* Drag handle */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="p-5 pl-8">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{meta.icon}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500/80">{meta.label}</span>
                          {field.required && <span className="text-red-500 text-xs">*</span>}
                        </div>
                        <input value={field.label}
                          onChange={e => { e.stopPropagation(); updateField(field.id, { label: e.target.value }); }}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-transparent font-semibold text-gray-900 text-base focus:outline-none placeholder-gray-300 border-b border-transparent focus:border-gray-300 pb-0.5 transition-all"
                          placeholder="Question label" />
                        {field.description !== undefined && (
                          <input value={field.description}
                            onChange={e => { e.stopPropagation(); updateField(field.id, { description: e.target.value }); }}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-transparent text-gray-400 text-xs focus:outline-none placeholder-gray-300 mt-1"
                            placeholder="Helper text (optional)" />
                        )}
                      </div>

                      {/* Field actions */}
                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); moveField(field.id, -1); }} disabled={idx === 0}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-all">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); moveField(field.id, 1); }} disabled={idx === form.fields.length - 1}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-all">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); duplicateField(field.id); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteField(field.id); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Field preview */}
                    <FieldPreview field={field} />

                    {/* Options for selection fields */}
                    {['dropdown', 'radio', 'multi_select'].includes(field.type) && isSelected && (
                      <div className="mt-3 space-y-1.5">
                        {(field.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                            <input value={opt}
                              onChange={e => {
                                const next = [...(field.options ?? [])];
                                next[oi] = e.target.value;
                                updateField(field.id, { options: next });
                              }}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none border-b border-gray-200 focus:border-orange-400 pb-0.5 transition-all"
                              placeholder={`Option ${oi + 1}`} />
                            <button onClick={e => { e.stopPropagation(); const next = (field.options ?? []).filter((_, i) => i !== oi); updateField(field.id, { options: next }); }}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button onClick={e => { e.stopPropagation(); updateField(field.id, { options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] }); }}
                          className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 mt-1 transition-colors">
                          <Plus className="w-3 h-3" /> Add option
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add field — mobile button */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-gray-200" />
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl text-sm text-gray-400 hover:text-orange-500 transition-all">
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {form.fields.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                ← Pick a field type from the left panel to get started
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Properties Panel ──────────────────────────────── */}
        <div className="w-64 shrink-0 border-l border-gray-200 overflow-y-auto bg-white hidden lg:flex lg:flex-col">
          {selectedField
            ? <FieldPropertiesPanel field={selectedField} onChange={patch => updateField(selectedField.id, patch)} />
            : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Settings2 className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Select a field to edit its properties</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
};

// ─── Field Preview ────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-sm placeholder-gray-300 pointer-events-none";

const FieldPreview: React.FC<{ field: FormField }> = ({ field }) => {
  switch (field.type) {
    case 'short_text': return <input disabled className={inputCls} placeholder={field.placeholder || 'Short answer'} />;
    case 'long_text':  return <textarea disabled className={inputCls} rows={3} placeholder={field.placeholder || 'Long answer'} />;
    case 'number':     return <input type="number" disabled className={inputCls} placeholder={field.placeholder || '0'} />;
    case 'yes_no':     return (
      <div className="flex gap-3">
        {['Yes', 'No'].map(v => (
          <div key={v} className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-sm">
            <div className="w-4 h-4 rounded-full border border-gray-300" /> {v}
          </div>
        ))}
      </div>
    );
    case 'dropdown': return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-sm">
        <span>Select an option</span><span className="text-gray-300">▾</span>
      </div>
    );
    case 'radio': return (
      <div className="space-y-2">
        {(field.options ?? ['Option 1', 'Option 2']).map(o => (
          <div key={o} className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 rounded-full border border-gray-300" />{o}
          </div>
        ))}
      </div>
    );
    case 'multi_select': return (
      <div className="space-y-2">
        {(field.options ?? ['Option 1', 'Option 2']).map(o => (
          <div key={o} className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 rounded border border-gray-300" />{o}
          </div>
        ))}
      </div>
    );
    case 'datetime': return <input type={field.dateOnly ? 'date' : field.timeOnly ? 'time' : 'datetime-local'} disabled className={inputCls} />;
    case 'gps':      return <div className={`${inputCls} flex items-center gap-2`}><span>📍</span><span>GPS coordinates will be captured</span></div>;
    case 'file':     return <div className={`${inputCls} flex items-center gap-2`}><span>📎</span><span>Upload file</span></div>;
    case 'image':    return <div className={`${inputCls} flex items-center gap-2`}><span>🖼️</span><span>Upload image</span></div>;
    case 'contact':  return <input disabled className={inputCls} placeholder={field.contactType === 'email' ? 'email@example.com' : field.contactType === 'phone' ? '+1 234 567 8900' : 'Phone or email'} />;
    case 'signature':return <div className="h-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">✍️ Signature area</div>;
    default:         return null;
  }
};

export default FormBuilderPage;
