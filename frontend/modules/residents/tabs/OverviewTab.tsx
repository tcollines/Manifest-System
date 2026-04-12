import React from 'react';
import { MapPin, Users, Activity } from 'lucide-react';
import { useResidentContext } from '../ResidentContext';

const OverviewTab: React.FC = () => {
    const { reports, residences } = useResidentContext();

    const totalSoulsWon = reports.reduce((sum, r: any) => sum + (r.soulsWon || r.souls_won || 0), 0);
    const totalResidences = residences.length;
    const recentReports = reports.slice(0, 5);

    return (
        <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-blue-100 p-3 rounded-lg mr-4">
                                <MapPin className="text-blue-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Target Residences</p>
                                <h3 className="text-2xl font-bold">{totalResidences}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-green-100 p-3 rounded-lg mr-4">
                                <Users className="text-green-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Total Souls Won</p>
                                <h3 className="text-2xl font-bold">{totalSoulsWon}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-purple-100 p-3 rounded-lg mr-4">
                                <Activity className="text-purple-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Total Outreach Reports</p>
                                <h3 className="text-2xl font-bold">{reports.length}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-semibold mb-4 text-ministry-text">Recent Outreach</h2>
                        {recentReports.length > 0 ? (
                            <div className="space-y-4">
                                {recentReports.map(report => (
                                    <div key={report.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {residences.find(r => r.id === report.residenceId)?.name || 'Unknown Residence'}
                                            </h4>
                                            <p className="text-sm text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {report.soulsWon} souls won
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No recent outreach reports found.</p>
                        )}
                    </div>
                </div>
    );
};

export default OverviewTab;
