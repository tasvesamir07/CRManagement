import { useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { platformsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const MessengerStatusCard = ({ messengerStatus, isMessengerMock, onAppStateSaved }) => {
  const [showInput, setShowInput] = useState(false);
  const [appStateJson, setAppStateJson] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!appStateJson.trim()) return;
    try {
      setSaving(true);
      await platformsAPI.saveMessengerAppState(appStateJson.trim());
      toast.success('Messenger AppState updated! Re-authenticating...');
      setShowInput(false);
      setAppStateJson('');
      if (onAppStateSaved) setTimeout(onAppStateSaved, 2000);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save AppState. Make sure it is valid JSON.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
        <h3 className="text-md font-medium text-ink font-sans">Messenger Status</h3>
        {isMessengerMock && (
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">Disconnected</span>
        )}
      </div>
      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-hairline rounded-sm min-h-[100px]">
        {!isMessengerMock ? (
          <div className="text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-primary stroke-[1.25] mx-auto" />
            <h4 className="text-sm font-medium text-ink">Bot Connected</h4>
            <p className="text-xs text-ink-mute">Messenger bot is active using appstate.json. Messages will be delivered.</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-ink-mute stroke-[1.25] mx-auto" />
            <h4 className="text-sm font-medium text-ink">Not Connected</h4>
            <p className="text-xs text-ink-mute">appstate.json is missing in root. Messenger service is in mock mode.</p>
          </div>
        )}
      </div>
      {!isMessengerMock && (
        <div className="pt-2 border-t border-hairline-cool">
          <div className="flex items-center gap-2 text-xs text-ink-mute">
            <span className={`w-1.5 h-1.5 rounded-full ${messengerStatus === 'CONNECTED' ? 'bg-primary' : 'bg-accent-yellow'}`} />
            Status: {messengerStatus}
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-hairline-cool space-y-3">
        {!showInput ? (
          <button onClick={() => setShowInput(true)}
            className="w-full flex items-center justify-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
            Update AppState / Link Account
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider">Paste AppState (JSON String)</label>
            <textarea rows={4} value={appStateJson} onChange={(e) => setAppStateJson(e.target.value)}
              placeholder='[{"key":"c_user","value":"..."}, ...]'
              className="w-full px-2.5 py-1.5 border border-hairline rounded bg-canvas text-xs text-ink placeholder-ink-mute/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono" />
            <div className="flex gap-2">
              <button disabled={saving || !appStateJson.trim()} onClick={handleSave}
                className="w-1/2 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : 'Save AppState'}
              </button>
              <button disabled={saving} onClick={() => { setShowInput(false); setAppStateJson(''); }}
                className="w-1/2 px-3 py-1.5 border border-hairline rounded-sm text-xs font-semibold text-ink bg-canvas hover:bg-canvas-soft transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessengerStatusCard;
