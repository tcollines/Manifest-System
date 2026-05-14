import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPWAPrompt: React.FC = () => {
  const { pathname } = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Never register install prompt on public form links
    if (pathname.startsWith('/forms/f/')) return;

    // Check if it's already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice) {
      setIsIOS(true);
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  // Never render on public form links
  if (pathname.startsWith('/forms/f/')) return null;
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom-5">
      <div className="max-w-md mx-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-lg">
        <div className="p-4 flex items-start gap-4">
          <div className="flex-shrink-0 pt-1">
            <div className="w-12 h-12 bg-black rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
              <img src="/MANIFEST.png" alt="App Icon" className="w-10 h-10 object-contain" />
            </div>
          </div>

          <div className="flex-1 text-sm text-gray-300 pt-1">
            <h3 className="font-bold text-white text-base mb-1">Install Manifest MS</h3>
            {isIOS ? (
              <p>
                To install this app on your iPhone/iPad, tap the <Share className="inline w-4 h-4 mx-1" /> icon below and select <strong>"Add to Home Screen"</strong>.
              </p>
            ) : (
              <p>Install our app for a faster, better experience and offline access.</p>
            )}
          </div>

          <button
            onClick={() => setShowPrompt(false)}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <div className="px-4 pb-4">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-ministry-orange hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              <Download size={18} />
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
