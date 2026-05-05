import React from 'react';
import { MapPin, Users, Activity } from 'lucide-react';
import { useResidentContext } from '../ResidentContext';

const OverviewTab: React.FC = () => {
    const { reports, residences } = useResidentContext();

    const totalSoulsWon = reports.reduce((sum, r: any) => sum + (r.soulsWon || r.souls_won || 0), 0);
    const totalResidences = residences.length;
    const recentReports = reports.slice(0, 5);

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">

            {/* Summary cards — 2-col mobile, 3-col desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 md:p-3 rounded-lg shrink-0">
                        <MapPin className="text-blue-600 w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs md:text-sm leading-tight">Target Residences</p>
                        <h3 className="text-2xl md:text-3xl font-black">{totalResidences}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="bg-green-100 p-2 md:p-3 rounded-lg shrink-0">
                        <Users className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs md:text-sm leading-tight">Total Souls Won</p>
                        <h3 className="text-2xl md:text-3xl font-black">{totalSoulsWon}</h3>
                    </div>
                </div>

                {/* Full-width on mobile to avoid orphan on 2-col grid */}
                <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="bg-purple-100 p-2 md:p-3 rounded-lg shrink-0">
                        <Activity className="text-purple-600 w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs md:text-sm leading-tight">Total Outreach Reports</p>
                        <h3 className="text-2xl md:text-3xl font-black">{reports.length}</h3>
                    </div>
                </div>
            </div>

            {/* Recent Outreach */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-50">
                    <h2 className="text-base md:text-xl font-semibold text-ministry-text">Recent Outreach</h2>
                </div>
                {recentReports.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {recentReports.map(report => (
                            <div key={report.id} className="flex justify-between items-center px-4 md:px-6 py-3 hover:bg-gray-50/60 transition-colors">
                                <div>
                                    <h4 className="font-medium text-sm md:text-base text-gray-900">
                                        {residences.find(r => r.id === report.residenceId)?.name || 'Unknown Residence'}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(report.date).toLocaleDateString()}</p>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 shrink-0 ml-3">
                                    {report.soulsWon} souls won
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm px-4 md:px-6 py-6">No recent outreach reports found.</p>
                )}
            </div>
        </div>
    );
};

export default OverviewTab;
