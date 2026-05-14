import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileSpreadsheet, FileText as FilePDF,
  Trash2, BarChart3, Clock, Search, RefreshCw, Loader2,
  MapPin, FileIcon, ImageIcon, Download,
} from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';
import { getForm, getResponses, deleteResponse } from '../services/formsStore';
import type { Form, FormResponse, FormField, AnswerValue } from '../types/forms.types';

// ─── Answer Renderer ──────────────────────────────────────────────────────────

const renderAnswer = (field: FormField, value: AnswerValue): React.ReactNode => {
  // Empty
  if (value === null || value === undefined || value === '')
    return <span className="text-gray-300 text-xs">—</span>;

  // Yes / No
  if (field.type === 'yes_no') return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
      value ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {value ? '✓ Yes' : '✗ No'}
    </span>
  );

  // Multi-select chips — max 3 then "+n more"
  if (field.type === 'multi_select' && Array.isArray(value)) {
    const items = value as string[];
    const visible = items.slice(0, 2);
    const extra = items.length - visible.length;
    return (
      <div className="flex flex-wrap gap-1 max-w-[180px]">
        {visible.map(v => (
          <span key={v} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[11px] rounded-full border border-orange-200 truncate max-w-[100px]" title={v}>
            {v}
          </span>
        ))}
        {extra > 0 && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] rounded-full border border-gray-200">
            +{extra}
          </span>
        )}
      </div>
    );
  }

  // GPS — coordinates cell
  if (field.type === 'gps' && typeof value === 'object' && !Array.isArray(value)) {
    const g = value as { lat: number; lng: number };
    return (
      <span className="font-mono text-[11px] text-gray-600 whitespace-nowrap">
        {g.lat.toFixed(6)}, {g.lng.toFixed(6)}
      </span>
    );
  }

  // DateTime
  if (field.type === 'datetime')
    return <span className="text-xs text-gray-600 whitespace-nowrap">{new Date(value as string).toLocaleString()}</span>;

  // Image — show thumbnail
  if (field.type === 'image' && typeof value === 'string' && value.startsWith('data:image')) {
    return (
      <a href={value} download="image" target="_blank" rel="noreferrer">
        <img src={value} className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" alt="upload" />
      </a>
    );
  }

  // File — show icon + download link
  if (field.type === 'file' && typeof value === 'string' && value.startsWith('data:')) {
    const ext = value.split(';')[0]?.split('/')[1]?.toUpperCase() ?? 'FILE';
    return (
      <a href={value} download="file" target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-all font-medium"
      >
        <Download className="w-3 h-3" />
        {ext}
      </a>
    );
  }

  // Default — truncate at 60 chars with title tooltip
  // Also parse phone storage format "+27|821234567" → "+27 821234567"
  const str = (field.type === 'contact' && typeof value === 'string' && value.includes('|'))
    ? value.replace('|', ' ')
    : String(value);
  return (
    <span
      className="text-xs text-gray-700 block max-w-[160px] truncate"
      title={str.length > 40 ? str : undefined}
    >
      {str}
    </span>
  );
};

