import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ManifestDetail from './pages/ManifestDetail';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/manifests': 'Manifests',
};

const ProtectedLayout: React.FC = () => {
    const location = useLocation();

    let title = 'Dashboard';
    if (location.pathname.startsWith('/manifests/')) {
        title = 'Manifest Details';
    } else {
        title = pageTitles[location.pathname] || 'Admin Council';
    }

    return (
        <div className="flex min-h-screen bg-ministry-black font-sans">
            <AdminSidebar />
            <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
                <AdminHeader title={title} />
                <div className="flex-1 p-8">
                    <Routes>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="manifests/:id" element={<ManifestDetail />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

const AuthGate: React.FC = () => {
    const { isAuthenticated, isLoading } = useAdminAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-ministry-black">
                <div className="ac-spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin />;
    }

    return <ProtectedLayout />;
};

const AdminApp: React.FC = () => {
    return (
        <AdminAuthProvider>
            <BrowserRouter>
                <AuthGate />
            </BrowserRouter>
        </AdminAuthProvider>
    );
};

export default AdminApp;
