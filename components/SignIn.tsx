
import React, { useState } from 'react';
import { ShieldCheck, Globe, Instagram, Facebook, Twitter, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SignInProps {
  onLogin: (username: string, password: string) => void;
  error?: string | null;
}

const SignIn: React.FC<SignInProps> = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network delay for effect
    setTimeout(() => {
      onLogin(username, password);
      setIsLoading(false);
    }, 800);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetStatus('sending');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://manifest-management-system-447429474582.us-west1.run.app/', // In a real app, this would be the update password page
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

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-1000 ${imageFailed ? 'bg-[#008000]' : 'bg-black'}`}>

      {/* Background Image Layer - Only render if not failed */}
      {!imageFailed && (
        <div className="absolute inset-0 z-0 bg-zinc-900">
          {/* Direct path string to the uploaded image */}
          <img
            src="/Anniversary-Crowd-2.jpg"
            alt="Ministry Event Background"
            className="w-full h-full object-cover opacity-90"
            onError={() => {
              console.warn("Background image failed to load. Switching to green theme.");
              setImageFailed(true);
            }}
          />
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 to-black/95 mix-blend-multiply"></div>
        </div>
      )}

      {/* Abstract Shapes (Subtle on top of image or background) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-ministry-neon/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-ministry-orange/10 blur-[100px]"></div>
      </div>

      {/* Main Card */}
      {/* Note: Internal backgrounds ensure text contrast regardless of outer background */}
      <div className={`relative z-10 w-full max-w-5xl h-auto md:h-[600px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-700 ${imageFailed ? 'shadow-green-900/50' : ''}`}>

        {/* Left Side - Welcome & Branding */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-between text-white relative bg-black/40">
          {/* Decorative Top Lines */}
          <div className="absolute top-0 left-12 w-px h-32 bg-gradient-to-b from-ministry-neon/50 to-transparent"></div>
          <div className="absolute top-0 left-16 w-px h-20 bg-gradient-to-b from-ministry-orange/50 to-transparent"></div>

          {/* Brand Logo */}
          <div className="flex items-center space-x-3 mb-8 md:mb-0">
            <div className="bg-ministry-neon p-2 rounded-xl backdrop-blur-md shadow-lg shadow-ministry-neon/20">
              <Globe className="w-6 h-6 text-black" />
            </div>
            <span className="font-bold text-xl tracking-widest uppercase text-white/90">Manifest</span>
          </div>

          {/* Hero Text */}
          <div className="my-auto relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">Welcome!</h1>
            <div className="w-16 h-1.5 bg-gradient-to-r from-ministry-orange to-ministry-neon mb-6 rounded-full"></div>
            <p className="text-white/80 text-lg leading-relaxed max-w-sm font-light">
              Manifest Management System.
              <br />
              <span className="text-sm opacity-60 mt-2 block">Streamline ministry operations, track souls, and manage logistics in one unified command center.</span>
            </p>

            <div className="mt-8">
              <button className="px-8 py-3 rounded-full border border-white/20 bg-white/5 hover:bg-ministry-neon hover:text-black hover:border-ministry-neon transition-all text-sm font-medium backdrop-blur-sm">
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
                <div className="w-12 h-1 bg-ministry-orange rounded-full"></div>
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
                          className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-ministry-orange transition-all font-medium"
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">User Name</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-ministry-orange transition-all font-medium"
                          placeholder="Enter username"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase ml-1 tracking-wider">Password</label>
                      <div className="relative group">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-ministry-orange transition-all font-medium"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsResetMode(true)}
                          className="text-xs text-white/50 hover:text-ministry-orange transition-colors flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" /> Forgot Password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 px-4 bg-gradient-to-r from-ministry-orange to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white rounded-full font-bold text-lg shadow-lg shadow-orange-900/20 transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex items-center justify-center group"
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
                  <a href="#" className="text-white/30 hover:text-ministry-neon hover:scale-110 transition-all"><Facebook className="w-5 h-5" /></a>
                  <a href="#" className="text-white/30 hover:text-ministry-orange hover:scale-110 transition-all"><Instagram className="w-5 h-5" /></a>
                  <a href="#" className="text-white/30 hover:text-ministry-neon hover:scale-110 transition-all"><Twitter className="w-5 h-5" /></a>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignIn;
