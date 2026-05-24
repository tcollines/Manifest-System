import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { registerServiceWorker } from './services/pushService';

// ── Suppress browser's native PWA install prompt on public form links ─────────
// The prompt fires at the browser level before React mounts, so we intercept
// it globally here. On /forms/f/* we swallow it entirely — respondents should
// never see the install banner.
window.addEventListener('beforeinstallprompt', (e) => {
  if (window.location.pathname.startsWith('/forms/f/')) {
    e.preventDefault(); // cancel the native prompt
  }
}, { capture: true });

// ── Suppress native scrolling and arrows on number inputs globally ────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }
});
document.addEventListener('wheel', (e: WheelEvent) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    if (document.activeElement === target) {
       target.blur();
    }
  }
}, { passive: false });

// Initialize the new Push Service Worker
if ('serviceWorker' in navigator) {
  registerServiceWorker().then(() => {
    console.log('[App] Push Service Worker registered successfully.');
  }).catch((err) => {
    console.error('[App] Failed to register Push Service Worker:', err);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);