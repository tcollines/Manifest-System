import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { DEPARTMENTS, CURRENCIES } from '../constants';
import { User, ModalType, ManifestDetails } from '../types';
import { ManifestStore } from '../database/manifestStore';
import {
    Users,
    Map,
    Shield,
    Save,
    Plus,
    Trash2,
    Edit2,
    Upload,
    Check,
    MapPin,
    Lock,
    Phone,
    FileText,
    Image,
    Globe,
    Coins
} from 'lucide-react';

type SettingsTab = 'users' | 'map' | 'profile' | 'manifest';

interface SettingsViewProps {
    users?: User[];
    openModal?: (type: ModalType) => void;
    onDeleteUser?: (id: string) => void;
    onEditUser?: (user: User) => void;
    currentUser?: User | null;
    initialTab?: SettingsTab;
}

const SettingsView: React.FC<SettingsViewProps> = ({ users = [], openModal, onDeleteUser, onEditUser, currentUser, initialTab }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'users');

    // Profile State
    const [profileName, setProfileName] = useState("James McGill");
    const [profileEmail, setProfileEmail] = useState("james.mcgill@ministry.org");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // Manifest State
    const [manifestData, setManifestData] = useState<ManifestDetails>({
        name: '', contact: '256', address: '', description: '', logoUrl: '', coordinates: { lat: 0, lng: 0 }, currency: 'UGX'
    });

    const isAdmin = currentUser?.role === 'Administrator';
    const isTeamLeader = currentUser?.role === 'TeamLeader';

    // Determine view mode
    const isManifestMode = isTeamLeader && initialTab === 'manifest';

    useEffect(() => {
        const loadManifest = async () => {
            const data = await ManifestStore.get();
            // Ensure defaults to 256 if empty on load
            if (!data.contact) data.contact = '256';
            setManifestData(data);
        };
        loadManifest();
    }, []);

    // Filter users: Admins/Team Leaders see all, Leads see only their department
    const filteredUsers = (isAdmin || isTeamLeader)
        ? users
        : users.filter(u => u.departmentId === currentUser?.departmentId);

    // Helper for contact validation
    const validateContact = (val: string) => {
        let digits = val.replace(/\D/g, '');
        if (digits.length > 13) digits = digits.slice(0, 13);
        if (digits.length > 0 && !digits.startsWith('256')) {
            return '256';
        }
        return digits;
    };

    const handleDeleteClick = async (id: string) => {
        if (await askConfirm("Delete User?", 'Are you sure you want to remove this user? This action cannot be undone.')) {
            if (onDeleteUser) onDeleteUser(id);
            showToast("User deleted.", 'success');
        }
    };

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        showToast("Profile credentials updated successfully!", 'success');
        setCurrentPassword("");
        setNewPassword("");
    };

    const handleShapefileUpload = () => {
        showToast("Shapefile uploaded successfully! The Manifest Coverage Map on the dashboard has been updated.", 'success');
    };

    const handleSaveManifest = async (e: React.FormEvent) => {
        e.preventDefault();
        await ManifestStore.save(manifestData);
        showToast("Manifest details updated successfully!", 'success');
    };

    const handleGPSCapture = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                setManifestData({ ...manifestData, coordinates: { lat: latitude, lng: longitude } });
                showToast(`Coordinates captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
            }, (err) => {
                showToast("Unable to retrieve location. Please ensure location services are enabled.", 'error');
            });
        } else {
            showToast("Geolocation is not supported by this browser.", 'error');
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setManifestData({ ...manifestData, logoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    // --- MANIFEST MODE (Full Page for Team Leader via Dashboard) ---
    if (isManifestMode) {
        return (
            <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-ministry-text flex items-center">
                        <FileText className="w-8 h-8 mr-3 text-ministry-orange" />
                        Manifest Configuration
                    </h1>
                    <p className="text-gray-500">Configure global ministry manifest details and location.</p>
                </div>

                <div className="bg-ministry-card border border-gray-200 rounded-2xl p-8 shadow-lg">
                    <form onSubmit={handleSaveManifest} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Manifest Name</label>
                                <input
                                    value={manifestData.name}
                                    onChange={e => setManifestData({ ...manifestData, name: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                    placeholder="e.g. Entebbe Manifest"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Contact Number</label>
                                <div className="relative">
                                    <input
                                        value={manifestData.contact}
                                        onChange={e => setManifestData({ ...manifestData, contact: validateContact(e.target.value) })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                        placeholder="256..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Physical Address</label>
                                <input
                                    value={manifestData.address}
                                    onChange={e => setManifestData({ ...manifestData, address: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                    placeholder="Plot No, Street, City"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center"><Coins className="w-4 h-4 mr-2" /> Operational Currency</label>
                                <select
                                    value={manifestData.currency}
                                    onChange={e => setManifestData({ ...manifestData, currency: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                >
                                    {CURRENCIES.map(curr => (
                                        <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Ministry Description</label>
                            <textarea
                                value={manifestData.description}
                                onChange={e => setManifestData({ ...manifestData, description: e.target.value })}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none h-32"
                                placeholder="Mission statement or description..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Ministry Logo</label>
                                <div className="flex items-center space-x-4">
                                    {manifestData.logoUrl && <img src={manifestData.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-gray-200" />}
                                    <input type="file" onChange={handleLogoUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ministry-orange file:text-white hover:file:bg-orange-600" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center justify-between">
                                    <span>Geolocation (GPS)</span>
                                    <button type="button" onClick={handleGPSCapture} className="text-xs text-ministry-orange flex items-center hover:underline"><MapPin className="w-3 h-3 mr-1" /> Capture Current Location</button>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input value={manifestData.coordinates?.lat} readOnly className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500" placeholder="Latitude" />
                                    <input value={manifestData.coordinates?.lng} readOnly className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500" placeholder="Longitude" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-8 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                <Save className="w-5 h-5" />
                                <span>Save Manifest Details</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text mb-1">Settings</h1>
                    <p className="text-gray-500">Manage system users, ministry profile, and map configurations.</p>
                </div>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'users' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-ministry-neon' : ''}`} />
                    <span>Team Members</span>
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Shield className={`w-4 h-4 ${activeTab === 'profile' ? 'text-ministry-neon' : ''}`} />
                    <span>My Profile</span>
                </button>
                {(isAdmin || isTeamLeader) && (
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'map' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Map className={`w-4 h-4 ${activeTab === 'map' ? 'text-ministry-neon' : ''}`} />
                        <span>Map Config</span>
                    </button>
                )}
            </div>

            {activeTab === 'users' && (
                <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">System Users</h3>
                        {openModal && (
                            <button
                                onClick={() => openModal(ModalType.CREATE_USER)}
                                className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add User</span>
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{user.name}</span>
                                            {user.email && <div className="text-xs text-gray-400">{user.email}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'Administrator' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'Head of Dept' ? 'bg-blue-100 text-blue-700' :
                                                    user.role === 'TeamLeader' ? 'bg-orange-100 text-orange-700' :
                                                        user.role === 'Reg. Admin' ? 'bg-indigo-100 text-indigo-700' :
                                                            user.role === 'Member' ? 'bg-green-100 text-green-700' :
                                                                'bg-gray-100 text-gray-600'
                                                }`}>{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {DEPARTMENTS.find(d => d.id === user.departmentId)?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{user.username}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditUser && onEditUser(user)} className="text-gray-400 hover:text-ministry-orange transition-colors p-2 hover:bg-orange-50 rounded-lg mr-2">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(user.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="max-w-2xl">
                    <div className="bg-ministry-card border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Profile Settings</h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                                    <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Email</label>
                                    <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase flex items-center"><Lock className="w-4 h-4 mr-2" /> Change Password</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Current Password</label>
                                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">New Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    <Edit2 className="w-4 h-4" />
                                    <span>Update Profile</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'map' && (isAdmin || isTeamLeader) && (
                <div className="max-w-3xl">
                    <div className="bg-ministry-card border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-blue-100 p-2 rounded-lg"><Map className="w-6 h-6 text-blue-600" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Map Configuration</h3>
                                <p className="text-sm text-gray-500">Upload Shapefiles for zone visualization</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:border-ministry-orange transition-colors cursor-pointer" onClick={handleShapefileUpload}>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="font-bold text-gray-700">Upload Zone Shapefile</h4>
                            <p className="text-sm text-gray-500 mt-2">Supports .shp, .kml, .geojson</p>
                            <button className="mt-6 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Select File</button>
                        </div>

                        <div className="mt-8 space-y-4">
                            <h4 className="font-bold text-gray-800 text-sm uppercase">Active Zones</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-xl">
                                    <span className="font-bold text-gray-700">Zone Alpha (North)</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Active</span>
                                </div>
                                <div className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-xl">
                                    <span className="font-bold text-gray-700">Zone Beta (South-West)</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;