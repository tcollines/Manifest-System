import React from 'react';
import { FileText, Heart, Activity } from 'lucide-react';
import { useHealing } from '../HealingContext';

export const OverviewTab: React.FC = () => {
    const { stats, reports } = useHealing();
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-4 mb-2">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={24} /></div>
                        <h3 className="text-gray-500 font-medium">Total Reports</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalReports}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-4 mb-2">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Heart size={24} /></div>
                        <h3 className="text-gray-500 font-medium">Souls Won</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalSouls}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-4 mb-2">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Activity size={24} /></div>
                        <h3 className="text-gray-500 font-medium">Testimonies</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{stats.totalTestimonies}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                {reports.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No reports yet.</div>
                ) : (
                    <div className="space-y-4">
                        {reports.slice(0, 5).map(r => (
                            <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <h4 className="font-bold text-gray-800">{r.hospital_name}</h4>
                                    <p className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()} • {r.labourers_count} Labourers</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-green-600">{r.souls_count} Souls</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
