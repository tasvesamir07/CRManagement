import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UploadProvider } from './context/UploadContext';
import DashboardLayout from './components/dashboard/DashboardLayout';

const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const MainDashboard = lazy(() => import('./components/dashboard/MainDashboard'));
const AnnouncementForm = lazy(() => import('./components/announcement/AnnouncementForm'));
const AnnouncementDetail = lazy(() => import('./components/announcement/AnnouncementDetail'));
const CourseManager = lazy(() => import('./components/course/CourseManager'));
const RoutineManager = lazy(() => import('./components/routine/RoutineManager'));
const PlatformManager = lazy(() => import('./components/platform/PlatformManager'));
const Profile = lazy(() => import('./components/profile/Profile'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const LogsManager = lazy(() => import('./components/logs/LogsManager'));
const FilesManager = lazy(() => import('./components/files/FilesManager'));

const LoadingPage = () => (
  <div className="min-h-screen bg-canvas flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <p className="mt-4 text-sm text-ink-mute">Loading...</p>
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
  const [toastPosition, setToastPosition] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'bottom-center' : 'top-right'
  );

  useEffect(() => {
    const handleResize = () => {
      setToastPosition(window.innerWidth < 768 ? 'bottom-center' : 'top-right');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthProvider>
      <UploadProvider>
        <Router>
          <Toaster
            position={toastPosition}
            toastOptions={{
              duration: 4000,
              style: {
                fontSize: '13px',
                fontFamily: 'Circular, Helvetica Neue, Helvetica, Arial, sans-serif'
              }
            }}
          />
          <Suspense fallback={<LoadingPage />}>
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
                <Route path="files" element={<RoleRoute allowedRole="cr"><FilesManager /></RoleRoute>} />
                <Route path="logs" element={<LogsManager />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin/users" element={<RoleRoute allowedRole="admin"><AdminUsers /></RoleRoute>} />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </UploadProvider>
    </AuthProvider>
  );
}

export default App;
