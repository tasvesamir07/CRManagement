import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, FolderClosed, X, Loader2 } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FolderItem {
  id: string;
  name: string;
  course_code?: string;
  created_at?: string;
}

interface MoveFilesModalProps {
  show: boolean;
  onClose: () => void;
  folders: FolderItem[];
  selectedFileIds: Set<string>;
  onMoved?: () => void;
}

export default function MoveFilesModal({ show, onClose, folders, selectedFileIds, onMoved }: MoveFilesModalProps) {
  const [moving, setMoving] = useState(false);
  const [targetId, setTargetId] = useState<string | null | 'root'>(null);

  if (!show || selectedFileIds.size === 0) return null;

  const handleMove = async (folderId: string | null) => {
    setMoving(true);
    setTargetId(folderId ?? 'root');
    try {
      await filesAPI.moveFiles(Array.from(selectedFileIds), folderId ?? '');
      toast.success(`Successfully moved ${selectedFileIds.size} file(s)`);
      onMoved?.();
      onClose();
    } catch {
      toast.error('Failed to move files');
    } finally {
      setMoving(false);
      setTargetId(null);
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
              Move Files
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
            Select target destination for the <span className="font-semibold text-ink">{selectedFileIds.size} selected file(s)</span>:
          </p>

          <div className="max-h-60 overflow-y-auto border border-hairline rounded-lg divide-y divide-hairline">
            <div
              onClick={() => !moving && handleMove(null)}
              className={`p-3 text-sm text-ink hover:bg-canvas-soft active:scale-[0.99] cursor-pointer transition-all duration-150 flex items-center justify-between font-sans ${moving ? 'pointer-events-none opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <FolderClosed className="w-4.5 h-4.5 text-ink-mute" />
                <span className="font-medium">Root Level / Uncategorized</span>
              </div>
              {moving && targetId === 'root' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              )}
            </div>
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => !moving && handleMove(folder.id)}
                className={`p-3 text-sm text-ink hover:bg-canvas-soft active:scale-[0.99] cursor-pointer transition-all duration-150 flex items-center gap-2.5 justify-between font-sans ${moving ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderClosed className="w-4.5 h-4.5 text-primary" />
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {folder.course_code && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm uppercase">
                      {folder.course_code}
                    </span>
                  )}
                  {moving && targetId === folder.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                </div>
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
