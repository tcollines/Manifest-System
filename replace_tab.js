const fs = require('fs');
const file = 'd:/Manifest System/frontend/modules/generic-dept/tabs/ScheduleTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove New Schedule button block from Header
code = code.replace(/\{canEdit && !showCreate && \([\s\S]*?\}\)/g, '');

// 2. Remove showCreate block completely
code = code.replace(/\{\s*\/\*\s*──\s*All-in-one creation form\s*──\s*\*\/\s*\}([\s\S]*?)\{\s*\/\*\s*──\s*Schedule list\s*──\s*\*\/\s*\}/g, '{/* ── Schedule list ───────────────────────────────────────────── */}');

// 3. State Cleanup
// Replace states starting at line 340
code = code.replace(
    /\/\/ ── Create form \(all-in-one\) ─────────────────────────────────────────────[\s\S]*?const \[sessions, setSessions\]\s*=\s*useState<DraftSession\[\]>\(\[newSession\(\)\]\);/g,
    `// ── Adding sessions inline ──────────────────────────────────────────────────
    const [addingSessionScheduleId, setAddingSessionScheduleId] = useState<string | null>(null);
    const [newSessionLabel, setNewSessionLabel] = useState('');
    const [newSessionDate, setNewSessionDate] = useState('');
    const [newSessionArrival, setNewSessionArrival] = useState('');
    const [savingNewSession, setSavingNewSession] = useState(false);`
);

// 4. Remove handleCreate and resetForm
code = code.replace(
    /\/\/ ── Create schedule \(all-in-one\) ─────────────────────────────────────────[\s\S]*?\/\/ ── Other handlers ───────────────────────────────────────────────────────/g,
    `// ── Adding sessions inline handler ───────────────────────────────────────
    const handleAddSession = async (scheduleId: string) => {
        if (!newSessionLabel.trim() || !newSessionDate || !newSessionArrival.trim()) {
            showToast('All session fields are required', 'error'); return;
        }
        setSavingNewSession(true);
        const res = await ServiceScheduleStore.addSession(scheduleId, {
            sessionLabel: newSessionLabel.trim(),
            sessionDate: newSessionDate,
            arrivalTime: newSessionArrival.trim(),
        });
        setSavingNewSession(false);
        if (res.status === 'success') {
            showToast('Session added!', 'success');
            setAddingSessionScheduleId(null);
            setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival('');
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    // ── Other handlers ───────────────────────────────────────────────────────`
);

// 5. Insert SubmissionStatusWidget above Schedule list
// Note: only replace the first occurrence or just replace the exact text
code = code.replace(
    /\{\s*\/\*\s*──\s*Schedule list\s*──\s*\*\/\s*\}/g,
    `<SubmissionStatusWidget type="schedule" periodId={schedules[0]?.weekStart ?? ''} />

            {/* ── Schedule list ───────────────────────────────────────────── */}`
);

// Fix empty state condition
code = code.replace(
    /\{schedules\.length === 0 && !showCreate \? <EmptyState variant="schedule" \/> : \(/g,
    `{schedules.length === 0 ? <EmptyState variant="schedule" /> : (`
);

// 6. Add Inline 'Add Session' UI inside Expanded view
code = code.replace(
    /\{\(schedule\.sessions \?\? \[\]\)\.map\(session => \([\s\S]*?\}\)\}/g,
    match => match + `
                                    
                                    {/* Add Session UI */}
                                    {canEdit && (
                                        <div className="px-5 py-3 bg-white">
                                            {addingSessionScheduleId === schedule.id ? (
                                                <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                                    <p className="text-xs font-bold text-gray-700 mb-1">Add New Session</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <input type="text" value={newSessionLabel} onChange={e => setNewSessionLabel(e.target.value)} placeholder="Label (e.g. Sunday Service)" className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1 min-w-[150px]" />
                                                        <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                                                        <TimePicker value={newSessionArrival} onChange={setNewSessionArrival} placeholder="Arrival" />
                                                    </div>
                                                    <div className="flex gap-2 justify-end mt-1">
                                                        <button onClick={() => { setAddingSessionScheduleId(null); setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival(''); }} className="text-gray-500 text-xs hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold">Cancel</button>
                                                        <button onClick={() => handleAddSession(schedule.id)} disabled={savingNewSession} className="bg-blue-600 text-white text-xs hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                                                            {savingNewSession ? 'Adding...' : 'Add Session'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddingSessionScheduleId(schedule.id);
                                                    setNewSessionLabel(''); setNewSessionDate(''); setNewSessionArrival('');
                                                }} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-blue-200 w-full justify-center">
                                                    <Plus className="w-3.5 h-3.5" /> Add Session
                                                </button>
                                            )}
                                        </div>
                                    )}`
);

fs.writeFileSync(file, code);
console.log('Successfully updated ScheduleTab.tsx');
