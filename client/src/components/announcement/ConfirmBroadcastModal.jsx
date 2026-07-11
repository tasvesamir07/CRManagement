import { createPortal } from 'react-dom';
import { Send, AlertTriangle } from 'lucide-react';

export default function ConfirmBroadcastModal({
  show,
  platformCount,
  submitting,
  onClose,
  onConfirm
}) {
  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-md font-semibold text-ink">Confirm Broadcast</h3>
            <p className="text-sm text-ink-mute">This will immediately send to {platformCount} channel(s).</p>
          </div>
        </div>
        <div className="bg-accent-yellow/5 border border-accent-yellow/20 rounded-sm p-3 text-xs text-ink-mute">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-accent-yellow" />
          This action cannot be undone. The notice will be broadcast to all selected platforms.
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50 flex items-center"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {submitting ? 'Sending...' : 'Yes, Broadcast Now'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
