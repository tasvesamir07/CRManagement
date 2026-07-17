import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { createRoot } from 'react-dom/client';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-canvas border border-hairline rounded-lg w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${variant === 'danger' ? 'text-accent-tomato' : 'text-accent-yellow'}`} />
            <h3 className="text-sm font-semibold text-ink">{title || 'Confirm'}</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-canvas-soft rounded cursor-pointer">
            <X className="w-4 h-4 text-ink-mute" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-ink-secondary leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-hairline bg-canvas-soft/30 rounded-b-lg">
          <button onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
            {cancelLabel || 'Cancel'}
          </button>
          <button onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-sm cursor-pointer transition-colors shadow-sm ${variant === 'danger' ? 'bg-accent-tomato hover:bg-accent-tomato-deep' : 'bg-primary hover:bg-primary-deep'}`}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const confirm = (
  message: string,
  options: { title?: string; variant?: 'danger' | 'default'; confirmLabel?: string; cancelLabel?: string } = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    const cleanup = (value: boolean) => {
      root.unmount();
      div.remove();
      resolve(value);
    };

    root.render(
      <ConfirmDialog
        open={true}
        title={options.title}
        message={message}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />
    );
  });
};
