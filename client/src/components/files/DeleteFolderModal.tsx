import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
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
  if (!show || !folder) return null;

  const handleDelete = async (deleteFiles: boolean) => {
    try {
      await filesAPI.deleteFolder(folder.id, deleteFiles);
      toast.success(deleteFiles ? 'Folder and files deleted' : 'Folder deleted, files kept');
      onDeleted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete folder');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <Trash2 className="text-red-500 w-5 h-5" />
              Delete Folder
            </h3>
            <button onClick={onClose} className="text-ink-mute hover:text-ink transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-ink font-sans">
              Are you sure you want to delete the folder <span className="font-bold text-primary">"{folder.name}"</span>?
            </p>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-xs text-red-600 dark:text-red-400 font-sans">Choose what to do with the files currently inside this folder:</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button onClick={() => handleDelete(true)} className="w-full py-2.5 px-4 text-xs font-semibold text-on-primary bg-red-600 hover:bg-red-700 rounded-sm shadow-sm transition-colors text-center cursor-pointer">
              Delete Folder & All Files Inside
            </button>
            <button onClick={() => handleDelete(false)} className="w-full py-2.5 px-4 text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft-strong border border-hairline rounded-sm transition-colors text-center cursor-pointer">
              Delete Folder Only (Keep files and move to Root)
            </button>
            <button onClick={onClose} className="w-full py-2.5 px-4 text-xs font-medium text-ink-mute hover:text-ink transition-colors text-center cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
