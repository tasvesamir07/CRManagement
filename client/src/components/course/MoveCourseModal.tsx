import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Folder, FolderClosed, X, Loader2 } from 'lucide-react';
import { coursesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface FolderItem {
  id: string;
  name: string;
  course_code?: string;
  created_at?: string;
}

interface MoveCourseModalProps {
  show: boolean;
  onClose: () => void;
  operation: 'move' | 'copy';
  courseId: number;
  onCompleted?: () => void;
}

export default function MoveCourseModal({ show, onClose, operation, courseId, onCompleted }: MoveCourseModalProps) {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  if (!show || courseId <= 0) return null;

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await coursesAPI.listFolders();
      setFolders(result);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOperation = async () => {
    setMoving(true);
    try {
      if (operation === 'move') {
        await coursesAPI.moveCourse(courseId, targetFolderId ?? '');
        toast.success('Course moved successfully');
      } else {
        await coursesAPI.copyCourse(courseId, targetFolderId ?? '');
        toast.success('Course copied successfully');
      }
      onCompleted?.();
      onClose();
    } catch (err) {
      toast.error('Failed to ' + operation + ' course');
      console.error('Course ' + operation + ' error:', err);
    } finally {
      setMoving(false);
      setTargetFolderId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      onClick={() => !moving && onClose()}
    >
      <div
        className="bg-canvas border border-hairline w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Folder className="w-5 h-5" />
              </span>
              {operation === 'move' ? 'Move Course' : 'Copy Course'}
            </h3>
            <button
              onClick={onClose}
              disabled={moving}
              className="text-ink-mute hover:text-ink disabled:opacity-40 p-1.5 rounded-md hover:bg-canvas-soft transition-all duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-ink-mute font-sans">
            Select target destination for the course:
          </p>

          <div className="max-h-60 overflow-y-auto border border-hairline rounded-lg divide-y divide-hairline">
            <div
              onClick={() => !moving && setTargetFolderId(null)}
              className={`p-3 text-sm text-ink hover:bg-canvas-soft active:scale-[0.99] cursor-pointer transition-all duration-150 flex items-center justify-between font-sans ${moving ? 'pointer-events-none opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <FolderClosed className="w-4.5 h-4.5 text-ink-mute" />
                <span className="font-medium">Root Level / Uncategorized</span>
              </div>
              {moving && targetFolderId === 'root' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              )}
            </div>
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => !moving && setTargetFolderId(folder.id)}
                className={`p-3 text-sm text-ink hover:bg-canvas-soft active:scale-[0.99] cursor-pointer transition-all duration-150 flex items-center gap-2.5 justify-between font-sans ${moving ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderClosed className="w-4.5 h-4.5 text-primary" />
                  <span className="truncate">{folder.name}</span>
                </div>
                {folder.course_code && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm uppercase">
                    {folder.course_code}
                  </span>
                )}
                {moving && targetFolderId === folder.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onClose}
              disabled={moving}
              className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft active:scale-95 rounded-lg transition-all duration-150 border border-hairline cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}