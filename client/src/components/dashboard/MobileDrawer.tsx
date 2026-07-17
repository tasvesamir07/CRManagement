import { Link } from 'react-router-dom';
import {
  Calendar, FileUp, ClipboardList, Shield,
  X, LogOut, Users, UserCheck, GraduationCap
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
    <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end" onClick={onClose}>
      <div
        className="bg-canvas w-full rounded-t-lg border-t border-hairline p-5 space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
          <span className="text-xs font-semibold text-ink-mute uppercase tracking-wider">More Menu</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-canvas-soft text-ink-mute hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <Link to="/routines" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <Calendar className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Schedules</span>
          </Link>
          <Link to="/students" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <Users className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Students</span>
          </Link>
          <Link to="/attendance" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <UserCheck className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Attendance</span>
          </Link>
          <Link to="/exam-routines" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <GraduationCap className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Exam Routine</span>
          </Link>
          <Link to="/files" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <FileUp className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Uploaded Files</span>
          </Link>
          <Link to="/logs" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <ClipboardList className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Delivery Logs</span>
          </Link>
          <Link to="/profile" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
            <UserIcon className="w-6 h-6 mb-2 text-primary" />
            <span className="text-xs font-medium text-center">Profile Settings</span>
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin/users" onClick={onClose} className="flex flex-col items-center p-3 border border-hairline rounded hover:bg-canvas-soft text-ink-secondary">
              <Shield className="w-6 h-6 mb-2 text-primary" />
              <span className="text-xs font-medium text-center">Admin Panel</span>
            </Link>
          )}
        </div>

        <div className="pt-3 border-t border-hairline-cool flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-hairline flex items-center justify-center text-ink-secondary">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink truncate">{user?.display_name || user?.username}</p>
              <p className="text-[10px] text-ink-mute capitalize">{user?.role} Account</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-tomato/20 rounded text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
