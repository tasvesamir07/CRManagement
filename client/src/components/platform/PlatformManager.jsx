import React, { useState, useEffect, useCallback } from 'react';
import { platformsAPI, coursesAPI } from '../../services/api';
import { Plus, Trash2, Edit2, Radio, CheckCircle, AlertTriangle, RefreshCw, X, Link as LinkIcon, ChevronDown, Flag, FlagOff } from 'lucide-react';
import QRCode from 'qrcode';
import { useWebSocket } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

const COUNTRY_CODES = [
  { code: '880', label: 'BD (+880)', flag: '🇧🇩' },
  { code: '91', label: 'IN (+91)', flag: '🇮🇳' },
  { code: '92', label: 'PK (+92)', flag: '🇵🇰' },
  { code: '1', label: 'US/CA (+1)', flag: '🇺🇸' },
  { code: '44', label: 'UK (+44)', flag: '🇬🇧' },
  { code: '966', label: 'SA (+966)', flag: '🇸🇦' },
  { code: '971', label: 'AE (+971)', flag: '🇦🇪' },
  { code: '60', label: 'MY (+60)', flag: '🇲🇾' },
  { code: '65', label: 'SG (+65)', flag: '🇸🇬' },
  { code: '61', label: 'AU (+61)', flag: '🇦🇺' },
  { code: '90', label: 'TR (+90)', flag: '🇹🇷' },
  { code: 'custom', label: 'Custom...', flag: '🌐' }
];

