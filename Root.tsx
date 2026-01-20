import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import PublicSoulEntry from './components/PublicSoulEntry';
import AcceptInvite from './components/AcceptInvite';

const Root: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/collect-souls/:eventId" element={<PublicSoulEntry />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="*" element={<App />} />
            </Routes>
        </Router>
    );
};

export default Root;
