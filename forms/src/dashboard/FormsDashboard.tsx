import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, PlusCircle, Search, BarChart3, Users, Clock,
  MoreVertical, Edit2, Trash2, Share2, Eye, ChevronRight,
  Globe, Lock, LogOut, CheckCircle2, Loader2, Filter,
  Link2, Check, Copy, X as XIcon,
} from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';
import { getForms, createForm, deleteForm, publishForm } from '../services/formsStore';
import type { Form } from '../types/forms.types';

// ─── Share Modal ────────────────────────────────────────────────────────────

const ShareModal: React.FC<{ formId: string; formTitle: string; onClose: () => void }> = ({ formId, formTitle, onClose }) => {
  const publicUrl = `${window.location.origin}/f/${formId}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 truncate max-w-[220px]">{formTitle}</h2>
              <p className="text-gray-500 text-xs">Public link — anyone can fill this form</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-5">
          <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="flex-1 text-xs font-mono text-gray-700 truncate select-all">{publicUrl}</p>
          <button onClick={copy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'
            }`}>
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
          <a href={publicUrl} target="_blank" rel="noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold text-center transition-all">
            Open Form ↗
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

// ─── Form Card ────────────────────────────────────────────────────────────────

interface FormCardProps {
  form: Form;
  onEdit:    () => void;
  onView:    () => void;
  onDelete:  () => void;
  onToggle:  () => void;
  onShare:   () => void;
}

