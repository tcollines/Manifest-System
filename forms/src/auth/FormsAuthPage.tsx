import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, FileText,
  Mail, Lock, User, CheckCircle, AlertCircle, Loader2,
  LayoutDashboard, ChevronUp, Check,
} from 'lucide-react';
import { useFormsAuth } from '../context/FormsAuthContext';

// ─── Product Switcher Data (mirrors SignIn.tsx) ───────────────────────────────

type ProductId = 'manifest-management' | 'manifest-forms';

const PRODUCTS = [
  {
    id: 'manifest-management' as ProductId,
    name: 'Manifest Management',
    description: 'Streamline ministry operations',
    icon: <LayoutDashboard className="w-5 h-5" />,
    tint: 'green' as const,
  },
  {
    id: 'manifest-forms' as ProductId,
    name: 'Manifest Forms',
    description: 'Collect ministry data',
    icon: <FileText className="w-5 h-5" />,
    tint: 'orange' as const,
  },
];


// ─── Google icon SVG ──────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthTab = 'signin' | 'signup';

// ─── Password strength ────────────────────────────────────────────────────────

const strengthMap = (score: number) => ({
  label:  ['', 'Weak', 'Fair', 'Good', 'Strong'][score],
  color:  ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-400', 'bg-green-400'][score],
  text:   ['', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'][score],
});

function calcStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FormsAuthPage: React.FC = () => {
  const { formsUser, isLoading, signUpWithEmail, signInWithEmail, signInWithGoogle } = useFormsAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AuthTab>('signin');

  // Product switcher
  const activeProduct: ProductId = 'manifest-forms';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentProduct = PRODUCTS.find(p => p.id === activeProduct)!;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sign In
  const [siEmail, setSiEmail]       = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw]     = useState(false);
  const [siLoading, setSiLoading]   = useState(false);
  const [siError, setSiError]       = useState<string | null>(null);

  // Sign Up
  const [suName, setSuName]           = useState('');
  const [suEmail, setSuEmail]         = useState('');
  const [suPassword, setSuPassword]   = useState('');
  const [suConfirm, setSuConfirm]     = useState('');
  const [suShowPw, setSuShowPw]       = useState(false);
  const [suShowCf, setSuShowCf]       = useState(false);
  const [suLoading, setSuLoading]     = useState(false);
  const [suError, setSuError]         = useState<string | null>(null);

  // Google
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError]     = useState<string | null>(null);

  // Redirect once authenticated
  useEffect(() => {
    if (!isLoading && formsUser) navigate('/dashboard', { replace: true });
  }, [formsUser, isLoading, navigate]);

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setSiError(null); setSuError(null); setGoogleError(null);
  };

  const strength = calcStrength(suPassword);
  const { label: strLabel, color: strColor, text: strText } = strengthMap(strength);

  // ── Google Sign In ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.success && result.error !== 'cancelled') {
      setGoogleError(result.error ?? 'Google sign-in failed.');
    }
  };

  // ── Email Sign In ─────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiLoading(true); setSiError(null);
    const result = await signInWithEmail(siEmail, siPassword);
    setSiLoading(false);
    if (!result.success) setSiError(result.error ?? 'Sign in failed.');
  };

  // ── Email Sign Up ─────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError(null);
    if (!suName.trim())           { setSuError('Please enter your full name.'); return; }
    if (suPassword.length < 6)    { setSuError('Password must be at least 6 characters.'); return; }
    if (suPassword !== suConfirm) { setSuError('Passwords do not match.'); return; }
    setSuLoading(true);
    const result = await signUpWithEmail(suEmail, suPassword, suName.trim());
    setSuLoading(false);
    if (!result.success) setSuError(result.error ?? 'Sign up failed.');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans bg-black">

      {/* ── Background ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <img src="/Anniversary-Crowd-2.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(154,52,18,0.90) 0%, rgba(0,0,0,0.97) 100%)',
          mixBlendMode: 'multiply',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 25% 55%, rgba(251,146,60,0.25) 0%, transparent 60%)',
        }} />
      </div>

      {/* Ambient blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[40%] h-[40%] rounded-full bg-amber-400/12 blur-[100px]" />
      </div>

      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl shadow-orange-950/40 flex flex-col md:flex-row overflow-hidden" style={{ minHeight: 580 }}>

        {/* ── Left: Branding ──────────────────────────────────────────── */}
        <div className="w-full md:w-[42%] p-10 md:p-14 flex flex-col justify-between text-white bg-black/40 relative">
          <div className="absolute top-0 left-12 w-px h-28 bg-gradient-to-b from-orange-400/50 to-transparent" />
          <div className="absolute top-0 left-16 w-px h-16 bg-gradient-to-b from-amber-500/30 to-transparent" />

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-widest uppercase text-white/90 block leading-none">Manifest</span>
              <span className="text-orange-400 text-xs tracking-[0.2em] uppercase font-semibold">Forms</span>
            </div>
          </div>

          {/* Hero */}
          <div className="my-auto py-10">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
              Build.<br />
              <span className="text-orange-400">Collect.</span><br />
              Analyze.
            </h1>
            <div className="w-14 h-1.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full mb-5" />
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Create powerful digital forms, collect ministry data, and turn responses into actionable insights — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Form Builder', 'Live Responses', 'Analytics', 'Shareable Links'].map(f => (
                <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-300 font-medium">{f}</span>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right: Auth Form ─────────────────────────────────────────── */}
        <div className="w-full md:flex-1 flex flex-col justify-center p-8 md:p-12 bg-black/55">

          {/* Tab Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 mb-7 max-w-xs mx-auto w-full">
            {(['signin', 'signup'] as AuthTab[]).map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  tab === t ? 'bg-orange-500 text-white shadow-md shadow-orange-900/40' : 'text-white/40 hover:text-white/70'
                }`}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google Button — shared across tabs */}
          <div className="w-full max-w-sm mx-auto mb-5">
            {googleError && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{googleError}</span>
              </div>
            )}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 shadow-md"
            >
              {googleLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : <GoogleIcon />}
              <span>{tab === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5 max-w-sm mx-auto w-full">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-[10px] uppercase tracking-widest font-bold">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── SIGN IN ──────────────────────────────────────────────── */}
          {tab === 'signin' && (
            <div className="w-full max-w-sm mx-auto">
              {siError && (
                <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{siError}</span>
                </div>
              )}
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} required
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-orange-500/60 transition-all text-sm" />
                  </div>
                </div>
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={siShowPw ? 'text' : 'password'} value={siPassword} onChange={e => setSiPassword(e.target.value)} required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-orange-500/60 transition-all text-sm" />
                    <button type="button" onClick={() => setSiShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      {siShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="text-xs text-orange-400/70 hover:text-orange-400 transition-colors">Forgot password?</button>
                  </div>
                </div>
                <button type="submit" disabled={siLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-orange-900/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                  {siLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-center text-white/30 text-xs mt-5">
                No account?{' '}
                <button onClick={() => switchTab('signup')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">Create one free</button>
              </p>
            </div>
          )}

          {/* ── SIGN UP ──────────────────────────────────────────────── */}
          {tab === 'signup' && (
            <div className="w-full max-w-sm mx-auto">
              {suError && (
                <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{suError}</span>
                </div>
              )}
              <form onSubmit={handleSignUp} className="space-y-3.5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="text" value={suName} onChange={e => setSuName(e.target.value)} required placeholder="John Doe"
                      className="w-full pl-11 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-orange-500/60 transition-all text-sm" />
                  </div>
                </div>
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} required placeholder="you@example.com"
                      className="w-full pl-11 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-orange-500/60 transition-all text-sm" />
                  </div>
                </div>
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={suShowPw ? 'text' : 'password'} value={suPassword} onChange={e => setSuPassword(e.target.value)} required placeholder="Min. 6 characters"
                      className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-orange-500/60 transition-all text-sm" />
                    <button type="button" onClick={() => setSuShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      {suShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {suPassword.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strColor : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-semibold ${strText}`}>{strLabel}</p>
                    </div>
                  )}
                </div>
                {/* Confirm */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={suShowCf ? 'text' : 'password'} value={suConfirm} onChange={e => setSuConfirm(e.target.value)} required placeholder="Repeat password"
                      className={`w-full pl-11 pr-12 py-3.5 bg-white/5 border rounded-xl text-white placeholder-white/20 focus:outline-none transition-all text-sm ${
                        suConfirm.length > 0
                          ? suConfirm === suPassword ? 'border-green-500/50' : 'border-red-500/40'
                          : 'border-white/10 focus:border-orange-500/60'
                      }`} />
                    <button type="button" onClick={() => setSuShowCf(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      {suShowCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {suConfirm.length > 0 && suConfirm === suPassword && (
                      <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>
                <button type="submit" disabled={suLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-orange-900/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
                  {suLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-white/20 text-[10px] text-center pt-1">
                  By signing up you agree to our{' '}
                  <span className="text-orange-400/60 cursor-pointer hover:text-orange-400 transition-colors">Terms</span>
                  {' '}&amp;{' '}
                  <span className="text-orange-400/60 cursor-pointer hover:text-orange-400 transition-colors">Privacy Policy</span>.
                </p>
              </form>
              <p className="text-center text-white/30 text-xs mt-4">
                Already have an account?{' '}
                <button onClick={() => switchTab('signin')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">Sign in</button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Product Switcher (matches SignIn.tsx exactly) ─── */}
      <div ref={dropdownRef} className="relative z-10 mt-5 flex flex-col items-center">

        {/* Dropdown panel — slides up */}
        <div
          className={`absolute bottom-full mb-3 w-80 transition-all duration-300 origin-bottom ${
            dropdownOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Switch Product</p>
            </div>

            {/* Product Options */}
            <div className="p-2 space-y-1">
              {PRODUCTS.map((product) => {
                const isActive = product.id === activeProduct;
                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      setDropdownOpen(false);
                      if (product.id === 'manifest-management') navigate('/');
                      // manifest-forms = already here
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group ${
                      isActive
                        ? product.tint === 'orange'
                          ? 'bg-orange-500/25 border border-orange-500/30'
                          : 'bg-[#c8ff00]/15 border border-[#c8ff00]/25'
                        : 'hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? product.tint === 'orange'
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#c8ff00] text-black'
                        : 'bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:text-white'
                    }`}>
                      {product.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm block transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                      }`}>
                        {product.name}
                      </span>
                      <p className={`text-[11px] truncate transition-colors duration-200 ${
                        isActive ? 'text-white/60' : 'text-white/35 group-hover:text-white/55'
                      }`}>
                        {product.description}
                      </p>
                    </div>

                    {/* Active check */}
                    {isActive && (
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        product.tint === 'orange' ? 'bg-orange-500' : 'bg-[#c8ff00]'
                      }`}>
                        <Check className={`w-3 h-3 ${product.tint === 'orange' ? 'text-white' : 'text-black'}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trigger pill */}
        <button
          onClick={() => setDropdownOpen(prev => !prev)}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border backdrop-blur-xl transition-all duration-300 shadow-lg group ${
            dropdownOpen
              ? 'bg-orange-500/25 border-orange-400/40 shadow-orange-900/30'
              : 'bg-white/8 border-white/15 hover:bg-white/15 hover:border-white/25 shadow-black/20'
          }`}
          style={{ background: dropdownOpen ? undefined : 'rgba(255,255,255,0.06)' }}
        >
          <div className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center">
            <div className="scale-75"><FileText className="w-5 h-5" /></div>
          </div>
          <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors duration-200">
            {currentProduct.name}
          </span>
          <ChevronUp
            className={`w-4 h-4 text-white/50 group-hover:text-white/80 transition-all duration-300 ${
              dropdownOpen ? 'rotate-0' : 'rotate-180'
            }`}
          />
        </button>
      </div>
        </>
      )}
    </div>
  );
};

export default FormsAuthPage;
