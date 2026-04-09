import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import PublicSoulEntry from './components/PublicSoulEntry';
import PublicResidentSoulEntry from './components/PublicResidentSoulEntry';
import AcceptInvite from './components/AcceptInvite';

import { NotificationProvider } from './components/ui/NotificationSystem';
import { AuthProvider } from './context/AuthContext';

const Root: React.FC = () => {
    return (
        <NotificationProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route path="/collect-souls/:eventId" element={<PublicSoulEntry />} />
                        <Route path="/collect-residency-souls/:residenceId" element={<PublicResidentSoulEntry />} />
                        <Route path="/accept-invite" element={<AcceptInvite />} />
                        <Route path="*" element={<App />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </NotificationProvider>
    );
};

export default Root;
