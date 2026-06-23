import React, { useState, useMemo, useCallback, useTransition, startTransition } from 'react';
import * as XLSX from 'xlsx';
import { Member, MinistryEvent } from '../../types';
import { MemberStore, mapMemberFromDB } from '../../database/memberStore';
import { EventStore } from '../../database/eventStore';
import { apiFetch } from '../../services/api';
import { useNotification } from '../../components/ui/NotificationSystem';
import {
  Search,
  Download,
  Filter,
  Users,
  BarChart2,
  Home,
  Calendar,
  X,
  Loader2,
  FileSpreadsheet,
  Play,
  RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueryFilters {
  attendanceMin: string;
  attendanceMax: string;
  residence: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  category: string;
  gender: string;
  nameSearch: string;
}

interface EnrichedMember extends Member {
  attendanceCount: number;
  eligibleServices: number;
  attendancePct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count / total) * 100);

const pctLabel = (p: number) => {
  if (p >= 80) return { label: 'High', color: 'bg-green-100 text-green-700' };
  if (p >= 50) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
  return { label: 'Low', color: 'bg-red-100 text-red-700' };
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
};

const EMPTY_FILTERS: QueryFilters = {
  attendanceMin: '',
  attendanceMax: '',
  residence: '',
  serviceDateFrom: '',
  serviceDateTo: '',
  category: '',
  gender: '',
  nameSearch: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdministrationQueriesPage: React.FC = () => {
  const { showToast } = useNotification();

  // ── Query state (populated only after "Run Query") ──────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<MinistryEvent[]>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, number>>({});
  const [totalMembersInDB, setTotalMembersInDB] = useState(0);
  const [hasQueried, setHasQueried] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [loadedCount, setLoadedCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 100;
  const [, startRenderTransition] = useTransition();

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<QueryFilters>(EMPTY_FILTERS);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const setFilter = useCallback(
    (key: keyof QueryFilters, value: string) =>
      setFilters(prev => ({ ...prev, [key]: value })),
    []
  );

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setMembers([]);
    setAttendanceSummary({});
    setHasQueried(false);
  };

  // ── Run Query ───────────────────────────────────────────────────────────────
  const runQuery = async () => {
    if (!hasActiveFilters) {
      showToast('Please set at least one filter before running a query.', 'error');
      return;
    }

    setLoading(true);
    setLoadingProgress('Fetching members…');
    setLoadedCount(0);
    setHasQueried(false);

    try {
      const PAGE_SIZE = 100;
      const BATCH_CONCURRENT = 5;

      // Step 1: page 1 for count
      setLoadingProgress('Counting members…');
      const firstRaw = await apiFetch(`/members?page=1&pageSize=${PAGE_SIZE}&search=`);
      if (!firstRaw || !firstRaw.data) throw new Error('Failed to fetch members');

      const totalInDB: number = firstRaw.count ?? firstRaw.data.length;
      setTotalMembersInDB(totalInDB);

      const totalPages = Math.ceil(Math.min(totalInDB, 10000) / PAGE_SIZE);
      let allMembers: Member[] = (firstRaw.data as any[]).map(mapMemberFromDB);

      // Step 2: remaining pages in concurrent batches
      for (let batchStart = 2; batchStart <= totalPages; batchStart += BATCH_CONCURRENT) {
        const batchEnd = Math.min(batchStart + BATCH_CONCURRENT - 1, totalPages);
        const pageNums = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);

        const batchResults = await Promise.all(
          pageNums.map(p =>
            apiFetch(`/members?page=${p}&pageSize=${PAGE_SIZE}&search=`)
              .then((raw: any) => (raw?.data as any[] ?? []).map(mapMemberFromDB))
              .catch(() => [] as Member[])
          )
        );

        for (const batch of batchResults) {
          allMembers = allMembers.concat(batch);
        }

        const loaded = allMembers.length;
        startTransition(() => {
          setLoadedCount(loaded);
          setLoadingProgress(`Loading members… ${loaded} / ${totalInDB}`);
        });
      }

      // Deduplicate
      const seen = new Set<string>();
      allMembers = allMembers.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      // Step 3: Fetch attendance summary and services in parallel
      setLoadingProgress('Fetching attendance data…');

      const params = new URLSearchParams();
      if (filters.serviceDateFrom) params.set('dateFrom', filters.serviceDateFrom);
      if (filters.serviceDateTo)   params.set('dateTo',   filters.serviceDateTo);
      const qs = params.toString() ? '?' + params.toString() : '';

      const [summaryRaw, eventsRes] = await Promise.all([
        apiFetch('/members/attendance-summary' + qs).catch(() => null),
        services.length === 0 ? EventStore.getAll({ limit: 500 }) : Promise.resolve(null),
      ]);

      const newSummary: Record<string, number> = summaryRaw?.summary ?? {};
      const newTotalServices: number = summaryRaw?.totalServices ?? totalServices;

      let newServices = services;
      if (eventsRes && (eventsRes as any).status === 'success') {
        newServices = (eventsRes as any).data
          .filter((e: MinistryEvent) => e.type === 'Service')
          .sort((a: MinistryEvent, b: MinistryEvent) => (a.date ?? '').localeCompare(b.date ?? ''));
      }

      // Step 4: commit all state at once in a transition (non-blocking)
      startRenderTransition(() => {
        setMembers(allMembers);
        setTotalMembersInDB(allMembers.length);
        setAttendanceSummary(newSummary);
        setTotalServices(newTotalServices);
        if (newServices !== services) setServices(newServices);
        setTablePage(0);
        setHasQueried(true);
      });

    } catch {
      showToast('Failed to run query. Please try again.', 'error');
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

  // ── Enrich members with attendance % ────────────────────────────────────────
  const enrichedMembers = useMemo<EnrichedMember[]>(() => {
    if (!hasQueried) return [];
    const hasSummary = Object.keys(attendanceSummary).length > 0;
    return members.map(m => {
      const count = hasSummary
        ? (attendanceSummary[m.id] ?? 0)
        : (m.attendedServiceIds?.length ?? 0);
      const joinedStr = m.joinedDate ? m.joinedDate.substring(0, 10) : null;
      const eligible = joinedStr
        ? services.filter(s => (s.date ?? '') >= joinedStr).length
        : totalServices;
      return {
        ...m,
        attendanceCount: count,
        eligibleServices: eligible || totalServices,
        attendancePct: pct(count, eligible || totalServices),
      };
    });
  }, [members, services, totalServices, attendanceSummary, hasQueried]);

  // ── Apply filters ───────────────────────────────────────────────────────────
  const filtered = useMemo<EnrichedMember[]>(() => {
    if (!hasQueried) return [];
    const minPct = filters.attendanceMin !== '' ? Number(filters.attendanceMin) : 0;
    const maxPct = filters.attendanceMax !== '' ? Number(filters.attendanceMax) : 100;
    const nameQ = filters.nameSearch.trim().toLowerCase();
    return enrichedMembers.filter(m => {
      if (m.attendancePct < minPct || m.attendancePct > maxPct) return false;
      if (filters.residence && m.residency !== filters.residence) return false;
      if (filters.category && m.category !== filters.category) return false;
      if (filters.gender && m.gender !== filters.gender) return false;
      if (nameQ && !m.name.toLowerCase().includes(nameQ)) return false;
      return true;
    });
  }, [enrichedMembers, filters, hasQueried]);

  // Reset table page when results change
  const prevFilteredLen = React.useRef(0);
  React.useEffect(() => {
    if (filtered.length !== prevFilteredLen.current) {
      setTablePage(0);
      prevFilteredLen.current = filtered.length;
    }
  }, [filtered.length]);

  const tableStart = tablePage * TABLE_PAGE_SIZE;
  const pageRows = filtered.slice(tableStart, tableStart + TABLE_PAGE_SIZE);
  const totalTablePages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);

  // ── Residence options ────────────────────────────────────────────────────────
  const residenceOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => { if (m.residency) set.add(m.residency); });
    return Array.from(set).sort();
  }, [members]);

  // ── Data quality warning ─────────────────────────────────────────────────────
  const attendanceDataMissing = useMemo(() => {
    if (!hasQueried || enrichedMembers.length === 0) return false;
    return enrichedMembers.every(m => m.attendanceCount === 0) && totalServices > 0;
  }, [enrichedMembers, hasQueried, totalServices]);

  // ── Excel export ─────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (filtered.length === 0) { showToast('No records to export', 'error'); return; }
    setExporting(true);
    try {
      const rows = filtered.map(m => ({
        'Full Name': m.name,
        'Category': m.category,
        'Gender': m.gender ?? '—',
        'Phone': m.phone,
        'Residence': m.residency ?? '—',
        'Joined Date': fmtDate(m.joinedDate),
        'Services Attended': m.attendanceCount,
        'Eligible Services': m.eligibleServices,
        'Total Services': totalServices,
        'Attendance %': `${m.attendancePct}%`,
        'Attendance Level': pctLabel(m.attendancePct).label,
        'Born Again': (m as any).bornAgain ?? '—',
        'Occupation': (m as any).occupation ?? '—',
        'Place of Work': (m as any).placeOfWork ?? '—',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 22 },
        { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 22 },
        { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Query Results');

      const summary = [
        { Field: 'Total Records Matched', Value: filtered.length },
        { Field: 'Total Members Scanned', Value: members.length },
        { Field: 'Total Services in Range', Value: totalServices },
        { Field: 'Attendance Filter', Value: filters.attendanceMin || filters.attendanceMax ? `${filters.attendanceMin || 0}% – ${filters.attendanceMax || 100}%` : 'All' },
        { Field: 'Service Date From', Value: filters.serviceDateFrom || 'Any' },
        { Field: 'Service Date To', Value: filters.serviceDateTo || 'Any' },
        { Field: 'Residence Filter', Value: filters.residence || 'All' },
        { Field: 'Category Filter', Value: filters.category || 'All' },
        { Field: 'Gender Filter', Value: filters.gender || 'All' },
        { Field: 'Name Search', Value: filters.nameSearch || '—' },
        { Field: 'Export Date', Value: new Date().toLocaleString() },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      ws2['!cols'] = [{ wch: 30 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Query Summary');

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Members_Query_${timestamp}.xlsx`);
      showToast(`Exported ${filtered.length} records successfully`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Member Queries</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Set your filters, then click <strong>Run Query</strong> to search members and export to Excel.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {hasQueried && (
            <button
              onClick={exportExcel}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting…' : `Export ${filtered.length} Records`}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Filter size={16} className="text-ministry-orange" /> Query Filters
          </h3>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
              <X size={13} /> Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Search size={12} /> Name Search</label>
            <input type="text" placeholder="Search by name…" value={filters.nameSearch}
              onChange={e => setFilter('nameSearch', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runQuery()}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><BarChart2 size={12} /> Attendance % — Min</label>
            <input type="number" min={0} max={100} placeholder="e.g. 80" value={filters.attendanceMin}
              onChange={e => setFilter('attendanceMin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><BarChart2 size={12} /> Attendance % — Max</label>
            <input type="number" min={0} max={100} placeholder="e.g. 100" value={filters.attendanceMax}
              onChange={e => setFilter('attendanceMax', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Home size={12} /> Residence</label>
            <select value={filters.residence} onChange={e => setFilter('residence', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white">
              <option value="">All Residences</option>
              {residenceOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Calendar size={12} /> Service Date From</label>
            <input type="date" value={filters.serviceDateFrom} onChange={e => setFilter('serviceDateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Calendar size={12} /> Service Date To</label>
            <input type="date" value={filters.serviceDateTo} onChange={e => setFilter('serviceDateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Users size={12} /> Category</label>
            <select value={filters.category} onChange={e => setFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white">
              <option value="">All Categories</option>
              <option value="Member">Member</option>
              <option value="First Timer">First Timer</option>
              <option value="Guest">Guest</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Users size={12} /> Gender</label>
            <select value={filters.gender} onChange={e => setFilter('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-ministry-orange bg-white">
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            {hasActiveFilters
              ? `${Object.values(filters).filter(v => v !== '').length} filter set — click Run Query to search`
              : 'Set at least one filter to run a query'}
          </p>
          <button onClick={runQuery} disabled={loading || !hasActiveFilters}
            className="flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-40 text-sm shadow-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : hasQueried ? <RefreshCw size={15} /> : <Play size={15} />}
            {loading ? (loadingProgress || 'Running…') : hasQueried ? 'Re-run Query' : 'Run Query'}
          </button>
        </div>

        {loading && (
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-ministry-orange rounded-full transition-all duration-300"
                style={{ width: totalMembersInDB > 0 ? `${Math.min(98, (loadedCount / totalMembersInDB) * 100)}%` : '20%' }} />
            </div>
            <p className="text-xs text-gray-400 text-right">{loadingProgress}</p>
          </div>
        )}
      </div>

      {/* Idle placeholder */}
      {!hasQueried && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Search size={28} className="opacity-30" />
          </div>
          <p className="font-semibold text-gray-600 text-base">No query run yet</p>
          <p className="text-sm mt-1 max-w-xs">
            Use the filters above and click <strong className="text-black">Run Query</strong> to search members.
            No data is loaded until you run a query.
          </p>
        </div>
      )}

      {/* Results */}
      {hasQueried && (
        <>
          {attendanceDataMissing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
              <div>
                <p className="font-bold text-amber-800 text-sm">Attendance data not yet linked</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  All members show 0% because no attendance records are linked yet.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <FileSpreadsheet size={18} />, label: 'Results', value: filtered.length, color: 'orange' },
              { icon: <Users size={18} />, label: 'Members Scanned', value: members.length, color: 'blue' },
              { icon: <BarChart2 size={18} />, label: 'Total Services', value: totalServices, color: 'indigo' },
              {
                icon: <BarChart2 size={18} />, label: 'Avg Attendance', color: 'emerald',
                value: filtered.length ? `${Math.round(filtered.reduce((s, m) => s + m.attendancePct, 0) / filtered.length)}%` : '—',
              },
            ].map(stat => (
              <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-2xl p-4 flex items-center gap-3`}>
                <div className={`bg-${stat.color}-500 text-white p-2 rounded-xl flex-shrink-0`}>{stat.icon}</div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <FileSpreadsheet size={16} className="text-ministry-orange" />
                <span className="font-semibold text-sm">
                  {filtered.length === 0
                    ? 'No members match your filters'
                    : `Showing ${tableStart + 1}–${Math.min(tableStart + TABLE_PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString()} members`}
                </span>
              </div>
              {filtered.length > 0 && (
                <button onClick={exportExcel} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
                  {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Download Excel
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Gender</th>
                    <th className="px-4 py-3 text-left">Residence</th>
                    <th className="px-4 py-3 text-left">Joined Date</th>
                    <th className="px-4 py-3 text-left">Services</th>
                    <th className="px-4 py-3 text-left">Attendance %</th>
                    <th className="px-4 py-3 text-left">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-gray-400">
                        <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No members match your query.</p>
                        <p className="text-xs mt-1">Try adjusting your filters and running again.</p>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((m, idx) => {
                      const level = pctLabel(m.attendancePct);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{tableStart + idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{m.name}</div>
                            <div className="text-xs text-gray-400">{m.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              m.category === 'Member' ? 'bg-blue-100 text-blue-700'
                              : m.category === 'First Timer' ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'}`}>
                              {m.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{m.gender ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{m.residency ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDate(m.joinedDate)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="font-semibold">{m.attendanceCount}</span>
                            <span className="text-gray-400"> / {m.eligibleServices}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  m.attendancePct >= 80 ? 'bg-green-500'
                                  : m.attendancePct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(m.attendancePct, 100)}%` }} />
                              </div>
                              <span className="font-bold text-gray-700 tabular-nums text-xs w-8">{m.attendancePct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${level.color}`}>{level.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalTablePages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-500">
                  Page {tablePage + 1} of {totalTablePages} &nbsp;&middot;&nbsp; {filtered.length.toLocaleString()} total results
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={tablePage === 0}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    ← Previous
                  </button>
                  <button onClick={() => setTablePage(p => Math.min(totalTablePages - 1, p + 1))} disabled={tablePage >= totalTablePages - 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdministrationQueriesPage;