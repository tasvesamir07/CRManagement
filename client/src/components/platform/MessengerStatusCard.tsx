import { useState } from 'react';
import { CheckCircle, AlertTriangle, ShieldCheck, Info, HelpCircle } from 'lucide-react';
import { platformsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface MessengerStatusCardProps {
  messengerStatus: string;
  isMessengerMock: boolean;
  onAppStateSaved?: () => void;
}

const MessengerStatusCard = ({ messengerStatus, isMessengerMock, onAppStateSaved }: MessengerStatusCardProps) => {
  const [showInput, setShowInput] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [appStateJson, setAppStateJson] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!appStateJson.trim()) return;
    try {
      setSaving(true);
      await platformsAPI.saveMessengerAppState(appStateJson.trim());
      toast.success('Messenger AppState updated and saved to DB!');
      setShowInput(false);
      setAppStateJson('');
      if (onAppStateSaved) setTimeout(onAppStateSaved, 1500);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save AppState. Make sure it is valid JSON.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/20 dark:border-white/10 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-extrabold text-ink">Facebook Messenger</h3>
        </div>
        {isMessengerMock ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            DISCONNECTED
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            ACTIVE
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-hairline/80 rounded-xl min-h-[100px] bg-canvas-soft/40">
        {!isMessengerMock ? (
          <div className="text-center space-y-1.5">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-bold text-ink">Messenger Bot Connected</h4>
            <p className="text-[11px] text-ink-mute">Bot is active and stored in database. Automated delivery ready.</p>
          </div>
        ) : (
          <div className="text-center space-y-1.5">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-xs font-bold text-ink">Messenger Disconnected</h4>
            <p className="text-[11px] text-ink-mute">AppState missing or Facebook session expired. Paste JSON to re-link.</p>
          </div>
        )}
      </div>

      {!isMessengerMock && (
        <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-xs text-ink-mute">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${messengerStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-medium">Status: <strong className="text-ink">{messengerStatus}</strong></span>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-hairline/60 space-y-3">
        {!showInput ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-on-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              Update AppState / Paste Credentials
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-ink-mute hover:text-ink transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showGuide ? 'Hide Mobile & Permanent Fix Guide' : 'Why AppState disconnects & How to fix permanently'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-slide-up">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
              Paste AppState (JSON Array String)
            </label>
            <textarea
              rows={4}
              value={appStateJson}
              onChange={(e) => setAppStateJson(e.target.value)}
              placeholder='[{"key":"c_user","value":"..."}, ...]'
              className="glass-input block w-full px-3 py-2 rounded-xl text-xs text-ink font-mono"
            />
            <div className="flex gap-2">
              <button
                disabled={saving || !appStateJson.trim()}
                onClick={handleSave}
                className="w-1/2 py-2 px-3 bg-gradient-to-r from-primary to-accent-cyan text-on-primary text-xs font-bold rounded-xl hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save AppState'}
              </button>
              <button
                disabled={saving}
                onClick={() => { setShowInput(false); setAppStateJson(''); }}
                className="w-1/2 py-2 px-3 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showGuide && (
          <div className="p-3.5 rounded-xl bg-canvas-soft/80 border border-hairline text-xs space-y-2.5 text-ink-mute font-sans animate-slide-up">
            <div className="flex items-center gap-1.5 text-ink font-bold text-xs">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Why AppState Disconnects & How to Fix</span>
            </div>
            
            <p className="text-[11px] leading-relaxed">
              <strong className="text-ink">Why it disconnects:</strong> Facebook Messenger session cookies (`c_user`, `xs`) expire automatically when Facebook detects server restarts, new IP locations (like cloud servers), or logouts.
            </p>

            <div className="space-y-1.5 pt-1 border-t border-hairline/40 text-[11px]">
              <p className="font-bold text-primary">💡 Permanent Render Server Fix:</p>
              <p className="leading-relaxed">
                In your <strong>Render Dashboard</strong> → <strong>crmanagement-backend</strong> → <strong>Environment</strong>, add a variable named <code className="text-primary font-mono font-bold">MESSENGER_APPSTATE</code> with your AppState JSON. It will persist through restarts!
              </p>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-hairline/40 text-[11px]">
              <p className="font-bold text-indigo-400">📱 Mobile Phone Tip:</p>
              <p className="leading-relaxed">
                Mobile Chrome doesn't support Chrome extensions to copy AppState. On Android, use <strong>Kiwi Browser</strong> (which supports desktop extensions) to export AppState, or export it once on PC and paste it here!
              </p>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-hairline/40 text-[11px]">
              <p className="font-bold text-emerald-400">⚡ Permanent Alternative (Recommended):</p>
              <p className="leading-relaxed">
                Use <strong>Telegram Channel</strong> (via Bot Token) or <strong>WhatsApp Group</strong> (via QR pairing). Telegram & WhatsApp <strong>NEVER expire</strong> on server restarts!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessengerStatusCard;

