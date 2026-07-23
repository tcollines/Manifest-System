import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import FormsApp from './forms/FormsApp';
import PublicSoulEntry from './components/PublicSoulEntry';
import PublicResidentSoulEntry from './components/PublicResidentSoulEntry';
import PublicScheduleAvailability from './components/PublicScheduleAvailability';

import { NotificationProvider } from './components/ui/NotificationSystem';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { EventProvider } from './context/EventContext';
import ScrollRestoration from './components/ScrollRestoration';

const ProtectedProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    // Only mount heavy dashboard providers once user is authenticated
    if (!user) return <>{children}</>;

    return (
        <EventProvider>
            {children}
        </EventProvider>
    );
};

const Root: React.FC = () => {
    return (
        <NotificationProvider>
            <AuthProvider>
                <Router>
                    <ProtectedProviders>
                        <ScrollRestoration />
                        <Routes>
                            {/* Public soul-entry forms (main system) */}
                            <Route path="/collect-souls/:eventId" element={<PublicSoulEntry />} />
                            <Route path="/collect-residency-souls/:residenceId" element={<PublicResidentSoulEntry />} />
                            <Route path="/schedule-availability/:scheduleId" element={<PublicScheduleAvailability />} />
                            <Route path="/schedule/:slug" element={<PublicScheduleAvailability />} />

                            {/* ── Manifest Forms product (fully isolated auth + dashboard) ── */}
                            <Route path="/forms/*" element={<FormsApp />} />

                            {/* ── Manifest Management System (catch-all) ── */}
                            <Route path="*" element={<App />} />
                        </Routes>
                    </ProtectedProviders>
                </Router>
            </AuthProvider>
        </NotificationProvider>
    );
};

export default Root;
