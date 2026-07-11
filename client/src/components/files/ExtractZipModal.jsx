import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, X } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ExtractZipModal({ show, file, onClose, currentFolderId, onExtracted }) {
  const [deleteOriginalZip, setDeleteOriginalZip] = useState(true);
  const [extracting, setExtracting] = useState(false);

  if (!show || !file) return null;

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await filesAPI.extractZip(file.id, deleteOriginalZip, currentFolderId);
      toast.success(res.message || 'Successfully extracted ZIP archive');
      onExtracted?.(deleteOriginalZip ? file.id : null);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to extract ZIP file');
    } finally {
      setExtracting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <FolderOpen className="text-amber-500 w-5 h-5" />
              Extract ZIP Archive
            </h3>
            <button onClick={() => { setDeleteOriginalZip(true); onClose(); }} className="text-ink-mute hover:text-ink transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-ink font-sans">
              Are you sure you want to extract the files from <span className="font-bold text-primary">"{file.original_name}"</span> directly into the current folder?
            </p>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-sans">Extracted folders and subfolders will be automatically recreated in your virtual folder system.</p>
            </div>

            <div className="flex items-center gap-2.5 pt-2 font-sans">
              <input type="checkbox" id="delete-original-zip" checked={deleteOriginalZip} onChange={(e) => setDeleteOriginalZip(e.target.checked)} className="accent-primary w-4 h-4 cursor-pointer rounded-sm" />
              <label htmlFor="delete-original-zip" className="text-xs font-semibold text-ink-mute hover:text-ink cursor-pointer select-none font-sans">Auto-delete original ZIP file after extraction</label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button disabled={extracting} onClick={() => { setDeleteOriginalZip(true); onClose(); }} className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded transition-colors border border-hairline cursor-pointer">Cancel</button>
            <button disabled={extracting} onClick={handleExtract} className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              {extracting ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>Extracting...</> : 'Extract'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