const FormCard: React.FC<FormCardProps> = ({ form, onEdit, onView, onDelete, onToggle, onShare }) => {
  const [menu, setMenu] = useState(false);

  return (
    <div className="group relative bg-white hover:bg-orange-50/50 border border-gray-200 hover:border-orange-300 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
      onClick={onEdit}>
      {/* Status dot */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${form.status === 'published' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${form.status === 'published' ? 'text-green-600' : 'text-gray-400'}`}>
            {form.status}
          </span>
        </div>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenu(m => !m)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
              onMouseLeave={() => setMenu(false)}>
              <button onClick={onEdit} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={onView} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <BarChart3 className="w-3.5 h-3.5" /> Responses
              </button>
              <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                {form.status === 'published' ? <><Lock className="w-3.5 h-3.5" /> Unpublish</> : <><Globe className="w-3.5 h-3.5" /> Publish</>}
              </button>
              {form.status === 'published' && (
                <button onClick={onShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-500 hover:bg-orange-50 transition-all">
                  <Link2 className="w-3.5 h-3.5" /> Copy Link
                </button>
              )}
              <div className="border-t border-gray-100" />
              <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form icon */}
      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
        <FileText className="w-5 h-5 text-orange-500" />
      </div>

      {/* Info */}
      <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1">{form.title}</h3>
      <p className="text-gray-400 text-xs line-clamp-2 mb-4 min-h-[2.5rem]">
        {form.description || <span className="italic">No description</span>}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {form.response_count}</span>
        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {form.fields.length} fields</span>
        <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> {relativeTime(form.updated_at)}</span>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type FilterTab = 'all' | 'published' | 'draft';

const FormsDashboard: React.FC = () => {
  const { formsUser, signOut } = useFormsAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterTab>('all');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareForm, setShareForm] = useState<Form | null>(null);

  // FormsUser uses 'id' not 'uid' — this was the root cause of uid always being ''
  // which caused getForm() owner check to always fail and re-create the form on every login
  const uid = formsUser?.id ?? '';

  const reload = useCallback(async () => {
    setForms(await getForms(uid));
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleCreate = async () => {
    setCreating(true);
    const form = await createForm(uid);
    navigate(`/builder/${form.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this form and all its responses? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteForm(uid, id);
    await reload();
    setDeletingId(null);
    showToast('Form deleted.');
  };

  const handleToggle = async (form: Form) => {
    const next = form.status === 'published' ? 'draft' : 'published';
    await publishForm(uid, form.id, next);
    await reload();
    if (next === 'published') {
      setShareForm({ ...form, status: 'published' });
      showToast('🌐 Form published!');
    } else {
      showToast('🔒 Form unpublished.');
    }
  };

  const handleSignOut = async () => {
    await signOut(); // onAuthStateChanged fires → formsUser=null → Guard redirects to /auth
    // Do NOT manually navigate here — causes race condition
  };

  // Filtered + searched
  const visible = forms
    .filter(f => filter === 'all' || f.status === filter)
    .filter(f => f.title.toLowerCase().includes(search.toLowerCase()) ||
                 f.description?.toLowerCase().includes(search.toLowerCase()));

  const totalResponses = forms.reduce((s, f) => s + f.response_count, 0);
  const publishedCount = forms.filter(f => f.status === 'published').length;

  const initials = (formsUser?.full_name ?? 'MF')
    .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('');

  return (
    <div className="min-h-[100dvh] bg-[#f8f8f8] text-gray-900 font-sans flex flex-col">

      {/* Share modal */}
      {shareForm && (
        <ShareModal
          formId={shareForm.id}
          formTitle={shareForm.title}
          onClose={() => setShareForm(null)}
        />
      )}
      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-[#1e1e1e] border border-white/15 rounded-2xl shadow-2xl text-sm font-medium text-white animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-green-400" />{toast}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 md:px-10 bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-gray-900 tracking-wide">Manifest</span>
            <span className="text-orange-400 font-bold"> Forms</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden md:block flex-1 max-w-sm mx-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-orange-900/30 disabled:opacity-60">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            <span className="hidden sm:inline">New Form</span>
          </button>

          <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
            {formsUser?.avatar_url
              ? <img src={formsUser.avatar_url} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full ring-2 ring-orange-500/40" />
              : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
            }
            <button onClick={handleSignOut}
              className="text-gray-400 hover:text-orange-500 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-10 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Forms',    value: forms.length,    icon: <FileText className="w-5 h-5" />,     from: 'from-orange-50', border: 'border-orange-200', text: 'text-orange-500' },
            { label: 'Published',      value: publishedCount,  icon: <Globe className="w-5 h-5" />,        from: 'from-green-50',  border: 'border-green-200',  text: 'text-green-600' },
            { label: 'Total Responses',value: totalResponses,  icon: <BarChart3 className="w-5 h-5" />,    from: 'from-blue-50',   border: 'border-blue-200',   text: 'text-blue-600' },
            { label: 'Form Fields',    value: forms.reduce((s,f)=>s+f.fields.length,0), icon: <Users className="w-5 h-5" />, from: 'from-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.from} to-white border ${s.border} rounded-2xl p-5 shadow-sm`}>
              <div className={`${s.text} mb-3`}>{s.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-gray-500 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mobile search */}
        <div className="relative md:hidden mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400" />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['all', 'published', 'draft'] as FilterTab[]).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                filter === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-300 hover:text-orange-500'
              }`}>
              {t}
            </button>
          ))}
          <span className="ml-auto text-gray-400 text-xs">{visible.length} form{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map(form => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={()   => navigate(`/builder/${form.id}`)}
                onView={()   => navigate(`/responses/${form.id}`)}
                onDelete={()  => handleDelete(form.id)}
                onToggle={()  => handleToggle(form)}
                onShare={()   => setShareForm(form)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-orange-500/50" />
            </div>
            <h3 className="text-gray-500 font-semibold text-xl mb-2">
              {search ? 'No forms match your search' : 'No forms yet'}
            </h3>
            <p className="text-gray-400 text-sm max-w-xs mb-7">
              {search ? 'Try a different keyword.' : 'Create your first form to start collecting data from your ministry.'}
            </p>
            {!search && (
              <button onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all hover:scale-[1.02]">
                <PlusCircle className="w-4 h-4" /> Create your first form
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FormsDashboard;
