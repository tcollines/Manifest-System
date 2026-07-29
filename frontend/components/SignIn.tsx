
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ShieldCheck, Globe, Instagram, Facebook, Twitter, ArrowRight, KeyRound, ArrowLeft, Eye, EyeOff, ChevronUp, LayoutDashboard, FileText, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { GoogleLogin } from '@react-oauth/google';

interface SignInProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onGoogleLogin?: (email: string, token: string) => Promise<void>;
  error?: string | null;
}

type ProductId = 'manifest-management' | 'manifest-forms';

interface Product {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  tint: 'green' | 'orange';
  badge?: string;
}

const PRODUCTS: Product[] = [
  {
    id: 'manifest-management',
    name: 'Manifest Management',
    tagline: 'Manifest Management System.',
    description: 'Streamline ministry operations, track souls, and manage logistics in one unified command center.',
    icon: <LayoutDashboard className="w-5 h-5" />,
    tint: 'green',
  },
  {
    id: 'manifest-forms',
    name: 'Manifest Forms',
    tagline: 'Manifest Forms.',
    description: 'Collect, manage, and analyze ministry data with powerful, customizable digital forms.',
    icon: <FileText className="w-5 h-5" />,
    tint: 'orange',
    badge: 'Beta',
  },
];

const SignIn: React.FC<SignInProps> = ({ onLogin, onGoogleLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  // Product Switcher State
  const [activeProduct, setActiveProduct] = useState<ProductId>('manifest-management');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentProduct = PRODUCTS.find(p => p.id === activeProduct)!;
  const isOrangeTint = currentProduct.tint === 'orange';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      console.error("Login call failed in UI", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetStatus('sending');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://manifest-management-system-447429474582.us-west1.run.app/',
      });

      if (error) throw error;

      setResetStatus('sent');
      setResetMessage('Check your email for the password reset link!');
    } catch (err: any) {
      console.error("Reset Error:", err);
      setResetStatus('error');
      setResetMessage(err.message || "Failed to send reset email.");
    }
  };

  const isOnline = useOnlineStatus();
  const [googleLoading, setGoogleLoading] = useState(false);

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-1000 ${imageFailed ? 'bg-[#008000]' : 'bg-black'}`}
    >

      {/* Background Image Layer */}
      {!imageFailed && (
        <div className="absolute inset-0 z-0 bg-zinc-900">
          <img
            src="/Anniversary-Crowd-2.jpg"
            alt="Ministry Event Background"
            className="w-full h-full object-cover opacity-90"
            onError={() => {
              console.warn("Background image failed to load. Switching to green theme.");
              setImageFailed(true);
            }}
          />
          {/* Gradient Overlay — switches between green and orange tint */}
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              background: isOrangeTint
                ? 'linear-gradient(135deg, rgba(154,52,18,0.85) 0%, rgba(0,0,0,0.95) 100%)'
                : 'linear-gradient(135deg, rgba(14,83,14,0.80) 0%, rgba(0,0,0,0.95) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
          {/* Extra warm orange glow when Manifest Forms is active */}
          {isOrangeTint && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-700"
              style={{
                background: 'radial-gradient(ellipse at 30% 60%, rgba(251,146,60,0.25) 0%, transparent 65%)',
              }}
            />
          )}
        </div>
      )}

      {/* Abstract Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
        <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-colors duration-700 ${isOrangeTint ? 'bg-orange-500/15' : 'bg-[#c8ff00]/10'}`} />
        <div className={`absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] transition-colors duration-700 ${isOrangeTint ? 'bg-amber-400/20' : 'bg-orange-400/10'}`} />
      </div>

      {/* Main Card */}
      <div className={`relative z-10 w-full max-w-5xl h-auto md:h-[600px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-700 ${imageFailed ? 'shadow-green-900/50' : ''}`}>

        {/* Left Side - Welcome & Branding */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-between text-white relative bg-black/40">
          {/* Decorative Top Lines */}
          <div className={`absolute top-0 left-12 w-px h-32 bg-gradient-to-b transition-colors duration-700 ${isOrangeTint ? 'from-orange-400/50' : 'from-[#c8ff00]/50'} to-transparent`} />
          <div className={`absolute top-0 left-16 w-px h-20 bg-gradient-to-b transition-colors duration-700 ${isOrangeTint ? 'from-amber-500/50' : 'from-orange-400/50'} to-transparent`} />

          {/* Brand Logo */}
          <div className="flex items-center space-x-3 mb-8 md:mb-0">
            <div className={`p-2 rounded-xl backdrop-blur-md shadow-lg transition-all duration-700 ${isOrangeTint ? 'bg-orange-500 shadow-orange-500/20' : 'bg-[#c8ff00] shadow-[#c8ff00]/20'}`}>
              <Globe className="w-6 h-6 text-black" />
            </div>
            <span className="font-bold text-xl tracking-widest uppercase text-white/90">Manifest</span>
          </div>

          {/* Hero Text */}
          <div className="my-auto relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight transition-all duration-500">Welcome!</h1>
            <div className={`w-16 h-1.5 bg-gradient-to-r mb-6 rounded-full transition-all duration-700 ${isOrangeTint ? 'from-orange-500 to-amber-400' : 'from-orange-500 to-[#c8ff00]'}`} />
            <p className="text-white/80 text-lg leading-relaxed max-w-sm font-light transition-all duration-500">
              {currentProduct.tagline}
              <br />
              <span className="text-sm opacity-60 mt-2 block">{currentProduct.description}</span>
            </p>

            <div className="mt-8">
              <button className={`px-8 py-3 rounded-full border bg-white/5 hover:text-black transition-all text-sm font-medium backdrop-blur-sm duration-300 ${isOrangeTint ? 'border-orange-400/30 hover:bg-orange-400 hover:border-orange-400' : 'border-white/20 hover:bg-[#c8ff00] hover:border-[#c8ff00]'}`}>
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 relative flex items-center justify-center p-8 md:p-12 bg-black/60">

          {/* Inner Form Container */}
          <div className="w-full max-w-sm relative z-10">

            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-2 text-center">Sign in</h2>
              <div className="flex justify-center mb-8">
                <div className={`w-12 h-1 rounded-full transition-colors duration-700 ${isOrangeTint ? 'bg-orange-500' : 'bg-orange-500'}`} />
              </div>

              {error && (
                <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center backdrop-blur-sm animate-pulse">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <form onSubmit={isResetMode ? handleForgotPassword : handleSubmit} className="space-y-6">

                {isResetMode ? (
                  /* --- RESET PASSWORD FORM --- */
                  <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Enter your Email</label>
                      <div className="relative group">
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className={`block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all font-medium ${isOrangeTint ? 'focus:border-orange-500' : 'focus:border-orange-500'}`}
                          placeholder="john@example.com"
                          required
                          disabled={resetStatus === 'sent'}
                        />
                      </div>
                    </div>

                    {resetStatus === 'sent' && (
                      <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-200 text-sm">
                        {resetMessage}
                      </div>
                    )}
                    {resetStatus === 'error' && (
                      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                        {resetMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetStatus === 'sending' || resetStatus === 'sent'}
                      className="w-full py-4 px-4 bg-white text-black hover:bg-gray-100 rounded-full font-bold text-lg shadow-lg transform transition-all mt-4 flex items-center justify-center"
                    >
                      {resetStatus === 'sending' ? 'Sending...' : resetStatus === 'sent' ? 'Email Sent' : 'Send Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsResetMode(false); setResetStatus('idle'); setResetMessage(''); }}
                      className="w-full text-center text-white/50 hover:text-white text-sm mt-4 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Login
                    </button>
                  </div>
                ) : (
                  /* --- LOGIN FORM --- */
                  <div className="space-y-6 animate-in fade-in slide-in-from-left duration-300">

                    {/* Google Sign In at Top */}
                    <div className="flex flex-col items-center space-y-4">
                      {isOnline ? (
                        <>
                          <div className="w-full flex justify-center">
                            <GoogleLogin
                              onSuccess={async (credentialResponse) => {
                                setGoogleLoading(true);
                                try {
                                  if (onGoogleLogin && credentialResponse.credential) {
                                    const base64Url = credentialResponse.credential.split('.')[1];
                                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                                      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                                    }).join(''));
                                    const payload = JSON.parse(jsonPayload);
                                    await onGoogleLogin(payload.email, credentialResponse.credential);
                                  }
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setGoogleLoading(false);
                                }
                              }}
                              onError={() => {
                                console.error('Google Sign-in Failed');
                              }}
                              shape="pill"
                              size="large"
                              width="300"
                              text="signin_with"
                            />
                          </div>

                          <div className="relative flex py-1 items-center w-full">
                            <div className="flex-grow border-t border-white/10" />
                            <span className="flex-shrink-0 mx-4 text-white/30 text-[10px] uppercase tracking-widest font-bold">Or sign in with</span>
                            <div className="flex-grow border-t border-white/10" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-center text-yellow-200 text-xs">
                          <Globe className="w-4 h-4 mr-2 opacity-70" />
                          Offline Mode: Google Sign-In Unavailable
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Username or Email</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all font-medium ${isOrangeTint ? 'focus:border-orange-500' : 'focus:border-orange-500'}`}
                          placeholder="Enter username or email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Password</label>
                      <div className="relative group">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all font-medium pr-12 ${isOrangeTint ? 'focus:border-orange-500' : 'focus:border-orange-500'}`}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsResetMode(true)}
                          className={`text-xs text-white/50 transition-colors flex items-center gap-1 ${isOrangeTint ? 'hover:text-orange-400' : 'hover:text-orange-400'}`}
                        >
                          <KeyRound className="w-3 h-3" /> Forgot Password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-4 px-4 text-white rounded-full font-bold text-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex items-center justify-center group ${
                        isOrangeTint
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-900/30'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-900/20'
                      }`}
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
                          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform opacity-80" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex justify-center space-x-8 pt-6 border-t border-white/10 mt-6">
                  <a href="#" className={`text-white/30 hover:scale-110 transition-all ${isOrangeTint ? 'hover:text-orange-400' : 'hover:text-[#c8ff00]'}`}><Facebook className="w-5 h-5" /></a>
                  <a href="#" className={`text-white/30 hover:scale-110 transition-all ${isOrangeTint ? 'hover:text-amber-400' : 'hover:text-orange-400'}`}><Instagram className="w-5 h-5" /></a>
                  <a href="#" className={`text-white/30 hover:scale-110 transition-all ${isOrangeTint ? 'hover:text-orange-400' : 'hover:text-[#c8ff00]'}`}><Twitter className="w-5 h-5" /></a>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Product Switcher Dropdown (bottom-center) ─── */}
      <div ref={dropdownRef} className="relative z-20 mt-6 flex flex-col items-center">

        {/* Dropdown Panel — slides up when open */}
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
                      if (product.id === 'manifest-forms') {
                        window.location.href = import.meta.env.VITE_FORMS_DOMAIN || 'http://localhost:3002';
                      } else {
                        setActiveProduct(product.id);
                      }
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
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                          {product.name}
                        </span>
                        {product.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 border border-orange-500/30">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate transition-colors duration-200 ${isActive ? 'text-white/60' : 'text-white/35 group-hover:text-white/55'}`}>
                        {product.description.split(',')[0]}
                      </p>
                    </div>

                    {/* Active Check */}
                    {isActive && (
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${product.tint === 'orange' ? 'bg-orange-500' : 'bg-[#c8ff00]'}`}>
                        <Check className={`w-3 h-3 ${product.tint === 'orange' ? 'text-white' : 'text-black'}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trigger Pill Button */}
        <button
          id="product-switcher-btn"
          onClick={() => setDropdownOpen(prev => !prev)}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border backdrop-blur-xl transition-all duration-300 shadow-lg group ${
            dropdownOpen
              ? isOrangeTint
                ? 'bg-orange-500/25 border-orange-400/40 shadow-orange-900/30'
                : 'bg-white/15 border-white/30 shadow-black/30'
              : 'bg-white/8 border-white/15 hover:bg-white/15 hover:border-white/25 shadow-black/20'
          }`}
          style={{ background: dropdownOpen ? undefined : 'rgba(255,255,255,0.06)' }}
        >
          {/* Current product icon */}
          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-300 ${isOrangeTint ? 'bg-orange-500 text-white' : 'bg-[#c8ff00] text-black'}`}>
            <div className="scale-75">{currentProduct.icon}</div>
          </div>
          <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors duration-200">
            {currentProduct.name}
          </span>
          <ChevronUp
            className={`w-4 h-4 text-white/50 group-hover:text-white/80 transition-all duration-300 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>
      </div>

    </div>
  );
};

export default SignIn;
