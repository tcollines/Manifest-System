import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';

// [NUKING ROGUE SERVICE WORKERS]
// A legacy service worker (sw.js) was previously registered and is permanently stuck in the browser.
// It intercepts all POST requests to Supabase and hangs indefinitely. 
// This block finds any active service workers for this domain and permanently destroys them.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister()
        .then(function () {
          console.log('Successfully destroyed legacy ServiceWorker:', registration.scope);
        })
        .catch(function (err) {
          console.error('ServiceWorker unregistration failed: ', err);
        });
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);