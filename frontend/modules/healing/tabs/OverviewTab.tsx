import React from 'react';
import { FileText, Heart, Activity } from 'lucide-react';
import { useHealing } from '../HealingContext';

export const OverviewTab: React.FC = () => {
    const { stats, reports } = useHealing();

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">

            {/* Summary cards — 2-col on mobile, 3-col on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                            <FileText className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-gray-500 font-medium text-sm">Total Reports</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalReports}</p>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl shrink-0">
                            <Heart className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-gray-500 font-medium text-sm">Souls Won</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalSouls}</p>
                </div>

                <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 md:p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                            <Activity className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-gray-500 font-medium text-sm">Testimonies</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalTestimonies}</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">Recent Activity</h3>
                </div>
                {reports.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No reports yet.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {reports.slice(0, 5).map(r => (
                            <div key={r.id} className="flex justify-between items-center px-4 md:px-6 py-3 hover:bg-gray-50/60 transition-colors">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm md:text-base">{r.hospital_name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(r.date).toLocaleDateString()} · {r.labourers_count} Labourers</p>
                                </div>
                                <span className="text-base md:text-lg font-black text-green-600 shrink-0 ml-3">{r.souls_count} <span className="text-xs font-bold text-green-500">Souls</span></span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
