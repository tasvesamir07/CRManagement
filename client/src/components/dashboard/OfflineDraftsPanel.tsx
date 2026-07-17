import { Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';

interface OfflineDraft {
  id: string;
  title?: string;
  updatedAt: string;
  [key: string]: any;
}

interface OfflineDraftsPanelProps {
  drafts: OfflineDraft[];
  onDelete: (draftId: string) => Promise<void>;
}

export default function OfflineDraftsPanel({ drafts, onDelete }: OfflineDraftsPanelProps) {
  if (!drafts || drafts.length === 0) return null;

  return (
    <div className="bg-accent-yellow/5 border border-accent-yellow/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <WifiOff className="w-4 h-4 text-accent-yellow" />
        Offline Drafts ({drafts.length})
        <span className="text-xs text-ink-mute font-normal">— not yet synced</span>
      </div>
      <div className="divide-y divide-hairline-cool/60">
        {drafts.map((draft: OfflineDraft) => (
          <div key={draft.id} className="py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-ink">{draft.title || 'Untitled'}</span>
              <span className="text-xs text-ink-mute ml-2">{new Date(draft.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Link to={`/announcement/edit/${draft.id}`} className="text-xs px-2.5 py-1 border border-hairline rounded hover:bg-canvas-soft text-ink font-semibold">Edit</Link>
              <button onClick={() => onDelete(draft.id)} className="text-xs px-2.5 py-1 border border-accent-tomato/20 text-accent-tomato rounded hover:bg-accent-tomato/5 font-semibold">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
