/**
 * CoordinatorMembersTab
 *
 * Community members roster for the coordinator's assigned residence.
 * Consumes shared state via useResidentCoordinator() — no props.
 */

import React from 'react';
import { useResidentCoordinator } from '../ResidentCoordinatorContext';
import { Users } from 'lucide-react';

const CoordinatorMembersTab: React.FC = () => {
    const { members, myResidence } = useResidentCoordinator();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center text-lg">
                    <Users className="w-5 h-5 mr-2 text-gray-500" />
                    Residence Roster
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                    {members.length} Total
                </span>
            </div>

            {members.length > 0 ? (
                <div className="divide-y divide-gray-100">
                    {members.map((m, idx) => (
                        <div key={m.id || idx} className="p-4 md:p-6 hover:bg-orange-50/30 transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600 shadow-sm text-lg">
                                    {m.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{m.name}</h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                        <span>{m.phone || 'No phone number'}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            {m.category || 'Member'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">No Members Added Yet</h4>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                        Members assigned to {myResidence?.name} by administrators will appear here.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CoordinatorMembersTab;
