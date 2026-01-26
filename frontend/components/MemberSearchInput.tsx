import React, { useState, useEffect } from 'react';
import { Search, Check, Plus } from 'lucide-react';
import { Member } from '../types';

interface MemberSearchInputProps {
    onSearch: (term: string) => void;
    onSelectMember: (member: Member) => void;
    onAddNew: () => void;
    isSearching: boolean;
    searchResults: Member[];
}

const MemberSearchInput: React.FC<MemberSearchInputProps> = ({
    onSearch,
    onSelectMember,
    onAddNew,
    isSearching,
    searchResults
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            onSearch(searchTerm);
        }, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchTerm, onSearch]);

    return (
        <div className="max-w-xl mx-auto space-y-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all shadow-sm"
                    placeholder="Search member by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            {searchTerm.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {isSearching ? (
                        <div className="p-6 text-center text-gray-400">Searching database...</div>
                    ) : searchResults.length > 0 ? (
                        <>
                            {searchResults.map(member => (
                                <div key={member.id} className="p-4 flex flex-row justify-between items-center gap-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 truncate">{member.name}</p>
                                            {member.status === 'Checked In' && (
                                                <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                                    <Check className="w-3 h-3 mr-1" /> Checked In
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{member.phone} • {member.residency || 'No Residence'}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            onSelectMember(member);
                                        }}
                                        className="bg-ministry-text text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors shadow-sm"
                                    >
                                        Record Soul
                                    </button>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            <p className="mb-2">No members found.</p>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    onAddNew();
                                }}
                                className="text-ministry-orange font-bold hover:underline"
                            >
                                Add New Soul Manually
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MemberSearchInput;
