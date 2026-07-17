import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';

interface AIDraftModalProps {
  show: boolean;
  aiPrompt: string;
  onPromptChange: (val: string) => void;
  aiDrafting: boolean;
  generatedDraft: string;
  onGenerate: () => void;
  onUseDraft: () => void;
  onClose: () => void;
}

export default function AIDraftModal({ show, aiPrompt, onPromptChange, aiDrafting, generatedDraft, onGenerate, onUseDraft, onClose }: AIDraftModalProps) {
  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-md font-semibold text-ink flex items-center gap-2 font-sans">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            Draft Notice with Gemini AI
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mute hover:text-ink cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
              What would you like to announce?
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onPromptChange(e.target.value)}
              placeholder="e.g. Announce a quiz on Wednesday, June 17th, on chapter 4 of Database Management Systems. It will start at 10 AM in Room 602. Topics are SQL queries."
              rows={4}
              className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150 resize-none"
            />
          </div>

          {generatedDraft && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider">
                Generated Draft Preview
              </label>
              <div className="p-3 bg-canvas-soft border border-hairline rounded-sm text-sm text-ink font-sans whitespace-pre-wrap leading-relaxed select-text shadow-inner max-h-[220px] overflow-y-auto">
                {generatedDraft}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-hairline flex items-center justify-between bg-canvas-soft">
          <span className="text-xs text-ink-mute">Powered by Gemini 1.5 Flash</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft cursor-pointer bg-canvas"
            >
              Cancel
            </button>
            {generatedDraft ? (
              <>
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={aiDrafting}
                  className="px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-sm text-sm font-medium transition-colors cursor-pointer bg-canvas"
                >
                  {aiDrafting ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button
                  type="button"
                  onClick={onUseDraft}
                  className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer"
                >
                  Use Draft
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onGenerate}
                disabled={aiDrafting || !aiPrompt.trim()}
                className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border-none"
              >
                {aiDrafting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-on-primary"></div>
                    Generating Notice...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Notice
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
