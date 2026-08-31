import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import './admin.css';

const rootElement = document.getElementById('admin-root');
if (!rootElement) {
    throw new Error('Could not find #admin-root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <AdminApp />
    </React.StrictMode>
);
