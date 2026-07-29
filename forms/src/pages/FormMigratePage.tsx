import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Link2, RefreshCw, Database, ShieldAlert,
} from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';
import {
  getAllForms,
  migrateFormToId,
  findOrphanedResponses,
  migrateResponsesToFormId,
  forceClaimForm,
} from '../services/formsStore';
import type { Form, FormResponse } from '../types/forms.types';

// ─── Constants ────────────────────────────────────────────────────────────────
const CANONICAL_ID    = 'mp59euhldujwa';
const CANONICAL_URL   = `https://manifestsystem.vercel.app/f/${CANONICAL_ID}`;
const FORM_TITLE_FRAG = 'Manifest Locator';

// ─── FormMigratePage ──────────────────────────────────────────────────────────

type FormStep = 'scanning' | 'found' | 'already_correct' | 'migrating' | 'done' | 'error' | 'not_found';
type RespStep = 'idle' | 'scanning' | 'found' | 'none' | 'migrating' | 'done' | 'error';
type ClaimStep = 'idle' | 'claiming' | 'done' | 'error';

const FormMigratePage: React.FC = () => {
  const { formsUser } = useFormsAuth();
  const navigate = useNavigate();

  // ── Form migration state ──────────────────────────────────────────────────
  const [formStep, setFormStep]  = useState<FormStep>('scanning');
  const [allForms, setAllForms]  = useState<Form[]>([]);
  const [sourceForm, setSource]  = useState<Form | null>(null);
  const [formMsg, setFormMsg]    = useState('');

  // ── Force claim state ─────────────────────────────────────────────────────
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimMsg, setClaimMsg]   = useState('');

  // ── Response recovery state ───────────────────────────────────────────────
  const [respStep, setRespStep]       = useState<RespStep>('idle');
  const [orphans, setOrphans]         = useState<FormResponse[]>([]);
  const [orphanFormIds, setFIds]      = useState<string[]>([]);
  const [allFormIds, setAllFormIds]   = useState<string[]>([]);
  const [totalCount, setTotalCount]   = useState<number>(0);
  const [respMsg, setRespMsg]         = useState('');

  // IMPORTANT: use formsUser.id (Firebase UID) — NOT formsUser.uid (undefined)
  const uid = formsUser?.id ?? '';

  // ── Step 1: Scan forms ────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const all = await getAllForms(uid);
      setAllForms(all);

      const canonical = all.find(f => f.id === CANONICAL_ID);
      if (canonical) { setSource(canonical); setFormStep('already_correct'); return; }

      const match = all.find(f => f.title.toLowerCase().includes(FORM_TITLE_FRAG.toLowerCase()));
      if (match) { setSource(match); setFormStep('found'); }
      else        { setFormStep('not_found'); }
    })();
  }, [uid]);

  // ── Form migration ────────────────────────────────────────────────────────
  const runFormMigration = async () => {
    if (!uid || !sourceForm) return;
    setFormStep('migrating');
    const r = await migrateFormToId(uid, sourceForm.id, CANONICAL_ID);
    setFormMsg(r.message);
    setFormStep(r.ok ? 'done' : 'error');
  };

  // ── Force Claim ───────────────────────────────────────────────────────────
  const runForceClaim = async () => {
    if (!uid) return;
    setClaimStep('claiming');
    const r = await forceClaimForm(uid, CANONICAL_ID);
    setClaimMsg(r.message);
    setClaimStep(r.ok ? 'done' : 'error');
    if (r.ok) setFormStep('done');
  };

  // ── Response recovery: scan ───────────────────────────────────────────────
  const scanResponses = async () => {
    setRespStep('scanning');
    const { responses, formIds, totalCount: tc, allFormIds: afids } = await findOrphanedResponses(CANONICAL_ID);
    setOrphans(responses);
    setFIds(formIds);
    setTotalCount(tc);
    setAllFormIds(afids);
    if (tc === -1) {
      setRespMsg('Scan failed — check browser console for details.');
      setRespStep('error');
    } else {
      setRespStep(responses.length > 0 ? 'found' : 'none');
    }
  };

  // ── Response recovery: migrate ────────────────────────────────────────────
  const runRespMigration = async () => {
    setRespStep('migrating');
    const result = await migrateResponsesToFormId(orphans.map(r => r.id), CANONICAL_ID);
    setRespMsg(result.message);
    setRespStep(result.ok ? 'done' : 'error');
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-start px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <Link2 className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Form Recovery Tool</h1>
          <p className="text-gray-500 text-sm">Restore form & responses to permanent link</p>
          <code className="mt-2 inline-block text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-1.5 font-mono break-all">
            {CANONICAL_URL}
          </code>
          {uid && (
            <p className="mt-2 text-[10px] text-gray-400">
              Your Firebase UID: <code className="font-mono bg-gray-100 px-1 rounded">{uid}</code>
            </p>
          )}
        </div>

        {/* ── CARD 0: Force Claim (always visible) ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-black flex items-center justify-center">⚡</span>
            Force Claim Form
          </h2>
          <p className="text-gray-500 text-xs">
            If the form exists at <code className="font-mono bg-gray-100 px-1 rounded">{CANONICAL_ID}</code> but isn't
            showing in your dashboard, this immediately stamps your Firebase UID as owner — regardless of
            what was previously stored.
          </p>

          {claimStep === 'idle' && (
            <button onClick={runForceClaim}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all text-sm">
              <ShieldAlert className="w-4 h-4" />
              Force Claim mp59euhldujwa → My Account
            </button>
          )}

          {claimStep === 'claiming' && (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
              <p className="text-gray-500 text-sm">Claiming form ownership…</p>
            </div>
          )}

          {claimStep === 'done' && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-800 text-sm font-semibold">✅ {claimMsg}</p>
            </div>
          )}

          {claimStep === 'error' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{claimMsg}</p>
            </div>
          )}

          {claimStep === 'done' && (
            <div className="flex gap-3">
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all text-sm">
                Go to Dashboard
              </button>
              <a href={CANONICAL_URL} target="_blank" rel="noreferrer"
                className="flex-1 text-center py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all text-sm">
                Open Form ↗
              </a>
            </div>
          )}
        </div>

        {/* ── CARD 1: Form structure scan ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-black flex items-center justify-center">1</span>
            Form Structure Scan
          </h2>

          {formStep === 'scanning' && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              <p className="text-gray-500 text-sm">Scanning Firestore for your forms…</p>
            </div>
          )}

          {formStep === 'found' && sourceForm && (
            <>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
                <p className="text-yellow-800 font-semibold mb-1">⚠️ Form under wrong ID</p>
                <code className="text-xs font-mono text-yellow-700 break-all">{sourceForm.id}</code>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-400 mb-0.5">Current</p>
                  <code className="font-mono text-red-600 break-all">{sourceForm.id}</code>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 p-2 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-gray-400 mb-0.5">Permanent</p>
                  <code className="font-mono text-green-700">{CANONICAL_ID}</code>
                </div>
              </div>
              <button onClick={runFormMigration}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all text-sm">
                Migrate Form Structure
              </button>
            </>
          )}

          {formStep === 'migrating' && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              <p className="text-gray-500 text-sm">Writing to Firestore…</p>
            </div>
          )}

          {(formStep === 'done' || formStep === 'already_correct') && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-800 text-sm font-semibold">
                {formStep === 'already_correct' ? `Form is already on correct ID: ${CANONICAL_ID}` : formMsg}
              </p>
            </div>
          )}

          {formStep === 'error' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{formMsg}</p>
            </div>
          )}

          {formStep === 'not_found' && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-gray-700 text-sm font-semibold">No forms found for your account</p>
                <p className="text-gray-400 text-xs mt-1">
                  Use "Force Claim" above to claim <code className="font-mono">{CANONICAL_ID}</code> directly.
                </p>
              </div>
              {allForms.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 font-semibold">Forms in account:</p>
                  {allForms.map(f => (
                    <button key={f.id} onClick={() => { setSource(f); setFormStep('found'); }}
                      className="w-full text-left px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-sm text-orange-800 transition-all">
                      <span className="font-semibold block truncate">{f.title}</span>
                      <code className="text-[10px] font-mono text-orange-500">{f.id}</code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CARD 2: Response recovery ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-black flex items-center justify-center">2</span>
            Recover Lost Responses
          </h2>
          <p className="text-gray-500 text-xs">
            Searches the entire <code className="font-mono bg-gray-100 px-1 rounded">responses</code> collection for
            entries saved under old form IDs and re-links them to <code className="font-mono bg-gray-100 px-1 rounded">{CANONICAL_ID}</code>.
          </p>

          {respStep === 'idle' && (
            <button onClick={scanResponses}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm">
              <Database className="w-4 h-4" />
              Scan for Orphaned Responses
            </button>
          )}

          {respStep === 'scanning' && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <p className="text-gray-500 text-sm">Scanning all response documents…</p>
            </div>
          )}

          {respStep === 'none' && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <p className="text-gray-700 text-sm font-semibold">
                  📊 Scan complete — {totalCount} total document{totalCount !== 1 ? 's' : ''} in responses collection
                </p>
                {totalCount === 0 ? (
                  <p className="text-red-600 text-xs font-semibold">
                    ⚠️ The responses collection is completely empty.
                  </p>
                ) : (
                  <>
                    <p className="text-green-700 text-xs font-semibold">
                      ✅ {totalCount} response{totalCount !== 1 ? 's' : ''} already linked to <code className="font-mono">{CANONICAL_ID}</code>
                    </p>
                    <p className="text-gray-400 text-xs">
                      Form IDs: {allFormIds.map(id => (
                        <code key={id} className="font-mono bg-gray-100 px-1 rounded ml-1">{id}</code>
                      ))}
                    </p>
                  </>
                )}
              </div>
              {totalCount > 0 && (
                <button onClick={() => navigate(`/responses/${CANONICAL_ID}`)}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all text-sm">
                  View Responses
                </button>
              )}
            </div>
          )}

          {respStep === 'found' && (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 text-sm font-semibold mb-1">
                  🎉 Found {orphans.length} response{orphans.length !== 1 ? 's' : ''} to recover!
                </p>
                {orphanFormIds.map(id => (
                  <code key={id} className="block text-xs font-mono text-blue-700 bg-blue-100 rounded px-2 py-0.5 mb-1 break-all">
                    {id} ({orphans.filter(r => r.form_id === id).length} responses)
                  </code>
                ))}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100">
                {orphans.slice(0, 20).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 text-xs border-b border-gray-100 last:border-0">
                    <code className="font-mono text-gray-400 shrink-0">{r.id.slice(0, 8)}…</code>
                    <span className="text-gray-500 truncate">{new Date(r.submitted_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <button onClick={runRespMigration}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all text-sm">
                <RefreshCw className="w-4 h-4" />
                Recover All {orphans.length} Response{orphans.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {respStep === 'migrating' && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
              <p className="text-gray-500 text-sm">Re-linking responses in Firestore…</p>
            </div>
          )}

          {respStep === 'done' && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-800 text-sm font-semibold">✅ {respMsg}</p>
            </div>
          )}

          {respStep === 'error' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{respMsg}</p>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition-colors mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default FormMigratePage;
