import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserStore } from '../database/userStore';
import { useNotification } from './ui/NotificationSystem';
import { Edit2, Lock, X } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser }) => {
    const { showToast } = useNotification();
    const [profileName, setProfileName] = useState("");
    const [profileUsername, setProfileUsername] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUser && isOpen) {
            setProfileName(currentUser.name || "");
            setProfileUsername(currentUser.username || "");
            setProfileEmail(currentUser.email || "");
            setCurrentPassword("");
            setNewPassword("");
        }
    }, [currentUser, isOpen]);

    if (!isOpen || !currentUser) return null;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!profileName.trim()) {
            showToast("Name cannot be empty.", 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            const updatedProfile: User = {
                ...currentUser,
                name: profileName,
                username: profileUsername,
                email: profileEmail
            };

            if (newPassword) {
                if (!currentPassword) {
                    showToast("Please enter your current password to confirm changes.", 'error');
                    return;
                }
                updatedProfile.password = newPassword;
            }

            const response = await UserStore.update(updatedProfile);

            if (response.status === 'success') {
                showToast("Profile credentials updated successfully!", 'success');
                UserStore.saveSession(updatedProfile);
                onClose();
            } else {
                showToast(response.message || "Failed to update profile.", 'error');
            }
        } catch (err: any) {
            showToast(err.message || "An error occurred.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-ministry-card w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
                    <h3 className="text-xl font-bold text-gray-800">Profile Settings</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-8 bg-white max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Full Name</label>
                                <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange outline-none" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Username</label>
                                <input value={profileUsername} onChange={e => setProfileUsername(e.target.value.replace(/\s+/g, ''))} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange outline-none" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Email</label>
                                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange outline-none" />
                            </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-gray-100">
                            <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase flex items-center"><Lock className="w-4 h-4 mr-2" /> Change Password</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Current Password</label>
                                    <input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">New Password</label>
                                    <input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-6 py-3 rounded-xl font-bold bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 mr-4 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className={`flex items-center space-x-2 bg-ministry-text text-white px-8 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <Edit2 className="w-4 h-4" />
                                <span>{isSubmitting ? 'Updating...' : 'Update Profile'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
