import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';
import { platformsAPI } from '../../services/api';

import { COUNTRY_CODES, sanitizePhoneNumber } from './platformUtils';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface WhatsAppStatusCardProps {
  waStatus: string;
  setWaStatus: (status: string) => void;
  waQr: string;
  setWaQr: (qr: string) => void;
  isWaMock: boolean;
  setIsWaMock: (mock: boolean) => void;
}

const WhatsAppStatusCard = ({ waStatus, setWaStatus, waQr, setWaQr, isWaMock, setIsWaMock }: WhatsAppStatusCardProps) => {
  const [pairPhone, setPairPhone] = useState('');
  const [countryCode, setCountryCode] = useState('880');
  const [customCountryCode, setCustomCountryCode] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [showPairInput, setShowPairInput] = useState(false);
  const [waGroups, setWaGroups] = useState<WhatsAppGroup[]>([]);
  const [syncingGroups, setSyncingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(20);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (waQr && waStatus === 'QR_READY') {
      QRCode.toDataURL(waQr, { width: 200, margin: 2 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: any) => console.error('Error generating local QR:', err));
    } else {
      setQrCodeUrl('');
    }
  }, [waQr, waStatus]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (waStatus === 'QR_READY') {
      setCountdown(20);
      interval = setInterval(() => setCountdown(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    } else {
      setCountdown(20);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [waQr, waStatus]);

  const fetchWhatsAppStatusHttp = async () => {
    try {
      const res = await platformsAPI.getWhatsAppStatus();
      setWaStatus(res.status);
      setWaQr(res.qr);
      setIsWaMock(res.isMock);
    } catch (e) {
      console.error('Failed HTTP WhatsApp status fetch:', e);
    }
  };

  const handleRestartWhatsApp = async () => {
    try {
      setActionLoading(true);
      await platformsAPI.restartWhatsApp();
      fetchWhatsAppStatusHttp();
    } catch (e: any) {
      alert('Failed to restart WhatsApp: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePairPhone = async () => {
    const activeCountryCode = countryCode === 'custom' ? customCountryCode : countryCode;
    if (!activeCountryCode.trim()) { setPairError('Please select or enter a country code'); return; }
    if (!pairPhone.trim()) { setPairError('Please enter your phone number'); return; }
    const sanitizedNumber = sanitizePhoneNumber(activeCountryCode, pairPhone.trim());
    setPairingLoading(true);
    setPairError('');
    setPairingCode('');
    try {
      const result = await platformsAPI.pairWhatsApp(sanitizedNumber);
      setPairingCode(result.code);
    } catch (e: any) {
      setPairError(e.response?.data?.error || 'Pairing failed');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (!window.confirm('WARNING: Wiping the session will disconnect WhatsApp. You will need to scan the QR code again. Proceed?')) return;
    try {
      setActionLoading(true);
      await platformsAPI.clearWhatsAppSession();
      fetchWhatsAppStatusHttp();
    } catch (e: any) {
      alert('Failed to clear WhatsApp session: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncGroups = async () => {
    if (waStatus !== 'CONNECTED') return;
    try {
      setSyncingGroups(true);
      const groups = await platformsAPI.getWhatsAppGroups();
      setWaGroups(groups);
    } catch (e: any) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncingGroups(false);
    }
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
      <div className="border-b border-hairline-cool pb-4 flex items-center justify-between">
        <h3 className="text-md font-medium text-ink font-sans">WhatsApp Status</h3>
        {isWaMock && (
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">Mock Engine</span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-hairline rounded-sm min-h-[300px]">
        {waStatus === 'CONNECTED' ? (
          <div className="text-center space-y-3">
            <CheckCircle className="w-16 h-16 text-primary stroke-[1.25] mx-auto" />
            <h4 className="text-md font-medium text-ink">Engine Connected</h4>
            <p className="text-xs text-ink-mute">WhatsApp automation is connected and active. You can now broadcast messages.</p>
          </div>
        ) : waStatus === 'QR_READY' && qrCodeUrl ? (
          <div className="text-center space-y-4 w-full">
            <h4 className="text-sm font-medium text-ink">Scan QR to Login</h4>
            <div className="bg-canvas p-3 border border-hairline rounded shadow-sm inline-block">
              <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-[200px] h-[200px] block" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs text-primary font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>QR Code Active</span>
              </div>
              <p className={`text-[11px] font-medium ${countdown < 5 ? 'text-accent-tomato font-semibold' : 'text-ink-mute'}`}>
                {countdown > 0 ? `Next refresh in ${countdown}s` : 'Refreshing...'}
              </p>
            </div>
            <p className="text-[11px] text-ink-mute">Open WhatsApp → Linked Devices → Link a Device, then scan this QR code.</p>
          </div>
        ) : waStatus === 'CONNECTING' ? (
          <div className="text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto stroke-[1.5]" />
            <h4 className="text-sm font-medium text-ink">Connecting...</h4>
            <p className="text-xs text-ink-mute">Establishing connection to WhatsApp servers...</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-ink-mute stroke-[1.25] mx-auto" />
            <h4 className="text-sm font-medium text-ink">Not Connected</h4>
            <p className="text-xs text-ink-mute">WhatsApp is not linked. Use the QR code or phone pairing below to connect.</p>
          </div>
        )}
      </div>

      {isWaMock && (waStatus === 'QR_READY' || waStatus === 'DISCONNECTED') && (
        <div className="border-t border-hairline-cool pt-4">
          <div className="flex flex-col gap-2 p-3 bg-accent-yellow/5 border border-accent-yellow/20 rounded-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-yellow flex-shrink-0" />
              <p className="text-xs font-semibold text-ink">WhatsApp Engine is in Mock Mode</p>
            </div>
            <p className="text-xs text-ink-mute">
              The WhatsApp engine falls back to Mock Mode in serverless environments or if the client fails to connect.
              To connect your real WhatsApp account, ensure your persistent backend on Render is running and properly connected to the database.
            </p>
            <ul className="text-xs text-ink-mute list-disc pl-4 space-y-1">
              <li><strong>Locally:</strong> Run both the frontend and backend locally on your computer.</li>
              <li><strong>Production:</strong> Host the backend server on a persistent hosting service like Render, Railway, or a VPS.</li>
            </ul>
          </div>
        </div>
      )}

      {!isWaMock && (waStatus === 'QR_READY' || waStatus === 'DISCONNECTED') && (
        <div className="border-t border-hairline-cool pt-4 space-y-3">
          {!showPairInput ? (
            <button onClick={() => setShowPairInput(true)}
              className="w-full flex items-center justify-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
              Pair with Phone Number
            </button>
          ) : pairingCode ? (
            <div className="text-center space-y-3 p-4 bg-canvas-soft border border-primary/20 rounded-sm">
              <p className="text-xs font-medium text-ink-mute uppercase tracking-wider">Pairing Code</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-[0.3em] select-all">{pairingCode}</p>
              <div className="text-[11px] text-ink-mute space-y-1">
                <p>1. Open <strong>WhatsApp</strong> on your phone</p>
                <p>2. Go to <strong>Settings → Linked Devices → Link a Device</strong></p>
                <p>3. Tap <strong>"Link with phone number instead"</strong></p>
                <p>4. Enter this code: <strong className="text-primary">{pairingCode}</strong></p>
              </div>
              <button onClick={() => { setShowPairInput(false); setPairingCode(''); setPairPhone(''); setPairError(''); setCountryCode('880'); setCustomCountryCode(''); }}
                className="text-xs text-ink-mute hover:text-ink underline cursor-pointer">Done</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-mute">Select your country code and enter your phone number to receive a pairing code.</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="custom-select-wrapper min-w-[110px]">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                      className="custom-select block w-full pl-2 pr-7 py-2 border border-hairline rounded-sm text-xs bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-[38px] cursor-pointer hover:border-hairline-strong transition-all duration-150">
                      {COUNTRY_CODES.map((cc) => (
                        <option key={cc.code} value={cc.code}>{cc.flag} {cc.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  {countryCode === 'custom' && (
                    <input type="text" value={customCountryCode} onChange={(e) => setCustomCountryCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Code" className="w-[70px] px-2 py-2 border border-hairline rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary h-[38px]" />
                  )}
                  <input type="text" value={pairPhone} onChange={(e) => setPairPhone(e.target.value)}
                    placeholder={countryCode === '880' ? 'e.g. 1712345678' : 'e.g. 3001234567'}
                    className="flex-1 px-3 py-2 border border-hairline rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary h-[38px]" />
                </div>
                <button onClick={handlePairPhone} disabled={pairingLoading}
                  className="w-full px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50 h-[38px]">
                  {pairingLoading ? 'Sending...' : 'Request Code'}
                </button>
              </div>
              {pairError && <p className="text-xs text-accent-tomato">{pairError}</p>}
              <button onClick={() => { setShowPairInput(false); setPairPhone(''); setPairError(''); setCountryCode('880'); setCustomCountryCode(''); }}
                className="text-xs text-ink-mute hover:text-ink underline cursor-pointer">Cancel</button>
            </div>
          )}
        </div>
      )}

      {waStatus === 'CONNECTED' && (
        <div className="space-y-4">
          <button onClick={handleSyncGroups} disabled={syncingGroups}
            className="w-full flex items-center justify-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors duration-150 cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingGroups ? 'animate-spin' : ''}`} />
            {syncingGroups ? 'Syncing...' : 'Sync Active WhatsApp Groups'}
          </button>
          {waGroups.length > 0 && (
            <div className="space-y-2">
              <input type="text" placeholder="Search synced groups..." value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink placeholder-ink-mute/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              <div className="max-h-[150px] overflow-y-auto border border-hairline rounded-sm divide-y divide-hairline-cool p-1 bg-canvas-soft">
                <p className="text-[10px] uppercase font-semibold text-ink-mute px-2.5 py-1">Synced Groups</p>
                {waGroups.filter((g) => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).map((g) => (
                  <button key={g.id} onClick={() => {
                    setWaGroups([]);
                    window.dispatchEvent(new CustomEvent('whatsappGroupSelected', { detail: g }));
                  }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-ink-secondary hover:bg-canvas hover:text-ink truncate block">
                    {g.name}
                  </button>
                ))}
                {waGroups.filter((g) => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 && (
                  <p className="text-center py-3 text-xs text-ink-mute">No matching groups found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-hairline-cool space-y-2">
        <div className="flex gap-2">
          <button onClick={handleRestartWhatsApp} disabled={actionLoading || waStatus === 'CONNECTING'}
            className="w-1/2 flex items-center justify-center py-2 px-3 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Restart Engine
          </button>
          <button onClick={handleClearSession} disabled={actionLoading}
            className="w-1/2 flex items-center justify-center py-2 px-3 border border-accent-tomato/20 hover:border-accent-tomato/40 rounded-sm text-xs font-medium text-accent-tomato hover:bg-accent-tomato/5 transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppStatusCard;
