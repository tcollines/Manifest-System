import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { UserStore } from '../database/userStore';
import { Save, Loader2, ShieldCheck, User as UserIcon, Lock } from 'lucide-react';

interface SetupAccountProps {
    currentUser: User;
    onComplete: (updatedUser: User) => void;
}

const SetupAccount: React.FC<SetupAccountProps> = ({ currentUser, onComplete }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Update Supabase Auth Password
            const { error: authError } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (authError) throw authError;

            // 2. Update User Profile in Database
            const updatedUser: User = {
                ...currentUser,
                username: formData.username,
                password: formData.password // Keeping legacy field for now as per system design
            };

            await UserStore.update(updatedUser);

            // 3. Complete Setup
            onComplete(updatedUser);

        } catch (err: any) {
            console.error("Setup Error:", err);
            setError(err.message || "Failed to setup account.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">

                {/* Header */}
                <div className="bg-ministry-dark p-8 text-center border-b border-gray-800">
                    <div className="w-16 h-16 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-ministry-orange/20">
                        <ShieldCheck className="w-8 h-8 text-ministry-orange" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to Manifest!</h2>
                    <p className="text-gray-400">Let's set up your account details.</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Pre-filled Info Section */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Account Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
                                    <p className="text-sm font-semibold text-gray-800">{currentUser.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                                    <p className="text-sm font-semibold text-gray-800">{currentUser.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Role</label>
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-ministry-orange/10 text-ministry-orange text-xs font-bold">
                                        {currentUser.role}
                                    </span>
                                </div>
                                {currentUser.departmentId && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1">Department</label>
                                        <p className="text-sm font-semibold text-gray-800">{currentUser.departmentId}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Choose a Username</label>
                            <div className="relative">
                                <input
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:border-opacity-50 focus:ring-1 focus:ring-ministry-orange transition-all"
                                    placeholder="jdoe"
                                    required
                                />
                                <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Create Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-ministry-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center shadow-lg shadow-orange-500/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Complete Setup
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetupAccount;