/** Renders the extra Map Link cell for a GPS field value */
const renderGpsMapLink = (value: AnswerValue): React.ReactNode => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return <span className="text-gray-300 text-xs">—</span>;
  const g = value as { lat: number; lng: number };
  const url = `https://www.google.com/maps?q=${g.lat},${g.lng}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-medium transition-all whitespace-nowrap"
    >
      <MapPin className="w-3 h-3 shrink-0" />
      Open in Maps ↗
    </a>
  );
};

// ─── Responses Page ───────────────────────────────────────────────────────────

const FormResponsesPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const { formsUser } = useFormsAuth();
  const navigate = useNavigate();

  const [form, setForm]           = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [search, setSearch]       = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const uid = formsUser?.uid ?? '';

  const reload = async () => {
    if (!formId || !uid) return;
    const f = await getForm(uid, formId);
    if (f) { setForm(f); setResponses(await getResponses(formId)); }
  };

  useEffect(() => { reload(); }, [formId, uid]);

  const handleDelete = async (respId: string) => {
    if (!confirm('Delete this response?')) return;
    setDeleting(respId);
    await deleteResponse(formId!, respId);
    await reload();
    setDeleting(null);
  };

  const handleExportExcel = async () => {
    if (!form) return;
    setExporting('excel');
    try {
      const { exportToExcel } = await import('../services/exportService');
      await exportToExcel(form, filtered);
    } catch (e) {
      console.error('Excel export failed:', e);
      alert('Export failed. Please try again.');
    }
    setExporting(null);
  };

  const handleExportPDF = async () => {
    if (!form) return;
    setExporting('pdf');
    try {
      const { exportToPDF } = await import('../services/exportService');
      await exportToPDF(form, filtered);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Export failed. Please try again.');
    }
    setExporting(null);
  };

  const filtered = responses.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      new Date(r.submitted_at).toLocaleString().toLowerCase().includes(q) ||
      Object.values(r.answers).some(v => String(v).toLowerCase().includes(q))
    );
  });

  if (!form) return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900 font-sans flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-gray-200 flex items-center gap-4 px-6 bg-white shadow-sm sticky top-0 z-30">
        <button
          onClick={() => navigate(`/forms/builder/${form.id}`)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Builder
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate text-sm md:text-base">{form.title}</h1>
          <p className="text-gray-400 text-xs">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button onClick={() => reload()}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExportExcel} disabled={!!exporting || responses.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            {exporting === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Excel
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting || responses.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePDF className="w-3.5 h-3.5" />}
            PDF
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 md:px-6 py-6 overflow-hidden flex flex-col">

        {/* Stats + Search row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {[
            { label: 'Total Responses', value: responses.length,       icon: <BarChart3 className="w-4 h-4" />, color: 'text-orange-500' },
            { label: 'Fields',          value: form.fields.length,     icon: <FilePDF   className="w-4 h-4" />, color: 'text-blue-500'   },
            { label: 'Last Submitted',  value: responses[0] ? new Date(responses[0].submitted_at).toLocaleDateString() : '—', icon: <Clock className="w-4 h-4" />, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl shadow-sm shrink-0">
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className="text-gray-900 font-bold text-sm leading-none">{s.value}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search responses..."
              className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all w-52"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
            <h3 className="text-gray-400 font-semibold text-lg mb-2">No responses yet</h3>
            <p className="text-gray-400 text-sm">Publish your form and share the link to start collecting data.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 w-8">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 whitespace-nowrap">Submitted</th>
                  {form.fields.map(f => (
                    <React.Fragment key={f.id}>
                      <th
                        title={f.label}
                        className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-orange-500 min-w-[120px] max-w-[180px]"
                      >
                        <div className="truncate max-w-[150px]">
                          {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                        </div>
                      </th>
                      {/* Extra Map Link column immediately after each GPS field */}
                      {f.type === 'gps' && (
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-blue-500 whitespace-nowrap min-w-[140px]">
                          📍 {f.label} — Map Link
                        </th>
                      )}
                    </React.Fragment>
                  ))}
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((resp, idx) => (
                  <tr key={resp.id} className="hover:bg-orange-50/30 transition-colors group align-middle">
                    <td className="px-3 py-3.5 text-gray-400 text-xs font-mono">{filtered.length - idx}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(resp.submitted_at).toLocaleString()}
                    </td>
                    {form.fields.map(field => (
                      <React.Fragment key={field.id}>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          {renderAnswer(field, resp.answers[field.id] ?? null)}
                        </td>
                        {/* Extra Map Link cell for GPS fields */}
                        {field.type === 'gps' && (
                          <td className="px-4 py-3.5">
                            {renderGpsMapLink(resp.answers[field.id] ?? null)}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleDelete(resp.id)}
                        disabled={deleting === resp.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default FormResponsesPage;
