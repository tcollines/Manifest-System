import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getManifestById, getManifestUsers, updateManifest } from '../services/adminApi';

interface ManifestDetail {
    id: string; name: string; region: string; contact: string; address: string;
    description: string; currency: string; logoUrl?: string; coordinates: any; soulsTarget: number; createdAt: string;
    stats: { users: number; members: number; events: number; souls: number; children: number; passengers: number; totalRecords: number; };
}

interface ManifestUser {
    id: string; name: string; role: string; email: string; username: string; contact: string; status: string; created_at: string;
}

const ManifestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [manifest, setManifest] = useState<ManifestDetail | null>(null);
    const [users, setUsers] = useState<ManifestUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');

    // Logo upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [manifestData, usersData] = await Promise.all([getManifestById(id), getManifestUsers(id)]);
                setManifest(manifestData);
                setUsers(usersData || []);
                setLogoPreview(manifestData?.logoUrl || null);
            } catch (err: any) { console.error('[ManifestDetail] Fetch error:', err); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [id]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id || !manifest) return;

        // Preview immediately
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);

        // Upload as base64 URL (store directly for simplicity)
        setLogoUploading(true);
        try {
            const base64Reader = new FileReader();
            base64Reader.onloadend = async () => {
                const base64 = base64Reader.result as string;
                await updateManifest(id, { logoUrl: base64 });
                setManifest(prev => prev ? { ...prev, logoUrl: base64 } : prev);
                setLogoUploading(false);
            };
            base64Reader.readAsDataURL(file);
        } catch (err) {
            console.error('Logo upload failed:', err);
            setLogoUploading(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="ac-spinner"></div></div>;

    if (!manifest) return (
        <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-gray-500 mb-3">Manifest Not Found</h2>
            <button className="text-sm text-orange-500 hover:text-orange-600 font-medium" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        </div>
    );

    const stats = [
        { label: 'Users', value: manifest.stats.users },
        { label: 'Members', value: manifest.stats.members },
        { label: 'Events', value: manifest.stats.events },
        { label: 'Souls Won', value: manifest.stats.souls },
        { label: 'Next Gen', value: manifest.stats.children },
        { label: 'Total Records', value: manifest.stats.totalRecords },
    ];

    const initials = manifest.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            <button className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors" onClick={() => navigate('/dashboard')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                Back to Dashboard
            </button>

            {/* Header with Logo */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    {/* Circular Logo */}
                    {logoPreview ? (
                        <img src={logoPreview} alt={manifest.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shadow-sm" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-lg font-bold border-2 border-orange-100 shadow-sm">
                            {initials}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{manifest.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">{manifest.region}</span>
                            <span className="text-sm text-gray-400">{manifest.currency} · Created {new Date(manifest.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all">
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
                        <div className="text-2xl font-extrabold text-gray-900">{stat.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['overview', 'users', 'settings'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'users' ? `Users (${manifest.stats.users})` : tab === 'settings' ? 'Manifest Settings' : tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Manifest Information</h4>
                        {[['Name', manifest.name], ['Region', manifest.region], ['Contact', manifest.contact || '—'], ['Address', manifest.address || '—'], ['Currency', manifest.currency]].map(([label, value]) => (
                            <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                                <span className="text-xs text-gray-400">{label}</span>
                                <span className="text-sm font-semibold text-gray-900">{value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Usage Breakdown</h4>
                        {[['Users', manifest.stats.users], ['Members', manifest.stats.members], ['Events', manifest.stats.events], ['Souls Won', manifest.stats.souls], ['Next Gen', manifest.stats.children], ['Passengers', manifest.stats.passengers]].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                                <span className="text-xs text-gray-400">{label}</span>
                                <span className="text-sm font-semibold text-gray-900">{(value as number).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                            <span className="text-xs font-semibold text-gray-900">Total Records</span>
                            <span className="text-sm font-bold text-orange-500">{manifest.stats.totalRecords.toLocaleString()}</span>
                        </div>
                    </div>

                    {manifest.description && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Description</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{manifest.description}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                {['Name','Role','Username','Email','Contact','Status','Created'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.length === 0 ? (
                                <tr><td colSpan={7} className="text-center text-gray-400 py-12 text-sm">No users found for this manifest</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700">{user.role}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.username || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.email || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.contact || '—'}</td>
                                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{user.status || 'Unknown'}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl">
                    <div className="bg-white rounded-xl border border-gray-200 p-8">
                        <h3 className="text-base font-semibold text-gray-900 mb-6">Manifest Settings</h3>

                        {/* Logo Upload */}
                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                            <div className="relative group">
                                {logoPreview ? (
                                    <img src={logoPreview} alt={manifest.name} className="w-24 h-24 rounded-full object-cover border-[3px] border-gray-200 shadow-md" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold border-[3px] border-orange-100 shadow-md">
                                        {initials}
                                    </div>
                                )}
                                {/* Upload overlay */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={logoUploading}
                                    className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                    {logoUploading ? (
                                        <div className="ac-spinner" style={{ width: 24, height: 24, borderWidth: 2 }}></div>
                                    ) : (
                                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">Manifest Logo</h4>
                                <p className="text-xs text-gray-400 mt-1">Upload a circular logo for this manifest. Recommended: 200×200px, JPG or PNG.</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={logoUploading}
                                    className="mt-3 px-4 py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {logoUploading ? 'Uploading...' : 'Upload Photo'}
                                </button>
                            </div>
                        </div>

                        {/* Manifest Name */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Manifest Name</label>
                                <div className="text-lg font-bold text-gray-900">{manifest.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Region</label>
                                    <div className="text-sm text-gray-700">{manifest.region}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Currency</label>
                                    <div className="text-sm text-gray-700">{manifest.currency}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contact</label>
                                    <div className="text-sm text-gray-700">{manifest.contact || '—'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                                    <div className="text-sm text-gray-700">{manifest.address || '—'}</div>
                                </div>
                            </div>
                            {manifest.description && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                                    <div className="text-sm text-gray-700">{manifest.description}</div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Created</label>
                                <div className="text-sm text-gray-700">{new Date(manifest.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ManifestDetailPage;
