import React from 'react';

interface ManifestRow {
    id: string;
    name: string;
    region: string;
    logoUrl?: string;
    createdAt: string;
    stats: {
        users: number;
        members: number;
        events: number;
        totalRecords: number;
    };
}

interface ManifestsTableProps {
    manifests: ManifestRow[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onCreateClick: () => void;
    onRowClick: (id: string) => void;
}

const ManifestAvatar: React.FC<{ name: string; logoUrl?: string }> = ({ name, logoUrl }) => {
    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={name}
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
            />
        );
    }
    // Fallback: initials
    const initials = name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border-2 border-orange-100">
            {initials}
        </div>
    );
};

const ManifestsTable: React.FC<ManifestsTableProps> = ({
    manifests,
    searchQuery,
    onSearchChange,
    onCreateClick,
    onRowClick,
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">All Manifests ({manifests.length})</h3>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 w-60 transition-all"
                            placeholder="Search manifests..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <button
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-400 hover:to-orange-500 transition-all shadow-sm"
                        onClick={onCreateClick}
                    >
                        + Create Manifest
                    </button>
                </div>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Manifest</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Region</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Users</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Members</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Events</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Data Usage</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {manifests.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center text-gray-400 py-12 text-sm">
                                {searchQuery ? 'No manifests match your search' : 'No manifests found'}
                            </td>
                        </tr>
                    ) : (
                        manifests.map((manifest) => (
                            <tr key={manifest.id} onClick={() => onRowClick(manifest.id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <ManifestAvatar name={manifest.name} logoUrl={manifest.logoUrl} />
                                        <span className="text-sm font-semibold text-gray-900">{manifest.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">{manifest.region}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{manifest.stats.users.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{manifest.stats.members.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{manifest.stats.events.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-emerald-600">{manifest.stats.totalRecords.toLocaleString()} rows</td>
                                <td className="px-6 py-4 text-sm text-gray-400">{manifest.createdAt ? new Date(manifest.createdAt).toLocaleDateString() : '—'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ManifestsTable;
