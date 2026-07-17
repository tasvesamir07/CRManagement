import { createPortal } from 'react-dom';
import { ClipboardList, X, AlertCircle } from 'lucide-react';
import { parseDetails, troubleshootError } from './logsHelpers';

interface LogEntry {
  id: number;
  created_at: string;
  display_name?: string;
  username?: string;
  user_id?: number | string;
  action: string;
  entity_type?: string;
  entity_id?: number | string;
  ip_address?: string;
  details?: string | object | null;
}

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
  onRetrySend: (announcementId: number) => Promise<void>;
}

export default function LogDetailModal({ log, onClose, onRetrySend }: LogDetailModalProps) {
  if (!log) return null;

  const details = parseDetails(log.details);
  const errorMsg = (details as Record<string, string | undefined>)?.error || (details as Record<string, string | undefined>)?.message;
  const troubleshoot = troubleshootError(errorMsg);

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-canvas border border-hairline rounded-lg w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h3 className="text-md font-semibold text-ink">Log Entry #{log.id} Details</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-canvas-soft rounded cursor-pointer">
            <X className="w-4 h-4 text-ink-mute" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4 text-xs border-b border-hairline pb-4">
            <div>
              <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Action Type</span>
              <div className="mt-1 font-medium">{log.action}</div>
            </div>
            <div>
              <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Timestamp</span>
              <div className="mt-1 font-mono">{new Date(log.created_at).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Triggered By</span>
              <div className="mt-1 font-medium">{log.display_name || log.username || 'System'}</div>
            </div>
            <div>
              <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">IP Address</span>
              <div className="mt-1 font-mono">{log.ip_address || 'N/A'}</div>
            </div>
          </div>

          {troubleshoot && (
            <div className="bg-accent-tomato/5 border border-accent-tomato/20 rounded-md p-4 space-y-3">
              <div className="flex items-center gap-2 text-accent-tomato font-semibold text-sm">
                <AlertCircle className="w-4 h-4" />
                {troubleshoot.title}
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {troubleshoot.explanation}
              </p>
              <div className="space-y-1.5 pt-1.5 border-t border-accent-tomato/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-accent-tomato tracking-wider block">How to fix this:</span>
                  <ul className="list-decimal pl-4 text-xs text-ink-secondary space-y-1">
                    {troubleshoot.steps.map((step: string, idx: number) => (
                      <li key={idx} className="leading-normal">{step}</li>
                    ))}
                  </ul>
                </div>
                {log.entity_type === 'announcement' && log.entity_id && (
                  <button
                    onClick={() => { onRetrySend(log.entity_id as number); onClose(); }}
                    className="px-3 py-1.5 bg-accent-tomato hover:bg-accent-tomato-deep text-white rounded-sm text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-sm self-start sm:self-auto"
                  >
                    Retry Broadcast
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Event Metadata (Raw Details)</h4>
            <pre className="bg-canvas-night text-on-dark text-xs p-4 rounded font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end p-4 border-t border-hairline bg-canvas-soft/30 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ink text-on-dark hover:bg-ink-secondary text-xs font-medium rounded-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
