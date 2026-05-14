import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FormsAuthProvider, useFormsAuth } from './context/FormsAuthContext';
import FormsAuthPage     from './auth/FormsAuthPage';
import FormsDashboard    from './dashboard/FormsDashboard';
import FormBuilderPage   from './pages/FormBuilderPage';
import FormResponsesPage from './pages/FormResponsesPage';
import PublicFormPage    from './pages/PublicFormPage';
import FormMigratePage  from './pages/FormMigratePage';
import { Loader2 } from 'lucide-react';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

const Guard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { formsUser, isLoading } = useFormsAuth();
  if (isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
      <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
    </div>
  );
  return formsUser ? <>{children}</> : <Navigate to="/forms/auth" replace />;
};

// ─── FormsApp ─────────────────────────────────────────────────────────────────

const FormsApp: React.FC = () => (
  <FormsAuthProvider>
    <Routes>
      {/* Public — no auth needed */}
      <Route path="auth"            element={<FormsAuthPage />} />
      <Route path="f/:formId"       element={<PublicFormPage />} />

      {/* Protected */}
      <Route path="dashboard"       element={<Guard><FormsDashboard /></Guard>} />
      <Route path="builder/:formId" element={<Guard><FormBuilderPage /></Guard>} />
      <Route path="responses/:formId" element={<Guard><FormResponsesPage /></Guard>} />
      <Route path="migrate"           element={<Guard><FormMigratePage /></Guard>} />

      {/* Fallback */}
      <Route index element={<Navigate to="/forms/auth" replace />} />
      <Route path="*" element={<Navigate to="/forms/auth" replace />} />
    </Routes>
  </FormsAuthProvider>
);

export default FormsApp;
