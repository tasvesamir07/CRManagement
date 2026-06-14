import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import { 
  LayoutDashboard, 
  Megaphone, 
  BookOpen, 
  Calendar, 
  Radio, 
  LogOut, 
  Menu, 
  X,
  User,
  Shield,
  Sun,
  Moon,
  ClipboardList,
  FileUp,
  WifiOff
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { OfflineDrafts } from '../../services/offline';
import { announcementsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Auto-sync on reconnect
  useEffect(() => {
    if (isOnline) {
      const syncDrafts = async () => {
        try {
          const unsynced = await OfflineDrafts.getAllUnsynced();
          if (unsynced.length === 0) return;
          
          toast.loading(`Back online! Syncing ${unsynced.length} offline draft(s)...`, { id: 'sync-toast' });
          
          let successCount = 0;
          for (const draft of unsynced) {
            try {
              const payload = {
                title: draft.title,
                content: draft.content,
                category: draft.category || 'general',
                course_id: draft.course_id || null,
                sections: draft.sections || [],
                platform_ids: draft.platform_ids || [],
                scheduled_at: draft.scheduled_at || null,
                status: draft.status || 'draft',
                files: draft.files || []
              };
              
              if (draft.id && !draft.id.startsWith('local_')) {
                await announcementsAPI.update(draft.id, payload);
              } else {
                await announcementsAPI.create(payload);
              }
              
              await OfflineDrafts.delete(draft.id);
              successCount++;
            } catch (err) {
              console.error('Failed to sync draft:', draft.id, err);
            }
          }
          
          if (successCount > 0) {
            toast.success(`${successCount} offline draft(s) synced successfully!`, { id: 'sync-toast' });
            window.dispatchEvent(new CustomEvent('offline-drafts-synced'));
          } else {
            toast.dismiss('sync-toast');
          }
        } catch (err) {
          console.error('Sync drafts failed:', err);
          toast.dismiss('sync-toast');
        }
      };
      
      syncDrafts();
    }
  }, [isOnline]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cr_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cr_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navigation = user?.role === 'admin'
    ? [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'System Logs', href: '/logs', icon: ClipboardList },
      ]
    : [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'New Broadcast', href: '/announcement/new', icon: Megaphone },
        { name: 'Courses', href: '/courses', icon: BookOpen },
        { name: 'Schedules & Rooms', href: '/routines', icon: Calendar },
        { name: 'Broadcasting Targets', href: '/platforms', icon: Radio },
        { name: 'Uploaded Files', href: '/files', icon: FileUp },
        { name: 'Delivery Logs', href: '/logs', icon: ClipboardList },
      ];

  const bottomLinks = [
    { name: 'Profile', href: '/profile', icon: User },
    ...(user?.role === 'admin' ? [{ name: 'Admin Panel', href: '/admin/users', icon: Shield }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden bg-canvas border-b border-hairline px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-base">
            CR
          </div>
          <span className="text-md font-semibold tracking-tight text-ink">CR Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas-soft transition-colors cursor-pointer"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <Link
            to="/profile"
            className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas-soft transition-colors"
            title="Profile Settings"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Mobile More Drawer Overlay */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end" onClick={() => setMoreMenuOpen(false)}>
          <div 
            className="bg-canvas w-full rounded-t-lg border-t border-hairline p-5 space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
              <span className="text-xs font-semibold text-ink-mute uppercase tracking-wider">More Menu</span>
              <button onClick={() => setMoreMenuOpen(false)} className="p-1 rounded hover:bg-canvas-soft text-ink-mute hover:text-ink cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 py-2">
              <Link to="/routines" onClick={() => setMoreMenuOpen(false)} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
                <Calendar className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium text-center">Schedules</span>
              </Link>
              <Link to="/files" onClick={() => setMoreMenuOpen(false)} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
                <FileUp className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium text-center">Uploaded Files</span>
              </Link>
              <Link to="/logs" onClick={() => setMoreMenuOpen(false)} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
                <ClipboardList className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium text-center">Delivery Logs</span>
              </Link>
              <Link to="/profile" onClick={() => setMoreMenuOpen(false)} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
                <User className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium text-center">Profile Settings</span>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin/users" onClick={() => setMoreMenuOpen(false)} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
                  <Shield className="w-6 h-6 mb-2 text-primary" />
                  <span className="text-xs font-medium text-center">Admin Panel</span>
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-hairline-cool flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-hairline flex items-center justify-center text-ink-secondary">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink truncate">{user?.display_name || user?.username}</p>
                  <p className="text-[10px] text-ink-mute capitalize">{user?.role} Account</p>
                </div>
              </div>
              <button 
                onClick={() => { setMoreMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-tomato/20 rounded text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline py-2 px-3 flex items-center justify-around z-40 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-lg">
        {user?.role === 'admin' ? (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center ${location.pathname === '/dashboard' ? 'text-primary' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/logs" className={`flex flex-col items-center ${location.pathname === '/logs' ? 'text-primary' : 'text-ink-mute'}`}>
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px] mt-1">Logs</span>
            </Link>
            <Link to="/admin/users" className={`flex flex-col items-center ${location.pathname === '/admin/users' ? 'text-primary' : 'text-ink-mute'}`}>
              <Shield className="w-5 h-5" />
              <span className="text-[10px] mt-1">Admin</span>
            </Link>
            <Link to="/profile" className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-primary' : 'text-ink-mute'}`}>
              <User className="w-5 h-5" />
              <span className="text-[10px] mt-1">Profile</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center text-ink-mute cursor-pointer">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] mt-1">Exit</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center ${location.pathname === '/dashboard' ? 'text-primary' : 'text-ink-mute'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] mt-1">Overview</span>
            </Link>
            <Link to="/announcement/new" className={`flex flex-col items-center ${location.pathname === '/announcement/new' ? 'text-primary' : 'text-ink-mute'}`}>
              <Megaphone className="w-5 h-5" />
              <span className="text-[10px] mt-1">Broadcast</span>
            </Link>
            <Link to="/courses" className={`flex flex-col items-center ${location.pathname === '/courses' ? 'text-primary' : 'text-ink-mute'}`}>
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] mt-1">Courses</span>
            </Link>
            <Link to="/platforms" className={`flex flex-col items-center ${location.pathname === '/platforms' ? 'text-primary' : 'text-ink-mute'}`}>
              <Radio className="w-5 h-5" />
              <span className="text-[10px] mt-1">Platforms</span>
            </Link>
            <button onClick={() => setMoreMenuOpen(true)} className={`flex flex-col items-center ${moreMenuOpen ? 'text-primary' : 'text-ink-mute'} cursor-pointer`}>
              <Menu className="w-5 h-5" />
              <span className="text-[10px] mt-1">More</span>
            </button>
          </>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-canvas border-r border-hairline z-30">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo / Header */}
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-hairline gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-lg shadow-sm">
              CR
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">CR Dashboard</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
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
                <Link
                  key={item.name}
                  to={item.href}
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

          {/* Footer User Info */}
          {!isOnline && (
            <div className="px-4 py-2 bg-accent-yellow/10 border-t border-accent-yellow/20 flex items-center gap-2 text-xs text-ink font-medium">
              <WifiOff className="w-3.5 h-3.5 text-ink-mute" />
              Offline Mode
            </div>
          )}
          <div className="flex-shrink-0 flex flex-col p-4 border-t border-hairline bg-canvas-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-hairline-strong flex items-center justify-center text-ink-secondary">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="truncate flex-1">
                <h4 className="text-sm font-medium text-ink truncate">{user?.display_name || user?.username}</h4>
                <p className="text-xs text-ink-mute capitalize truncate">{user?.role} Account</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 text-ink-mute hover:text-ink rounded-sm hover:bg-canvas transition-colors cursor-pointer"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center px-3 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-accent-tomato/10 hover:text-accent-tomato hover:border-accent-tomato/20 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
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
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
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
