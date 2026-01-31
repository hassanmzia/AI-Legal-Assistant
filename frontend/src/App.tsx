import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import DashboardPage from './components/dashboard/DashboardPage';
import CaseList from './components/cases/CaseList';
import CaseDetail from './components/cases/CaseDetail';
import CaseForm from './components/cases/CaseForm';
import DocumentList from './components/documents/DocumentList';
import ChatInterface from './components/chat/ChatInterface';
import AnalysisHistory from './components/analysis/AnalysisHistory';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-gray-500">{description}</p>
    <div className="card">
      <p className="text-gray-400 text-center py-12">This page is under development.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute>
            <CaseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <ProtectedRoute>
            <CaseForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute>
            <CaseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id/edit"
        element={
          <ProtectedRoute>
            <CaseForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:sessionId"
        element={
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <ProtectedRoute>
            <AnalysisHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="AI Agents" description="View and manage AI agents in the system." />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Clients" description="Manage your clients and their information." />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Billing" description="Track time entries and generate invoices." />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Settings" description="Configure your account and application preferences." />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
