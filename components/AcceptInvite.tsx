import React, { useState, useEffect } from 'react';
import { UserStore } from '../database/userStore';
import { User } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User as UserIcon, CheckCircle, AlertTriangle } from 'lucide-react';

const AcceptInvite: React.FC = () => {
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
            if (!token) {
                setError('Invalid invitation link.');
                setLoading(false);
                return;
            }
            const foundUser = await UserStore.getUserByToken(token);
            if (foundUser) {
                setUser(foundUser);
            } else {
                setError('Invitation not found or expired.');
            }
            setLoading(false);
        };
        fetchUser();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
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
            alert("Account setup successful! You can now sign in.");
            navigate('/');
        } catch (err: any) {
            alert("Failed to setup account: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-ministry-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Error</h2>
                    <p className="text-gray-500 mb-6">{error || 'Something went wrong.'}</p>
                    <button onClick={() => navigate('/')} className="bg-ministry-text text-white px-6 py-2 rounded-xl font-bold">Go to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl transform transition-all animate-in fade-in zoom-in-95">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-ministry-text mb-2">Welcome!</h1>
                    <p className="text-gray-500">
                        Complete your setup for <span className="font-bold text-gray-800">{user.name}</span>
                    </p>
                    <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                        {user.role}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Choose Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                required
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-ministry-orange outline-none transition-colors"
                                placeholder="jdoe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Set Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                required
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-ministry-orange outline-none transition-colors"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                required
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-ministry-orange outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-ministry-text text-white py-3 rounded-xl font-bold text-lg hover:bg-ministry-orange transition-colors shadow-lg flex items-center justify-center space-x-2"
                    >
                        {isSubmitting ? 'Setting up...' : (
                            <>
                                <CheckCircle className="w-5 h-5" />
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
