import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { UserStore } from '../database/userStore';
import { Save, Loader2, ShieldCheck, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react';
import { DEPARTMENTS } from '../constants';

interface SetupAccountProps {
    currentUser: User;
    onComplete: (updatedUser: User) => void;
    onLogout: () => void;
}

const SetupAccount: React.FC<SetupAccountProps> = ({ currentUser, onComplete, onLogout }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isGoogleUser, setIsGoogleUser] = useState(false);

    useEffect(() => {
        // Detect if the current session was created via Google OAuth
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            const provider = session.user?.app_metadata?.provider;
            const providers = session.user?.app_metadata?.providers;
            const isGoogle = provider === 'google' || (Array.isArray(providers) && providers.includes('google'));
            setIsGoogleUser(!!isGoogle);
        });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (e.target.name === 'username') {
            value = value.replace(/\s+/g, '');
        }
        setFormData({ ...formData, [e.target.name]: value });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isGoogleUser) {
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match.");
                return;
            }

            if (formData.password.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
            }
        }

        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 0. Check for username uniqueness
            const usersResp = await UserStore.getAll();
            if (usersResp.status === 'success' && usersResp.data) {
                const isTaken = usersResp.data.some(u =>
                    u.username?.toLowerCase() === formData.username.toLowerCase() &&
                    u.id !== currentUser.id
                );
                if (isTaken) {
                    setError(`The username "${formData.username}" is already taken. Please choose another.`);
                    setIsSubmitting(false);
                    return;
                }
            }

            // 1. Update Supabase Auth Password (skipped for Google OAuth users)
            if (!isGoogleUser && formData.password) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.password
                });
                if (authError) throw authError;
            }

            // 2. Update User Profile in Database
            const updatedUser: User = {
                ...currentUser,
                username: formData.username,
                // Only update password field for non-Google users
                ...(isGoogleUser ? {} : { password: formData.password }),
                status: 'Active' // Mark as active once setup is complete
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
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-ministry-neon/10 blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-ministry-orange/10 blur-[100px]"></div>
            </div>

            <div className="bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">

                {/* Header */}
                <div className="bg-black/40 p-10 text-center border-b border-white/5">
                    <div className="w-20 h-20 bg-black/50 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-lg ring-1 ring-white/5">
                        <ShieldCheck className="w-10 h-10 text-ministry-orange" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to Manifest</h2>
                    <p className="text-gray-400 font-light">Let's set up your account details.</p>
                </div>

                {/* Form */}
                <div className="p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-center animate-pulse">
                            <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Pre-filled Info Section */}
                        <div className="bg-white/5 p-5 rounded-xl border border-white/10 space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Account Details</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Full Name</label>
                                    <p className="text-sm font-semibold text-white truncate">{currentUser.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Email</label>
                                    <p className="text-sm font-semibold text-white truncate" title={currentUser.email}>{currentUser.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Role</label>
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-ministry-orange/20 text-ministry-orange text-[10px] font-bold uppercase tracking-wide border border-ministry-orange/20">
                                        {currentUser.role}
                                    </span>
                                </div>
                                {currentUser.departmentId && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Department</label>
                                        <p className="text-sm font-semibold text-white">
                                            {DEPARTMENTS.find(d => d.id === currentUser.departmentId || d.slug === currentUser.departmentId || d.code === currentUser.departmentId)?.name || currentUser.departmentId}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Choose a Username</label>
                            <div className="relative group">
                                <input
                                    name="username"
                                    type="text"
                                    autoComplete="off"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all"
                                    placeholder="jdoe"
                                    required
                                />
                                <UserIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-ministry-orange" />
                            </div>
                        </div>

                        {/* Password fields — hidden for Google OAuth users */}
                        {!isGoogleUser && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Create Password</label>
                                    <div className="relative group">
                                        <input
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all font-medium"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-ministry-orange" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <input
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all font-medium"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-ministry-orange" />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {isGoogleUser && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-blue-300 text-xs">
                                <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
                                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                                </svg>
                                You're signed in with Google — no password needed.
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-ministry-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center shadow-lg shadow-orange-500/20"
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

                            <button
                                type="button"
                                onClick={onLogout}
                                className="w-full py-3 bg-transparent text-gray-400 font-medium rounded-xl hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetupAccount;
