import { useState, useEffect, Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UploadProvider } from './context/UploadContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
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
const StudentManager = lazy(() => import('./components/student/StudentManager'));
const AttendanceManager = lazy(() => import('./components/attendance/AttendanceManager'));
const ExamRoutineManager = lazy(() => import('./components/exam/ExamRoutineManager'));
const CanvaConnect = lazy(() => import('./components/canva/CanvaConnect'));

const LoadingPage = () => (
  <div className="min-h-screen bg-canvas flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <p className="mt-4 text-sm text-ink-mute">Loading...</p>
  </div>
);

interface RoleRouteProps {
  children: ReactNode;
  allowedRole: string;
}

const RoleRoute = ({ children, allowedRole }: RoleRouteProps) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

interface RouteWrapperProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: RouteWrapperProps) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: RouteWrapperProps) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  const [toastPosition, setToastPosition] = useState<'top-right' | 'bottom-center'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'bottom-center' : 'top-right'
  );

  useEffect(() => {
    const handleResize = () => {
      setToastPosition(window.innerWidth < 768 ? 'bottom-center' : 'top-right');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl) return;

    let healthUrl = apiUrl.replace(/\/api\/?$/, '/health');
    if (!healthUrl.startsWith('http')) {
      healthUrl = window.location.origin + healthUrl;
    }

    let toastId: string | undefined;

    const showWakeupToastTimer = setTimeout(() => {
      toastId = toast.loading('Waking up the server... Please wait (up to 50s)...', {
        duration: 999999
      });
    }, 1500);

    fetch(healthUrl, { method: 'GET', mode: 'no-cors' })
      .then(() => {
        clearTimeout(showWakeupToastTimer);
        if (toastId) {
          toast.success('Server is online and ready!', { id: toastId, duration: 3000 });
        }
      })
      .catch(() => {
        clearTimeout(showWakeupToastTimer);
        if (toastId) {
          toast.error('Failed to connect to server. Please refresh.', { id: toastId });
        }
      });
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
            <ErrorBoundary>
            <Routes>
              <Route path="/login" element={
                <PublicRoute>
                  <ErrorBoundary><Login /></ErrorBoundary>
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <ErrorBoundary><Register /></ErrorBoundary>
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ErrorBoundary><ForgotPassword /></ErrorBoundary>
                </PublicRoute>
              } />
              <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <ErrorBoundary><DashboardLayout /></ErrorBoundary>
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<ErrorBoundary><MainDashboard /></ErrorBoundary>} />
                <Route path="announcement/new" element={<RoleRoute allowedRole="cr"><ErrorBoundary><AnnouncementForm /></ErrorBoundary></RoleRoute>} />
                <Route path="announcement/edit/:id" element={<RoleRoute allowedRole="cr"><ErrorBoundary><AnnouncementForm /></ErrorBoundary></RoleRoute>} />
                <Route path="announcement/:id" element={<RoleRoute allowedRole="cr"><ErrorBoundary><AnnouncementDetail /></ErrorBoundary></RoleRoute>} />
                <Route path="courses" element={<RoleRoute allowedRole="cr"><ErrorBoundary><CourseManager /></ErrorBoundary></RoleRoute>} />
                <Route path="routines" element={<RoleRoute allowedRole="cr"><ErrorBoundary><RoutineManager /></ErrorBoundary></RoleRoute>} />
                <Route path="platforms" element={<RoleRoute allowedRole="cr"><ErrorBoundary><PlatformManager /></ErrorBoundary></RoleRoute>} />
                <Route path="files" element={<RoleRoute allowedRole="cr"><ErrorBoundary><FilesManager /></ErrorBoundary></RoleRoute>} />
                <Route path="students" element={<RoleRoute allowedRole="cr"><ErrorBoundary><StudentManager /></ErrorBoundary></RoleRoute>} />
                <Route path="attendance" element={<RoleRoute allowedRole="cr"><ErrorBoundary><AttendanceManager /></ErrorBoundary></RoleRoute>} />
                <Route path="exam-routines" element={<RoleRoute allowedRole="cr"><ErrorBoundary><ExamRoutineManager /></ErrorBoundary></RoleRoute>} />
                <Route path="canva-settings" element={<RoleRoute allowedRole="cr"><ErrorBoundary><CanvaConnect /></ErrorBoundary></RoleRoute>} />
                <Route path="logs" element={<ErrorBoundary><LogsManager /></ErrorBoundary>} />
                <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
                <Route path="admin/users" element={<RoleRoute allowedRole="admin"><ErrorBoundary><AdminUsers /></ErrorBoundary></RoleRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
          </Suspense>
        </Router>
      </UploadProvider>
    </AuthProvider>
  );
}

export default App;
