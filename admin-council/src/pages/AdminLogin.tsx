import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminLogin: React.FC = () => {
    const { login } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await login(email.trim(), password);

        if (!result.success) {
            setError(result.error || 'Invalid credentials');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans bg-black">
            {/* Background */}
            <div className="absolute inset-0 z-0 bg-zinc-900">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, rgba(14,83,14,0.80) 0%, rgba(0,0,0,0.95) 100%)',
                        mixBlendMode: 'multiply',
                    }}
                />
            </div>

            {/* Abstract Shapes */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-[#c8ff00]/10" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] bg-orange-400/10" />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-5xl h-auto md:h-[600px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden">
                {/* Left Side - Branding */}
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-between text-white relative bg-black/40">
                    <div className="absolute top-0 left-12 w-px h-32 bg-gradient-to-b from-[#c8ff00]/50 to-transparent" />
                    <div className="absolute top-0 left-16 w-px h-20 bg-gradient-to-b from-orange-400/50 to-transparent" />

                    {/* Brand Logo */}
                    <div className="flex items-center space-x-3 mb-8 md:mb-0">
                        <div className="p-2 rounded-xl backdrop-blur-md shadow-lg bg-[#c8ff00] shadow-[#c8ff00]/20">
                            <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                            </svg>
                        </div>
                        <span className="font-bold text-xl tracking-widest uppercase text-white/90">Manifest</span>
                    </div>

                    {/* Hero Text */}
                    <div className="my-auto relative z-10">
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">Admin Council</h1>
                        <div className="w-16 h-1.5 bg-gradient-to-r from-orange-500 to-[#c8ff00] mb-6 rounded-full" />
                        <p className="text-white/80 text-lg leading-relaxed max-w-sm font-light">
                            System Oversight Panel.
                            <br />
                            <span className="text-sm opacity-60 mt-2 block">Manage manifests, monitor regions, track users, and oversee system-wide operations from one unified command center.</span>
                        </p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full md:w-1/2 relative flex items-center justify-center p-8 md:p-12 bg-black/60">
                    <div className="w-full max-w-sm relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-2 text-center">Sign in</h2>
                        <div className="flex justify-center mb-8">
                            <div className="w-12 h-1 rounded-full bg-orange-500" />
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center backdrop-blur-sm">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-orange-500 transition-all font-medium"
                                    placeholder="admin@manifestms.com"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-orange-500 transition-all font-medium pr-12"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-4 text-white rounded-full font-bold text-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex items-center justify-center group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-900/20"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Authenticating...
                                    </span>
                                ) : (
                                    <>
                                        Submit
                                        <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
