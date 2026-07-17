import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FileItem {
  id: string;
  original_name: string;
  file_type?: string;
  file_size?: number;
}

interface ExpiryModalProps {
  show: boolean;
  file: FileItem | null;
  onClose: () => void;
  onUpdated?: (updatedFile: any) => void;
}

export default function ExpiryModal({ show, file, onClose, onUpdated }: ExpiryModalProps) {
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  if (!show || !file) return null;

  const handleUpdateExpiry = async (newExpiresAt: string | null) => {
    try {
      const updatedFile = await filesAPI.updateExpiry(file.id, newExpiresAt ?? '');
      onUpdated?.(updatedFile);
      toast.success('Expiry date updated successfully');
      onClose();
    } catch {
      toast.error('Failed to update expiry date');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <Calendar className="text-primary w-5 h-5" />
              Customize Expiry Date
            </h3>
            <button onClick={() => { setCustomExpiryDate(''); onClose(); }} className="text-ink-mute hover:text-ink transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-ink-mute font-sans">
              Set how long <span className="font-semibold text-ink">"{file.original_name}"</span> remains active in database storage.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => handleUpdateExpiry(null)} className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer">Make Permanent</button>
              <button onClick={() => {
                if (customExpiryDate) handleUpdateExpiry(new Date(customExpiryDate).toISOString());
              }} disabled={!customExpiryDate} className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer disabled:opacity-50">Apply Custom Date</button>
            </div>

            <div className="pt-2 border-t border-hairline">
              <label className="block text-[10px] uppercase font-semibold text-ink-mute tracking-wider mb-1 font-sans">Custom Expiry Date</label>
              <input type="date" value={customExpiryDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomExpiryDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary transition-colors" />
            </div>

            <div className="p-3 bg-accent-yellow/5 border border-accent-yellow/20 rounded-md">
              <p className="text-xs text-ink-mute font-sans">Files past their expiry date are automatically cleaned up during scheduled maintenance. Set to "Permanent" to keep the file indefinitely.</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
