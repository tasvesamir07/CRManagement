import { Link } from 'react-router-dom';
import {
  Calendar, FileUp, ClipboardList, Shield,
  X, LogOut, Users, UserCheck, GraduationCap,
  Sparkles, Radio, BookOpen, Megaphone
} from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { type User } from '../../context/AuthContext';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function MobileDrawer({ open, onClose, user, onLogout }: MobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-canvas/95 backdrop-blur-xl w-full rounded-t-3xl border-t border-hairline/80 p-5 space-y-4 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-ink uppercase tracking-wider">CR Console Menu</span>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-1.5 rounded-xl hover:bg-canvas-soft text-ink-mute hover:text-ink cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-1">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-mute font-bold block mb-2 px-1">Academic & Notices</span>
            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/files" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <FileUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Uploaded Files</span>
                  <span className="text-[10px] text-ink-mute">Vault & Media</span>
                </div>
              </Link>
              <Link to="/attendance" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Attendance</span>
                  <span className="text-[10px] text-ink-mute">Daily Tracker</span>
                </div>
              </Link>
              <Link to="/routines" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Class Routine</span>
                  <span className="text-[10px] text-ink-mute">Schedules & Rooms</span>
                </div>
              </Link>
              <Link to="/exam-routines" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Exam Routine</span>
                  <span className="text-[10px] text-ink-mute">Test Schedules</span>
                </div>
              </Link>
              <Link to="/students" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Students</span>
                  <span className="text-[10px] text-ink-mute">Directory</span>
                </div>
              </Link>
              <Link to="/logs" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Delivery Logs</span>
                  <span className="text-[10px] text-ink-mute">Audit Trail</span>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-mute font-bold block mb-2 px-1">Settings & Identity</span>
            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/profile" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Profile</span>
                  <span className="text-[10px] text-ink-mute">Account Settings</span>
                </div>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin/users" onClick={onClose} className="flex items-center gap-3 p-3 glass-card rounded-xl text-ink hover:border-primary/50 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">Admin Panel</span>
                    <span className="text-[10px] text-ink-mute">User Roles</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-hairline/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-indigo flex items-center justify-center text-white font-bold shrink-0 shadow-md">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">{user?.display_name || user?.username}</p>
              <p className="text-[10px] font-mono text-ink-mute capitalize">{user?.role} Account</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
