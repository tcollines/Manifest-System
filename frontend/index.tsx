import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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