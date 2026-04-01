import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Soul } from '../../types';

interface SoulsTabProps {
    allSouls: Soul[];
    setEditingSoul: (soul: Soul) => void;
    handleDeleteSoul: (id: string) => void;
}

export const SoulsTab: React.FC<SoulsTabProps> = ({ allSouls, setEditingSoul, handleDeleteSoul }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Souls Won via Healing Dept</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date Joined</th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Phone</th>
                            <th className="px-6 py-4 font-medium">Gender</th>
                            <th className="px-6 py-4 font-medium">Hospital</th>
                            <th className="px-6 py-4 font-medium">Next of Kin</th>
                            <th className="px-6 py-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {allSouls.map((soul) => (
                            <tr key={soul.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-600">{new Date(soul.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-semibold text-gray-900">{soul.first_name} {soul.last_name}</td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{soul.phone}</td>
                                <td className="px-6 py-4 text-gray-600">{soul.gender}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm italic">{soul.notes?.replace('Healing Outreach: ', '') || '-'}</td>
                                <td className="px-6 py-4 text-sm">
                                    {soul.next_of_kin_name ? (
                                        <div>
                                            <div className="font-medium text-gray-800">{soul.next_of_kin_name}</div>
                                            <div className="text-xs text-blue-600">{soul.next_of_kin_contact}</div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 flex space-x-2">
                                    <button
                                        onClick={() => setEditingSoul(soul)}
                                        className="p-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => soul.id && handleDeleteSoul(soul.id)}
                                        className="p-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {allSouls.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No souls found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
