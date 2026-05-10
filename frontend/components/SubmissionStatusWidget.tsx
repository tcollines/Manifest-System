import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

interface DepartmentStatus {
  id: string;
  name: string;
}

interface StatusData {
  total: number;
  submitted: DepartmentStatus[];
  draft: DepartmentStatus[];
  missing: DepartmentStatus[];
}

interface Props {
  type: 'workplan' | 'schedule';
  periodId: string; // month (YYYY-MM) or weekStart (YYYY-MM-DD)
}

const SubmissionStatusWidget: React.FC<Props> = ({ type, periodId }) => {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const endpoint = type === 'workplan' 
        ? `/workplans/global-status/${periodId}`
        : `/schedules/global-status/${periodId}`;
        
      const res = await safeFetch(() => apiFetch(endpoint), 'Failed to fetch global status');
      if (res.status === 'success') {
        setData(res.data);
      }
      setLoading(false);
    };
    
    if (periodId) {
      fetchData();
    }
  }, [type, periodId]);

  if (loading || !data) return null;

  const totalSubmitted = data.submitted.length;
  const isComplete = totalSubmitted === data.total;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden my-3">
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isComplete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
            {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              Cross-Department Status
            </p>
            <p className="text-xs text-gray-500 font-medium">
              {totalSubmitted} of {data.total} departments submitted
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center p-1">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Submitted */}
                <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Submitted ({data.submitted.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {data.submitted.map(d => (
                            <span key={d.id} className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-md font-medium shadow-sm">
                                {d.name}
                            </span>
                        ))}
                        {data.submitted.length === 0 && <span className="text-[11px] text-gray-400 italic">None yet</span>}
                    </div>
                </div>

                {/* Pending */}
                <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending ({data.draft.length + data.missing.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {data.draft.map(d => (
                            <span key={d.id} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md font-medium shadow-sm" title="Draft created">
                                {d.name} (Draft)
                            </span>
                        ))}
                        {data.missing.map(d => (
                            <span key={d.id} className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md font-medium shadow-sm" title="Not started">
                                {d.name} (Missing)
                            </span>
                        ))}
                        {(data.draft.length + data.missing.length) === 0 && <span className="text-[11px] text-gray-400 italic">None pending</span>}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionStatusWidget;
