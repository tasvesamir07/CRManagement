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
  ClipboardList
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Mobile menu bar */}
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-ink hover:text-ink-secondary focus:outline-none cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] bg-canvas z-40 border-b border-hairline flex flex-col p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-sm transition-colors ${
                  isActive 
                    ? 'bg-primary/15 text-ink-secondary font-semibold border-l-2 border-primary' 
                    : 'text-ink-mute hover:bg-canvas-soft hover:text-ink'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : 'text-ink-mute'}`} />
                {item.name}
              </Link>
            );
          })}
          <hr className="border-hairline my-2" />
          {bottomLinks.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-sm transition-colors ${
                  isActive 
                    ? 'bg-primary/15 text-ink-secondary font-semibold border-l-2 border-primary' 
                    : 'text-ink-mute hover:bg-canvas-soft hover:text-ink'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : 'text-ink-mute'}`} />
                {item.name}
              </Link>
            );
          })}
          <hr className="border-hairline my-2" />
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-hairline flex items-center justify-center text-ink-secondary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{user?.display_name || user?.username}</p>
              <p className="text-xs text-ink-mute capitalize">{user?.role} Account</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center px-4 py-3 text-sm font-medium text-accent-tomato hover:bg-accent-tomato/10 rounded-sm cursor-pointer"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      )}

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
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
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
