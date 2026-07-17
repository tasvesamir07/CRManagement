import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileArchive, X } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface CompressModalProps {
  show: boolean;
  onClose: () => void;
  selectedFileIds: Set<string>;
  currentFolderId: string | null;
  onCompressed?: () => void;
}

export default function CompressModal({ show, onClose, selectedFileIds, currentFolderId, onCompressed }: CompressModalProps) {
  const [compressArchiveName, setCompressArchiveName] = useState('archive.zip');
  const [compressing, setCompressing] = useState(false);

  if (!show || selectedFileIds.size === 0) return null;

  const handleCompress = async () => {
    setCompressing(true);
    try {
      const archiveName = compressArchiveName.trim() || 'archive.zip';
      await filesAPI.compressFiles(Array.from(selectedFileIds), archiveName, currentFolderId);
      toast.success(`Successfully compressed files into ${archiveName}`);
      onCompressed?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to compress files');
    } finally {
      setCompressing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <FileArchive className="text-amber-500 w-5 h-5" />
              Compress Files to ZIP
            </h3>
            <button onClick={() => { setCompressArchiveName('archive.zip'); onClose(); }} className="text-ink-mute hover:text-ink transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-ink-mute font-sans">Compress {selectedFileIds.size} selected file(s) into a ZIP archive.</p>

            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">Archive File Name</label>
              <input type="text" placeholder="archive.zip" value={compressArchiveName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompressArchiveName(e.target.value)} className="w-full px-3 py-2 text-sm border border-hairline rounded bg-canvas text-ink focus:outline-none focus:border-primary transition-colors font-sans" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button disabled={compressing} onClick={() => { setCompressArchiveName('archive.zip'); onClose(); }} className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded transition-colors border border-hairline cursor-pointer">Cancel</button>
            <button disabled={compressing || !compressArchiveName.trim()} onClick={handleCompress} className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              {compressing ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>Compressing...</> : 'Compress'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