const sanitizePhoneNumber = (countryCode, phoneNumber) => {
  const cleanCode = countryCode.replace(/\D/g, '');
  let cleanNumber = phoneNumber.replace(/\D/g, '');

  if (cleanNumber.startsWith(cleanCode)) {
    return cleanNumber;
  }

  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }

  return cleanCode + cleanNumber;
};

  const PlatformManager = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [courseDefaults, setCourseDefaults] = useState({}); // courseId -> platformIds[]
  const [settingDefault, setSettingDefault] = useState(null); // platformId being set as default
  
  // WhatsApp connection states
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waQr, setWaQr] = useState('');
  const [isWaMock, setIsWaMock] = useState(false);
  const [waGroups, setWaGroups] = useState([]);
  const [syncingGroups, setSyncingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Telegram connection states
  const [tgStatus, setTgStatus] = useState('DISCONNECTED');
  const [isTgMock, setIsTgMock] = useState(true);

  // Messenger connection states
  const [messengerStatus, setMessengerStatus] = useState('DISCONNECTED');
  const [isMessengerMock, setIsMessengerMock] = useState(true);

  // Phone pairing states
  const [pairPhone, setPairPhone] = useState('');
  const [countryCode, setCountryCode] = useState('880');
  const [customCountryCode, setCustomCountryCode] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [showPairInput, setShowPairInput] = useState(false);

  // WhatsApp countdown and local QR states
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(20);
  const [actionLoading, setActionLoading] = useState(false);

  // Generate QR Code data URL when raw QR changes
  useEffect(() => {
    if (waQr && waStatus === 'QR_READY') {
      QRCode.toDataURL(waQr, { width: 200, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating local QR:', err));
    } else {
      setQrCodeUrl('');
    }
  }, [waQr, waStatus]);

  // Countdown timer for QR refresh (WhatsApp QR codes expire/refresh every ~20s)
  useEffect(() => {
    let interval = null;
    if (waStatus === 'QR_READY') {
      setCountdown(20);
      interval = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      setCountdown(20);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waQr, waStatus]);

  const handleRestartWhatsApp = async () => {
    try {
      setActionLoading(true);
      await platformsAPI.restartWhatsApp();
      fetchWhatsAppStatusHttp();
    } catch (e) {
      alert('Failed to restart WhatsApp: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePairPhone = async () => {
    const activeCountryCode = countryCode === 'custom' ? customCountryCode : countryCode;
    if (!activeCountryCode.trim()) {
      setPairError('Please select or enter a country code');
      return;
    }
    if (!pairPhone.trim()) {
      setPairError('Please enter your phone number');
      return;
    }
    
    // Sanitize and combine
    const sanitizedNumber = sanitizePhoneNumber(activeCountryCode, pairPhone.trim());
    
    setPairingLoading(true);
    setPairError('');
    setPairingCode('');
    try {
      const result = await platformsAPI.pairWhatsApp(sanitizedNumber);
      setPairingCode(result.code);
    } catch (e) {
      setPairError(e.response?.data?.error || 'Pairing failed');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (!window.confirm('WARNING: Wiping the session will disconnect WhatsApp. You will need to scan the QR code again. Proceed?')) {
      return;
    }
    try {
      setActionLoading(true);
      await platformsAPI.clearWhatsAppSession();
      fetchWhatsAppStatusHttp();
    } catch (e) {
      alert('Failed to clear WhatsApp session: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Platform creation form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('telegram');
  const [pChatId, setPChatId] = useState('');
  const [pTopicId, setPTopicId] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCourseId, setPCourseId] = useState(null);
  const [err, setErr] = useState('');

  const fetchPlatforms = async () => {
    try {
      const data = await platformsAPI.list();
      setPlatforms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await coursesAPI.list();
      setCourses(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourseDefaults = async () => {
    try {
      // Fetch defaults for all courses
      const defaults = {};
      for (const course of courses) {
        const courseData = await coursesAPI.get(course.id);
        if (courseData.default_platform_ids) {
          defaults[course.id] = courseData.default_platform_ids;
        }
      }
      setCourseDefaults(defaults);
    } catch (e) {
      console.error(e);
    }
  };

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

  const fetchTelegramStatus = async () => {
    try {
      const res = await platformsAPI.getTelegramStatus();
      setTgStatus(res.status);
      setIsTgMock(res.isMock);
    } catch (e) {
      console.error('Failed HTTP Telegram status fetch:', e);
    }
  };

  const fetchMessengerStatus = async () => {
    try {
      const res = await platformsAPI.getMessengerStatus();
      setMessengerStatus(res.status);
      setIsMessengerMock(res.isMock);
    } catch (e) {
      console.error('Failed HTTP Messenger status fetch:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPlatforms().finally(() => setLoading(false));
    fetchCourses().then(() => fetchCourseDefaults());
    fetchWhatsAppStatusHttp();
    fetchTelegramStatus();
    fetchMessengerStatus();

    const pollInterval = setInterval(fetchWhatsAppStatusHttp, 7000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'whatsapp_status') {
      setWaStatus(payload.data.status);
      setWaQr(payload.data.qr);
      setIsWaMock(payload.data.isMock);
    }
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const handleSyncGroups = async () => {
    if (waStatus !== 'CONNECTED') return;
    try {
      setSyncingGroups(true);
      const groups = await platformsAPI.getWhatsAppGroups();
      setWaGroups(groups);
    } catch (e) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncingGroups(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this broadcasting channel?')) {
      return;
    }
    try {
      setPlatforms(prev => prev.filter(p => p.id !== id));
      await platformsAPI.delete(id);
      fetchPlatforms();
    } catch (e) {
      alert('Delete failed');
      fetchPlatforms();
    }
  };

  const handleSetDefault = async (platformId, courseId) => {
    if (!window.confirm('Set this platform as default for this course?')) {
      return;
    }
    setSettingDefault(platformId);
    try {
      // Get current defaults for this course
      const currentDefaults = courseDefaults[courseId] || [];
      // Toggle: if already in defaults, remove it; otherwise add it
      const newDefaults = currentDefaults.includes(platformId)
        ? currentDefaults.filter(id => id !== platformId)
        : [...currentDefaults, platformId];
      
      await coursesAPI.setDefaultPlatforms(courseId, newDefaults);
      // Update local state
      setCourseDefaults(prev => ({ ...prev, [courseId]: newDefaults }));
      toast.success(currentDefaults.includes(platformId) ? 'Removed from course defaults' : 'Set as course default');
    } catch (e) {
      toast.error('Failed to update course defaults');
    } finally {
      setSettingDefault(null);
    }
  };

  const isDefaultForCourse = (platformId, courseId) => {
    return courseDefaults[courseId]?.includes(platformId) || false;
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.course_name : 'Unknown Course';
  };

  const handleSelectGroup = (group) => {
    setPName(group.name);
    setPChatId(group.id);
    setPType('whatsapp');
    setEditId(null);
    setShowForm(true);
  };

  const handleEdit = (platform) => {
    setEditId(platform.id);
    setPName(platform.platform_name);
    setPType(platform.platform_type);
    setPCourseId(platform.course_id || null);
    
    // Parse chat_id and topic_id
    if (platform.platform_type === 'telegram' && platform.chat_id.includes('/')) {
      const [chatId, topicId] = platform.chat_id.split('/');
      setPChatId(chatId);
      setPTopicId(topicId);
    } else {
      setPChatId(platform.chat_id);
      setPTopicId('');
    }
    
    setPDesc(platform.description || '');
    setShowForm(true);
    setErr('');
  };

  const handleCancelForm = () => {
    setPName('');
    setPChatId('');
    setPTopicId('');
    setPDesc('');
    setPCourseId(null);
    setEditId(null);
    setShowForm(false);
    setErr('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pName || !pChatId) {
      setErr('Please fill in name and ID');
      return;
    }
    setErr('');
    try {
      let finalChatId = pChatId.trim();
      if (pType === 'telegram' && pTopicId.trim()) {
        finalChatId = `${finalChatId}/${pTopicId.trim()}`;
      }

      const platformData = {
        platform_name: pName,
        platform_type: pType,
        chat_id: finalChatId,
        description: pDesc,
        course_id: pCourseId
      };

      if (editId) {
        await platformsAPI.update(editId, platformData);
      } else {
        await platformsAPI.create(platformData);
      }

      setPName('');
      setPChatId('');
      setPTopicId('');
      setPDesc('');
      setPCourseId(null);
      setEditId(null);
      setShowForm(false);
      fetchPlatforms();
    } catch (error) {
      setErr(error.response?.data?.error || 'Operation failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display-md tracking-tight font-sans text-ink">Broadcasting Channels</h1>
        <p className="text-sm text-ink-mute mt-1.5">Configure WhatsApp groups and Telegram channels that will receive class notices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Service Status (1 col) */}
        <div className="space-y-6">
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
          <div className="border-b border-hairline-cool pb-4 flex items-center justify-between">
            <h3 className="text-md font-medium text-ink font-sans">WhatsApp Status</h3>
            {isWaMock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">
                Mock Engine
              </span>
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
                  <img 
                    src={qrCodeUrl}
                    alt="WhatsApp QR Code"
                    className="w-[200px] h-[200px] block"
                  />
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

          {/* Phone Pairing Section - only when engine is real (not mock) */}
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
                <button
                  onClick={() => setShowPairInput(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
                >
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
                  <button
                    onClick={() => { 
                      setShowPairInput(false); 
                      setPairingCode(''); 
                      setPairPhone(''); 
                      setPairError(''); 
                      setCountryCode('880');
                      setCustomCountryCode('');
                    }}
                    className="text-xs text-ink-mute hover:text-ink underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-mute">Select your country code and enter your phone number to receive a pairing code.</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="custom-select-wrapper min-w-[110px]">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="custom-select block w-full pl-2 pr-7 py-2 border border-hairline rounded-sm text-xs bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-[38px] cursor-pointer hover:border-hairline-strong transition-all duration-150"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code}>
                              {cc.flag} {cc.label}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      
                      {countryCode === 'custom' && (
                        <input
                          type="text"
                          value={customCountryCode}
                          onChange={(e) => setCustomCountryCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Code"
                          className="w-[70px] px-2 py-2 border border-hairline rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary h-[38px]"
                        />
                      )}

                      <input
                        type="text"
                        value={pairPhone}
                        onChange={(e) => setPairPhone(e.target.value)}
                        placeholder={countryCode === '880' ? 'e.g. 1712345678' : 'e.g. 3001234567'}
                        className="flex-1 px-3 py-2 border border-hairline rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary h-[38px]"
                      />
                    </div>
                    
                    <button
                      onClick={handlePairPhone}
                      disabled={pairingLoading}
                      className="w-full px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50 h-[38px]"
                    >
                      {pairingLoading ? 'Sending...' : 'Request Code'}
                    </button>
                  </div>
                  {pairError && <p className="text-xs text-accent-tomato">{pairError}</p>}
                  <button
                    onClick={() => {
                      setShowPairInput(false);
                      setPairPhone('');
                      setPairError('');
                      setCountryCode('880');
                      setCustomCountryCode('');
                    }}
                    className="text-xs text-ink-mute hover:text-ink underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {waStatus === 'CONNECTED' && (
            <div className="space-y-4">
              <button
                onClick={handleSyncGroups}
                disabled={syncingGroups}
                className="w-full flex items-center justify-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors duration-150 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncingGroups ? 'animate-spin' : ''}`} />
                {syncingGroups ? 'Syncing...' : 'Sync Active WhatsApp Groups'}
              </button>
              
              {waGroups.length > 0 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search synced groups..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink placeholder-ink-mute/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  <div className="max-h-[150px] overflow-y-auto border border-hairline rounded-sm divide-y divide-hairline-cool p-1 bg-canvas-soft">
                    <p className="text-[10px] uppercase font-semibold text-ink-mute px-2.5 py-1">Synced Groups</p>
                    {waGroups
                      .filter((g) => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                      .map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handleSelectGroup(g)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-ink-secondary hover:bg-canvas hover:text-ink truncate block"
                        >
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
              <button
                onClick={handleRestartWhatsApp}
                disabled={actionLoading || waStatus === 'CONNECTING'}
                className="w-1/2 flex items-center justify-center py-2 px-3 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
                Restart Engine
              </button>
              <button
                onClick={handleClearSession}
                disabled={actionLoading}
                className="w-1/2 flex items-center justify-center py-2 px-3 border border-accent-tomato/20 hover:border-accent-tomato/40 rounded-sm text-xs font-medium text-accent-tomato hover:bg-accent-tomato/5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear Session
              </button>
            </div>
          </div>
        </div>

        {/* Telegram Status */}
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink font-sans">Telegram Status</h3>
            {isTgMock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">
                Disconnected
              </span>
            )}
          </div>
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-hairline rounded-sm min-h-[100px]">
            {!isTgMock ? (
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-primary stroke-[1.25] mx-auto" />
                <h4 className="text-sm font-medium text-ink">Bot Connected</h4>
                <p className="text-xs text-ink-mute">Telegram bot is active. Messages will be delivered.</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-ink-mute stroke-[1.25] mx-auto" />
                <h4 className="text-sm font-medium text-ink">Not Connected</h4>
                <p className="text-xs text-ink-mute">Telegram bot token is not configured. Set TELEGRAM_BOT_TOKEN in your .env file.</p>
              </div>
            )}
          </div>
          {!isTgMock && (
            <div className="pt-2 border-t border-hairline-cool">
              <div className="flex items-center gap-2 text-xs text-ink-mute">
                <span className={`w-1.5 h-1.5 rounded-full ${tgStatus === 'CONNECTED' ? 'bg-primary' : 'bg-accent-yellow'}`} />
                Status: {tgStatus}
              </div>
            </div>
          )}
        </div>

        {/* Facebook Messenger Status */}
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink font-sans">Messenger Status</h3>
            {isMessengerMock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">
                Disconnected
              </span>
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
        </div>
        </div>

        {/* Right Columns: Target Channels CRUD (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
              <h3 className="text-md font-medium text-ink font-sans">Active Target Registry</h3>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Link Channel
                </button>
              )}
            </div>

            {/* Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="p-4 bg-canvas-soft border border-hairline rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-hairline-cool pb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    {editId ? 'Edit Broadcast Target' : 'Link Broadcast Target'}
                  </h4>
                  <button type="button" onClick={handleCancelForm} className="text-ink-mute hover:text-ink cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {err && <div className="text-xs text-accent-tomato">{err}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                      Platform Type
                    </label>
                    <div className="custom-select-wrapper">
                      <select
                        value={pType}
                        onChange={(e) => setPType(e.target.value)}
                        className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm bg-canvas text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150 cursor-pointer"
                      >
                        <option value="telegram">Telegram Bot Channel</option>
                        <option value="whatsapp">WhatsApp Group JID</option>
                        <option value="messenger">Facebook Messenger Group</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                      Course (Optional)
                    </label>
                    <div className="custom-select-wrapper">
                      <select
                        value={pCourseId || ''}
                        onChange={(e) => setPCourseId(e.target.value || null)}
                        className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm bg-canvas text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150 cursor-pointer"
                      >
                        <option value="">No Course Association</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.course_id} - {course.course_name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-[9px] text-ink-mute mt-1">
                      Associate this platform with a course for default platform selection.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                      Channel / Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="e.g. SWE Course Channel"
                      className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                      Group / Chat ID / Thread ID
                    </label>
                    <input
                      type="text"
                      required
                      value={pChatId}
                      onChange={(e) => setPChatId(e.target.value)}
                      placeholder={
                        pType === 'telegram' 
                          ? 'e.g. -1001234567890' 
                          : pType === 'whatsapp' 
                          ? 'e.g. 12036329481920@g.us' 
                          : 'e.g. 123456789012345 (Group Thread ID)'
                      }
                      className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                    />
                  </div>

                  {pType === 'telegram' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                        Topic ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={pTopicId}
                        onChange={(e) => setPTopicId(e.target.value)}
                        placeholder="e.g. 42"
                        className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                      />
                      <p className="text-[9px] text-ink-mute mt-1">
                        For supergroups with Forum Topics enabled.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">
                      Description / Notes
                    </label>
                    <input
                      type="text"
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Main broadcasting group"
                      className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-hairline-cool">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3 py-1.5 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-sm text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors cursor-pointer"
                  >
                    {editId ? 'Save Changes' : 'Register Target'}
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {loading ? (
              <div className="py-8 text-center text-ink-mute text-sm">Loading platforms...</div>
            ) : platforms.length === 0 ? (
              <div className="py-12 text-center text-ink-mute text-sm">
                <Radio className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
                No targets registered. Click 'Link Channel' to hook up your first WhatsApp or Telegram broadcast group.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((p) => {
                  const isOnline = p.platform_type === 'whatsapp' 
                    ? waStatus === 'CONNECTED' 
                    : p.platform_type === 'telegram'
                    ? tgStatus === 'CONNECTED'
                    : messengerStatus === 'CONNECTED';
                  const isConfigured = p.service_available !== false;

                  return (
                    <div key={p.id} className={`p-4 border rounded-sm transition-all flex flex-col justify-between ${
                      p.is_active ? 'border-hairline hover:border-hairline-strong' : 'border-hairline-cool bg-canvas-soft/50'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              !isConfigured ? 'bg-accent-yellow' : isOnline ? 'bg-primary' : 'bg-ink-mute'
                            }`} />
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              p.platform_type === 'whatsapp' 
                                ? 'bg-primary/15 text-primary-deep' 
                                : p.platform_type === 'telegram' 
                                ? 'bg-accent-violet/15 text-accent-violet'
                                : 'bg-blue-600/15 text-blue-700'
                            }`}>
                              {p.platform_type}
                            </span>
                            {!isConfigured ? (
                              <span className="text-[10px] font-medium text-accent-yellow" title="Service not configured">
                                {p.platform_type === 'whatsapp' ? 'Disconnected' : p.platform_type === 'telegram' ? 'No Token' : 'No Session'}
                              </span>
                            ) : isOnline ? (
                              <span className="text-[10px] font-medium text-primary">Active</span>
                            ) : (
                              <span className="text-[10px] font-medium text-ink-mute">Offline</span>
                            )}
                          </div>
                        <div className="flex items-center gap-1">
                          {p.course_id && courses.length > 0 && (
                            <button
                              onClick={() => handleSetDefault(p.id, p.course_id)}
                              disabled={settingDefault === p.id}
                              className={`text-ink-mute hover:text-emerald-600 p-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer ${isDefaultForCourse(p.id, p.course_id) ? 'text-emerald-600' : ''}`}
                              title={isDefaultForCourse(p.id, p.course_id) ? 'Remove from course defaults' : 'Set as course default'}
                            >
                              {isDefaultForCourse(p.id, p.course_id) ? <Flag className="w-4 h-4 fill-current" /> : <FlagOff className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-ink-mute hover:text-primary p-1 rounded hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-ink-mute hover:text-accent-tomato p-1 rounded hover:bg-accent-tomato/10 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className={`text-md font-semibold mt-2.5 truncate ${p.is_active ? 'text-ink' : 'text-ink-mute'}`}>{p.platform_name}</h4>
                      {p.description && <p className="text-xs text-ink-mute mt-1">{p.description}</p>}
                      {p.course_id && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Flag className="w-3 h-3" />
                          Default for: {getCourseName(p.course_id)}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-2 border-t border-hairline-cool flex items-center justify-between text-[11px] font-mono text-ink-mute">
                      <span className="truncate max-w-[170px]" title={p.chat_id}>{p.chat_id}</span>
                      <LinkIcon className="w-3.5 h-3.5 text-hairline-strong" />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default PlatformManager;
