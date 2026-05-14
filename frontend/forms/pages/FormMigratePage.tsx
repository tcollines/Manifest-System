import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';
import { getAllForms, migrateFormToId } from '../services/formsStore';
import type { Form } from '../types/forms.types';

// ─── The permanent canonical ID for this form ─────────────────────────────────
const CANONICAL_ID  = 'mp59euhldujwa';
const CANONICAL_URL = `https://manifestsystem.vercel.app/forms/f/${CANONICAL_ID}`;
const FORM_TITLE_FRAGMENT = 'Manifest Locator';

// ─── FormMigratePage ──────────────────────────────────────────────────────────

type Step = 'scanning' | 'found' | 'already_correct' | 'migrating' | 'done' | 'error' | 'not_found';

const FormMigratePage: React.FC = () => {
  const { formsUser } = useFormsAuth();
  const navigate = useNavigate();

  const [step, setStep]       = useState<Step>('scanning');
  const [forms, setForms]     = useState<Form[]>([]);
  const [target, setTarget]   = useState<Form | null>(null);
  const [message, setMessage] = useState('');

  // ── Step 1: Scan all forms to find the Manifest Locator ──────────────────
  useEffect(() => {
    if (!formsUser) return;
    (async () => {
      const all = await getAllForms(formsUser.uid);
      setForms(all);

      // Check if it's already correctly stored
      const canonical = all.find(f => f.id === CANONICAL_ID);
      if (canonical) {
        setTarget(canonical);
        setStep('already_correct');
        return;
      }

      // Find by title fragment
      const match = all.find(f =>
        f.title.toLowerCase().includes(FORM_TITLE_FRAGMENT.toLowerCase()),
      );
      if (match) {
        setTarget(match);
        setStep('found');
      } else {
        setStep('not_found');
      }
    })();
  }, [formsUser]);

  // ── Step 2: Run the migration ─────────────────────────────────────────────
  const runMigration = async () => {
    if (!formsUser || !target) return;
    setStep('migrating');
    const result = await migrateFormToId(formsUser.uid, target.id, CANONICAL_ID);
    if (result.ok) {
      setMessage(result.message);
      setStep('done');
    } else {
      setMessage(result.message);
      setStep('error');
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <Link2 className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Form ID Migration</h1>
          <p className="text-gray-500 text-sm">
            Restores <strong>"Manifest Locator"</strong> to its permanent public link
          </p>
          <code className="mt-2 inline-block text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-1.5 font-mono break-all">
            {CANONICAL_URL}
          </code>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

          {/* SCANNING */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-gray-500 text-sm">Scanning your forms in Firestore…</p>
            </div>
          )}

          {/* FOUND — needs migration */}
          {step === 'found' && target && (
            <>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 text-sm font-semibold mb-1">⚠️ Form found under wrong ID</p>
                <p className="text-yellow-700 text-xs">
                  <strong>"{target.title}"</strong> is stored as:
                </p>
                <code className="text-xs font-mono text-yellow-800 bg-yellow-100 rounded px-2 py-0.5 mt-1 inline-block break-all">
                  {target.id}
                </code>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Current ID</p>
                  <code className="font-mono text-xs text-red-600 break-all">{target.id}</code>
                </div>
                <ArrowRight className="w-5 h-5 shrink-0 text-orange-400" />
                <div className="flex-1 p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Permanent ID</p>
                  <code className="font-mono text-xs text-green-700 break-all">{CANONICAL_ID}</code>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <p>✅ Copies form to <code className="font-mono bg-gray-100 px-1 rounded">forms/{CANONICAL_ID}</code></p>
                <p>✅ Republishes to <code className="font-mono bg-gray-100 px-1 rounded">live_forms/{CANONICAL_ID}</code></p>
                <p>🗑️ Deletes stale document <code className="font-mono bg-gray-100 px-1 rounded">forms/{target.id}</code></p>
                <p>🔒 Future saves/publishes will always use <code className="font-mono bg-gray-100 px-1 rounded">{CANONICAL_ID}</code></p>
              </div>

              <button
                onClick={runMigration}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-200 text-sm"
              >
                Run Migration → Lock to {CANONICAL_ID}
              </button>
            </>
          )}

          {/* ALREADY CORRECT */}
          {step === 'already_correct' && target && (
            <>
              <div className="flex flex-col items-center py-4 gap-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Form is already on the correct ID ✓</p>
                  <code className="text-xs font-mono text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1 inline-block">
                    {CANONICAL_ID}
                  </code>
                </div>
                <p className="text-gray-400 text-xs">
                  "{target.title}" is stored and published under the permanent ID.
                  No migration needed.
                </p>
              </div>
              <a
                href={CANONICAL_URL}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all text-sm"
              >
                Open Public Form ↗
              </a>
            </>
          )}

          {/* MIGRATING */}
          {step === 'migrating' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-gray-500 text-sm">Migrating… writing to Firestore…</p>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <>
              <div className="flex flex-col items-center py-4 gap-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Migration complete! 🎉</p>
                  <p className="text-gray-500 text-xs">{message}</p>
                </div>
                <p className="text-gray-400 text-xs max-w-xs">
                  The form is now permanently locked to <code className="font-mono">{CANONICAL_ID}</code>.
                  This link will never change again.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={CANONICAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all text-sm"
                >
                  Open Public Form ↗
                </a>
                <button
                  onClick={() => navigate(`/forms/builder/${CANONICAL_ID}`)}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all text-sm"
                >
                  Open Builder
                </button>
              </div>
            </>
          )}

          {/* NOT FOUND */}
          {step === 'not_found' && (
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm font-semibold mb-1">❌ No matching form found</p>
                <p className="text-red-600 text-xs">
                  Could not find any form containing "{FORM_TITLE_FRAGMENT}" in your account.
                </p>
              </div>
              <p className="text-gray-400 text-xs">All forms found ({forms.length}):</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {forms.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <code className="font-mono text-gray-400">{f.id}</code>
                    <span className="truncate flex-1">{f.title}</span>
                  </div>
                ))}
                {forms.length === 0 && <p className="text-gray-400 text-xs">No forms in this account.</p>}
              </div>
              <p className="text-gray-400 text-xs">
                If the form exists under a different title, select it below and manually migrate.
              </p>
              {forms.length > 0 && (
                <div className="space-y-2">
                  {forms.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { setTarget(f); setStep('found'); }}
                      className="w-full text-left px-3 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-sm text-orange-800 transition-all"
                    >
                      <span className="font-semibold block truncate">{f.title}</span>
                      <code className="text-[10px] font-mono text-orange-500">{f.id}</code>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold">Migration failed</p>
                  <p className="text-red-600 text-xs mt-1">{message}</p>
                </div>
              </div>
              <button
                onClick={() => setStep('scanning')}
                className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-all"
              >
                Retry
              </button>
            </>
          )}
        </div>

        {/* Back link */}
        <button
          onClick={() => navigate('/forms/dashboard')}
          className="mt-6 flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default FormMigratePage;
