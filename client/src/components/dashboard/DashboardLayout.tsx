import { useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuth, type User } from '../../context/AuthContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import {
  LayoutDashboard, Megaphone, BookOpen, Calendar, Radio,
  LogOut, Menu, Shield, ClipboardList, FileUp,
  Sun, Moon, WifiOff, Users, UserCheck, GraduationCap, type LucideIcon
} from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import useOfflineSync from '../../hooks/useOfflineSync';
import useDashboardTheme from '../../hooks/useDashboardTheme';
import MobileDrawer from './MobileDrawer';
import { useWebSocket } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location: Location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { theme, toggleTheme } = useDashboardTheme();
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);

  useOfflineSync(isOnline);

  const activeToastIdRef = useRef<string | null>(null);

  useWebSocket({
    onMessage: (payload: any) => {
      if (payload.type === 'announcement_status') {
        const { status, delivery } = payload.data;
        if (!delivery || delivery.length === 0) return;

        const total = delivery.length;
        const completed = delivery.filter((d: any) => d.platform_status === 'sent' || d.platform_status === 'failed').length;
        const progress = Math.round((completed / total) * 100);

        const message = `Broadcasting Notice... ${completed}/${total} channels (${progress}%)`;

        if (status === 'sending') {
          if (!activeToastIdRef.current) {
            activeToastIdRef.current = toast.loading(message);
          } else {
            toast.loading(message, { id: activeToastIdRef.current });
          }
        } else if (status === 'sent') {
          const successCount = delivery.filter((d: any) => d.platform_status === 'sent').length;
          const failureCount = delivery.filter((d: any) => d.platform_status === 'failed').length;
          toast.success(`Broadcast Complete! (${successCount} sent, ${failureCount} failed)`, {
            id: activeToastIdRef.current || undefined
          });
          activeToastIdRef.current = null;
        } else if (status === 'failed') {
          toast.error('Broadcast failed completely.', {
            id: activeToastIdRef.current || undefined
          });
          activeToastIdRef.current = null;
        } else if (status === 'partial') {
          const successCount = delivery.filter((d: any) => d.platform_status === 'sent').length;
          const failureCount = delivery.filter((d: any) => d.platform_status === 'failed').length;
          toast.success(`Broadcast finished with failures (${successCount} sent, ${failureCount} failed)`, {
            id: activeToastIdRef.current || undefined
          });
          activeToastIdRef.current = null;
        }
      }
    }
  });

  const navigation: NavigationItem[] = user?.role === 'admin'
    ? [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'System Logs', href: '/logs', icon: ClipboardList },
        { name: 'Students', href: '/students', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: UserCheck },
        { name: 'Exam Routines', href: '/exam-routines', icon: GraduationCap },
      ]
    : [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'New Broadcast', href: '/announcement/new', icon: Megaphone },
        { name: 'Courses', href: '/courses', icon: BookOpen },
        { name: 'Schedules & Rooms', href: '/routines', icon: Calendar },
        { name: 'Broadcasting Targets', href: '/platforms', icon: Radio },
        { name: 'Uploaded Files', href: '/files', icon: FileUp },
        { name: 'Students', href: '/students', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: UserCheck },
        { name: 'Exam Routines', href: '/exam-routines', icon: GraduationCap },
        { name: 'Delivery Logs', href: '/logs', icon: ClipboardList },
      ];

  const bottomLinks: NavigationItem[] = [
    { name: 'Profile', href: '/profile', icon: UserIcon },
    ...(user?.role === 'admin' ? [{ name: 'Admin Panel', href: '/admin/users', icon: Shield }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleTheme: React.MouseEventHandler<HTMLButtonElement> = toggleTheme;

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col md:flex-row">
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm focus:text-sm focus:font-medium">
        Skip to main content
      </a>
      {/* Mobile top bar */}
      <div className="md:hidden bg-canvas border-b border-hairline px-4 py-3 flex items-center justify-between sticky top-0 z-50" role="banner">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-base">CR</div>
          <span className="text-md font-semibold tracking-tight text-ink">CR Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleTheme} className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas-soft transition-colors cursor-pointer" title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <Link to="/profile" className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas-soft transition-colors" title="Profile Settings">
            <UserIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <MobileDrawer open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} user={user} onLogout={handleLogout} />

      {/* Mobile Bottom Tab Bar */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline py-2 px-3 flex items-center justify-around z-40 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-lg">
        {user?.role === 'admin' ? (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center ${location.pathname === '/dashboard' ? 'text-primary' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" /><span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/logs" className={`flex flex-col items-center ${location.pathname === '/logs' ? 'text-primary' : 'text-ink-mute'}`}>
              <ClipboardList className="w-5 h-5" /><span className="text-[10px] mt-1">Logs</span>
            </Link>
            <Link to="/admin/users" className={`flex flex-col items-center ${location.pathname === '/admin/users' ? 'text-primary' : 'text-ink-mute'}`}>
              <Shield className="w-5 h-5" /><span className="text-[10px] mt-1">Admin</span>
            </Link>
            <Link to="/profile" className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-primary' : 'text-ink-mute'}`}>
              <UserIcon className="w-5 h-5" /><span className="text-[10px] mt-1">Profile</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center text-ink-mute cursor-pointer">
              <LogOut className="w-5 h-5" /><span className="text-[10px] mt-1">Exit</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center ${location.pathname === '/dashboard' ? 'text-primary' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" /><span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/announcement/new" className={`flex flex-col items-center ${location.pathname === '/announcement/new' ? 'text-primary' : 'text-ink-mute'}`}>
              <Megaphone className="w-5 h-5" /><span className="text-[10px] mt-1">Broadcast</span>
            </Link>
            <Link to="/courses" className={`flex flex-col items-center ${location.pathname === '/courses' ? 'text-primary' : 'text-ink-mute'}`}>
              <BookOpen className="w-5 h-5" /><span className="text-[10px] mt-1">Courses</span>
            </Link>
            <Link to="/platforms" className={`flex flex-col items-center ${location.pathname === '/platforms' ? 'text-primary' : 'text-ink-mute'}`}>
              <Radio className="w-5 h-5" /><span className="text-[10px] mt-1">Platforms</span>
            </Link>
            <button onClick={() => setMoreMenuOpen(true)} className={`flex flex-col items-center ${moreMenuOpen ? 'text-primary' : 'text-ink-mute'} cursor-pointer`}>
              <Menu className="w-5 h-5" /><span className="text-[10px] mt-1">More</span>
            </button>
          </>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-canvas border-r border-hairline z-30">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-hairline gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-lg shadow-sm">CR</div>
            <span className="text-lg font-semibold tracking-tight text-ink">CR Dashboard</span>
          </div>

          <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href} aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center px-3.5 py-2.5 text-sm font-medium rounded-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-ink dark:bg-primary/15 text-on-dark dark:text-primary font-medium shadow-sm'
                      : 'text-ink-mute hover:bg-canvas-soft hover:text-ink'
                  }`}
                >
                  <Icon className={`mr-3 h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-ink-mute group-hover:text-ink'}`} />
                  {item.name}
                </Link>
              );
            })}
            <hr className="border-hairline my-3" />
            {bottomLinks.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href} aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center px-3.5 py-2.5 text-sm font-medium rounded-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-ink dark:bg-primary/15 text-on-dark dark:text-primary font-medium shadow-sm'
                      : 'text-ink-mute hover:bg-canvas-soft hover:text-ink'
                  }`}
                >
                  <Icon className={`mr-3 h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-ink-mute group-hover:text-ink'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {!isOnline && (
            <div className="px-4 py-2 bg-accent-yellow/10 border-t border-accent-yellow/20 flex items-center gap-2 text-xs text-ink font-medium">
              <WifiOff className="w-3.5 h-3.5 text-ink-mute" />
              Offline Mode
            </div>
          )}
          <div className="flex-shrink-0 flex flex-col p-4 border-t border-hairline bg-canvas-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-hairline-strong flex items-center justify-center text-ink-secondary">
                <UserIcon className="w-4.5 h-4.5" />
              </div>
              <div className="truncate flex-1">
                <h4 className="text-sm font-medium text-ink truncate">{user?.display_name || user?.username}</h4>
                <p className="text-xs text-ink-mute capitalize truncate">{user?.role} Account</p>
              </div>
              <button onClick={handleToggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas transition-colors cursor-pointer"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleLogout} aria-label="Sign out of your account"
              className="flex w-full items-center justify-center px-3 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-accent-tomato/10 hover:text-accent-tomato hover:border-accent-tomato/20 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-16 md:pb-0">
        {!isOnline && (
          <div className="md:hidden bg-accent-yellow/90 text-ink text-xs text-center py-1.5 px-4 font-medium sticky top-0 z-50 backdrop-blur-sm flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            You're offline — drafts will be saved locally and synced when reconnected
          </div>
        )}
        <main id="main-content" className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            <div key={location.pathname} className="route-enter-active">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
