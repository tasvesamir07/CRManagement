import { useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuth, type User } from '../../context/AuthContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import {
  LayoutDashboard, Megaphone, BookOpen, Calendar, Radio,
  LogOut, Menu, Shield, ClipboardList, FileUp,
  Sun, Moon, WifiOff, Users, UserCheck, GraduationCap, type LucideIcon, Sparkles
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
    <div className="min-h-screen bg-canvas cyber-grid text-ink flex flex-col md:flex-row relative">
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-xl focus:text-sm focus:font-medium">
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <div className="md:hidden glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl" role="banner">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary via-emerald-400 to-accent-cyan flex items-center justify-center text-on-primary font-extrabold text-sm shadow-md">
            CR
          </div>
          <span className="text-base font-extrabold tracking-tight text-ink">CR Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleTheme} className="p-2 text-ink-mute hover:text-ink rounded-xl hover:bg-canvas-soft transition-colors cursor-pointer" title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
            {theme === 'light' ? <Moon className="w-4.5 h-4.5 text-accent-violet" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
          </button>
          <Link to="/profile" className="p-2 text-ink-mute hover:text-ink rounded-xl hover:bg-canvas-soft transition-colors" title="Profile Settings">
            <UserIcon className="w-4.5 h-4.5" />
          </Link>
        </div>
      </div>

      <MobileDrawer open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} user={user} onLogout={handleLogout} />

      {/* Mobile Bottom Tab Bar */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 py-2.5 px-3 flex items-center justify-around z-40 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-2xl backdrop-blur-2xl">
        {user?.role === 'admin' ? (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center transition-colors ${location.pathname === '/dashboard' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" /><span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/logs" className={`flex flex-col items-center transition-colors ${location.pathname === '/logs' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <ClipboardList className="w-5 h-5" /><span className="text-[10px] mt-1">Logs</span>
            </Link>
            <Link to="/admin/users" className={`flex flex-col items-center transition-colors ${location.pathname === '/admin/users' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <Shield className="w-5 h-5" /><span className="text-[10px] mt-1">Admin</span>
            </Link>
            <Link to="/profile" className={`flex flex-col items-center transition-colors ${location.pathname === '/profile' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <UserIcon className="w-5 h-5" /><span className="text-[10px] mt-1">Profile</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center text-ink-mute hover:text-rose-500 transition-colors cursor-pointer">
              <LogOut className="w-5 h-5" /><span className="text-[10px] mt-1">Exit</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center transition-colors ${location.pathname === '/dashboard' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" /><span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/announcement/new" className={`flex flex-col items-center transition-colors ${location.pathname === '/announcement/new' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <Megaphone className="w-5 h-5" /><span className="text-[10px] mt-1">Broadcast</span>
            </Link>
            <Link to="/courses" className={`flex flex-col items-center transition-colors ${location.pathname === '/courses' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <BookOpen className="w-5 h-5" /><span className="text-[10px] mt-1">Courses</span>
            </Link>
            <Link to="/platforms" className={`flex flex-col items-center transition-colors ${location.pathname === '/platforms' ? 'text-primary font-bold' : 'text-ink-mute'}`}>
              <Radio className="w-5 h-5" /><span className="text-[10px] mt-1">Platforms</span>
            </Link>
            <button onClick={() => setMoreMenuOpen(true)} className={`flex flex-col items-center transition-colors ${moreMenuOpen ? 'text-primary font-bold' : 'text-ink-mute'} cursor-pointer`}>
              <Menu className="w-5 h-5" /><span className="text-[10px] mt-1">More</span>
            </button>
          </>
        )}
      </nav>

      {/* Desktop Futuristic Glass Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 glass-panel border-r border-white/10 dark:border-white/5 z-30 backdrop-blur-2xl shadow-2xl">
        <div className="flex-1 flex flex-col min-h-0">
          <Link to="/" className="flex items-center h-20 flex-shrink-0 px-6 border-b border-hairline/60 gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-emerald-400 to-accent-cyan flex items-center justify-center text-on-primary font-extrabold text-lg shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              CR
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-ink block leading-none">CR Dashboard</span>
              <span className="text-[10px] font-mono text-primary font-bold tracking-wider uppercase mt-1 block">Pro Console</span>
            </div>
          </Link>

          <nav aria-label="Main navigation" className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href} aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center px-3.5 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-primary border-l-4 border-l-primary shadow-sm shadow-primary/10'
                      : 'text-ink-mute hover:bg-canvas-soft hover:text-ink hover:translate-x-1'
                  }`}
                >
                  <Icon className={`mr-3 h-4.5 w-4.5 transition-colors ${isActive ? 'text-primary' : 'text-ink-mute group-hover:text-ink'}`} />
                  {item.name}
                </Link>
              );
            })}
            <hr className="border-hairline/60 my-4" />
            {bottomLinks.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href} aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center px-3.5 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-primary border-l-4 border-l-primary shadow-sm shadow-primary/10'
                      : 'text-ink-mute hover:bg-canvas-soft hover:text-ink hover:translate-x-1'
                  }`}
                >
                  <Icon className={`mr-3 h-4.5 w-4.5 transition-colors ${isActive ? 'text-primary' : 'text-ink-mute group-hover:text-ink'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {!isOnline ? (
            <div className="mx-3 my-2 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-500 font-bold">
              <WifiOff className="w-4 h-4" />
              Offline Mode
            </div>
          ) : (
            <div className="mx-3 my-2 px-3.5 py-2.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-ink-mute font-semibold">
              <span className="flex items-center gap-2 text-ink">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Broadcast Hub
              </span>
              <span className="text-primary font-bold font-mono text-[10px] uppercase tracking-wider">ACTIVE</span>
            </div>
          )}

          <div className="flex-shrink-0 flex flex-col p-4 border-t border-hairline/60 bg-canvas/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-indigo flex items-center justify-center text-white font-bold shadow-md">
                <UserIcon className="w-4.5 h-4.5" />
              </div>
              <div className="truncate flex-1">
                <h4 className="text-xs font-bold text-ink truncate">{user?.display_name || user?.username}</h4>
                <p className="text-[10px] font-mono text-ink-mute capitalize truncate">{user?.role} Account</p>
              </div>
              <button onClick={handleToggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                className="p-2 text-ink-mute hover:text-ink rounded-xl hover:bg-canvas transition-colors cursor-pointer"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-accent-violet" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
            <button onClick={handleLogout} aria-label="Sign out of your account"
              className="flex w-full items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-0 relative z-10">
        {!isOnline && (
          <div className="md:hidden bg-amber-500/90 text-white text-xs text-center py-2 px-4 font-bold sticky top-0 z-50 backdrop-blur-md flex items-center justify-center gap-2 shadow-lg">
            <WifiOff className="w-4 h-4" />
            Offline Mode — Changes will sync automatically once reconnected
          </div>
        )}
        <main id="main-content" className="flex-1 py-6 sm:py-10 px-4 sm:px-8 max-w-7xl w-full mx-auto">
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

