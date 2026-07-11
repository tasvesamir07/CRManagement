import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { troubleshootError } from '../logs/logsHelpers';

export default function TroubleshootModal({ errorMessage, onClose }) {
  if (!errorMessage) return null;

  const troubleshoot = troubleshootError(errorMessage);

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-canvas border border-hairline rounded-lg w-full max-w-md shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-canvas-soft rounded cursor-pointer">
          <X className="w-4 h-4 text-ink-mute" />
        </button>

        <div className="flex items-center gap-2.5 text-accent-tomato mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-md font-semibold text-ink">Delivery Troubleshooter</h3>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-mute tracking-wider block">Raw Error Message</span>
            <p className="mt-1 text-xs font-mono bg-canvas-soft p-3 rounded border border-hairline break-words text-ink">
              {errorMessage}
            </p>
          </div>

          {troubleshoot && (
            <>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">{troubleshoot.title}</span>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">{troubleshoot.explanation}</p>
              </div>

              <div className="border-t border-hairline pt-3">
                <span className="text-[10px] uppercase font-bold text-ink-mute tracking-wider block mb-1.5">Suggested Action Checklist:</span>
                <ul className="list-decimal pl-4 text-xs text-ink-secondary space-y-1.5">
                  {troubleshoot.steps.map((step, index) => (
                    <li key={index} className="leading-normal">{step}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-ink text-on-dark hover:bg-ink-secondary text-xs font-medium rounded-sm transition-colors cursor-pointer">
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
