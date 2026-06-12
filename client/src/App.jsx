import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Import Views
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import DashboardLayout from './components/dashboard/DashboardLayout';
import MainDashboard from './components/dashboard/MainDashboard';
import AnnouncementForm from './components/announcement/AnnouncementForm';
import AnnouncementDetail from './components/announcement/AnnouncementDetail';
import CourseManager from './components/course/CourseManager';
import RoutineManager from './components/routine/RoutineManager';
import PlatformManager from './components/platform/PlatformManager';
import ForgotPassword from './components/auth/ForgotPassword';
import Profile from './components/profile/Profile';
import AdminUsers from './components/admin/AdminUsers';

// Loading Spinner helper
const LoadingPage = () => (
  <div className="min-h-screen bg-canvas flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <p className="mt-4 text-sm text-ink-mute">Checking authorization session...</p>
  </div>
);

// Role Route Wrapper
const RoleRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to="/dashboard" replace />;
  return children;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingPage />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Wrapper (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingPage />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: '13px',
              fontFamily: 'Circular, Helvetica Neue, Helvetica, Arial, sans-serif'
            }
          }}
        />
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />
          <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
          
          {/* Protected Dashboard routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<MainDashboard />} />
            <Route path="announcement/new" element={<RoleRoute allowedRole="cr"><AnnouncementForm /></RoleRoute>} />
            <Route path="announcement/edit/:id" element={<RoleRoute allowedRole="cr"><AnnouncementForm /></RoleRoute>} />
            <Route path="announcement/:id" element={<RoleRoute allowedRole="cr"><AnnouncementDetail /></RoleRoute>} />
            <Route path="courses" element={<RoleRoute allowedRole="cr"><CourseManager /></RoleRoute>} />
            <Route path="routines" element={<RoleRoute allowedRole="cr"><RoutineManager /></RoleRoute>} />
            <Route path="platforms" element={<RoleRoute allowedRole="cr"><PlatformManager /></RoleRoute>} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin/users" element={<RoleRoute allowedRole="admin"><AdminUsers /></RoleRoute>} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
