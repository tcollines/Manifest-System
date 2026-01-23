import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { UserStore } from '../database/userStore';
import { User } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User as UserIcon, ShieldCheck, AlertTriangle, Loader2, Save } from 'lucide-react';

const AcceptInvite: React.FC = () => {
    const { showToast } = useNotification();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            console.log("AcceptInvite: Checking token:", token);
            if (!token) {
                setError('Invalid invitation link (No token provided).');
                setLoading(false);
                return;
            }
            try {
                const foundUser = await UserStore.getUserByToken(token);
                console.log("AcceptInvite: foundUser:", foundUser);
                if (foundUser) {
                    setUser(foundUser);
                } else {
                    setError('Invitation not found or expired.');
                }
            } catch (err: any) {
                console.error("AcceptInvite: Error fetching user", err);
                setError('System error verifying invitation.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showToast("Passwords do not match!", 'error');
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            // Update User: Set credentials, Clear Token, Set Active
            const updatedUser: User = {
                ...user,
                username: formData.username,
                password: formData.password, // Ideally hashed, but following existing pattern
                invitationToken: '', // Clear token
                status: 'Active'
            };

            await UserStore.update(updatedUser);
            showToast("Account setup successful! You can now sign in.", 'success');
            navigate('/');
        } catch (err: any) {
            showToast("Failed to setup account: " + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-ministry-orange animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Verifying invitation...</p>
                    <p className="text-xs text-gray-600 mt-2 font-mono">Token: {token?.substring(0, 8)}...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-10 rounded-3xl shadow-2xl text-center relative overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
                        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent"></div>
                    </div>

                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/20 z-10 relative">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 z-10 relative">Invitation Error</h2>
                    <p className="text-gray-400 mb-6 z-10 relative">{error}</p>
                    {token && <p className="text-xs text-gray-600 font-mono mb-6 truncate z-10 relative">Token: {token}</p>}
                    <button onClick={() => navigate('/')} className="z-10 relative bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all border border-white/5">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-ministry-neon/10 blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-ministry-orange/10 blur-[100px]"></div>
            </div>

            <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur-md border border-white/10 p-10 rounded-3xl shadow-2xl transform transition-all animate-in fade-in zoom-in-95 relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome!</h1>
                    <div className="space-y-4 mt-6">
                        <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-left">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Account Details</p>
                            <h2 className="text-xl font-bold text-white mb-2">{user.name}</h2>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-ministry-orange/20 text-ministry-orange text-[10px] font-bold uppercase tracking-wide border border-ministry-orange/20">
                                    {user.role}
                                </span>
                                {user.departmentId && (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wide border border-purple-500/20">
                                        Dept: {user.departmentId}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1 pt-3 border-t border-white/10">
                                <p className="text-sm text-gray-300 flex justify-between"><span className="text-gray-500">Email:</span> <span>{user.email}</span></p>
                                <p className="text-sm text-gray-300 flex justify-between"><span className="text-gray-500">Contact:</span> <span>{user.contact}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Choose Username</label>
                        <div className="relative group">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-ministry-orange" />
                            <input
                                required
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all"
                                placeholder="jdoe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Set Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-ministry-orange" />
                            <input
                                required
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1">Confirm Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-ministry-orange" />
                            <input
                                required
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full pl-10 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-ministry-orange/50 focus:ring-1 focus:ring-ministry-orange/50 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-ministry-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center shadow-lg shadow-orange-500/20 mt-4"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                <span>Setting up...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-2" />
                                <span>Complete Setup</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvite;
