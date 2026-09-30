import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Loader2, FolderClosed } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FolderItem {
  id: string;
  name: string;
  course_code?: string;
  created_at?: string;
}

interface DeleteFolderModalProps {
  show: boolean;
  folder: FolderItem | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function DeleteFolderModal({ show, folder, onClose, onDeleted }: DeleteFolderModalProps) {
  const [deletingMode, setDeletingMode] = useState<'all' | 'keep' | null>(null);

  if (!show || !folder) return null;

  const handleDelete = async (deleteFiles: boolean) => {
    setDeletingMode(deleteFiles ? 'all' : 'keep');
    try {
      await filesAPI.deleteFolder(folder.id, deleteFiles);
      toast.success(deleteFiles ? 'Folder and files deleted' : 'Folder deleted, files kept');
      onDeleted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete folder');
    } finally {
      setDeletingMode(null);
    }
  };

  const isDeleting = deletingMode !== null;

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="bg-canvas border border-hairline w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                <Trash2 className="w-5 h-5" />
              </span>
              Delete Folder
            </h3>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-ink-mute hover:text-ink disabled:opacity-40 p-1.5 rounded-md hover:bg-canvas-soft transition-all duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-ink font-sans">
              Are you sure you want to delete the folder <span className="font-bold text-primary">"{folder.name}"</span>?
            </p>
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 font-sans font-medium">
                Choose what to do with the files currently inside this folder:
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => handleDelete(true)}
              disabled={isDeleting}
              className={`w-full py-2.5 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none rounded-lg shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${deletingMode === 'all' ? 'animate-pulse' : ''}`}
            >
              {deletingMode === 'all' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Folder & All Files...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Folder & All Files Inside</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft-strong active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none border border-hairline rounded-lg shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {deletingMode === 'keep' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Moving Files & Deleting Folder...</span>
                </>
              ) : (
                <>
                  <FolderClosed className="w-4 h-4 text-ink-mute" />
                  <span>Delete Folder Only (Keep files and move to Root)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-full py-2.5 px-4 text-xs font-medium text-ink-mute hover:text-ink active:scale-[0.98] disabled:opacity-40 transition-all duration-150 text-center cursor-pointer"
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
