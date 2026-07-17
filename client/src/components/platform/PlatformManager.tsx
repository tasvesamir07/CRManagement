import { useState, useEffect, useCallback } from 'react';
import { platformsAPI, coursesAPI } from '../../services/api';
import { Plus, Radio } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import WhatsAppStatusCard from './WhatsAppStatusCard';
import TelegramStatusCard from './TelegramStatusCard';
import MessengerStatusCard from './MessengerStatusCard';
import ChannelForm from './ChannelForm';
import ChannelCard from './ChannelCard';
import toast from 'react-hot-toast';

interface Platform {
  id: string;
  platform_name: string;
  platform_type: 'telegram' | 'whatsapp' | 'messenger';
  chat_id: string;
  description?: string;
  course_id?: string;
  is_active: boolean;
  service_available?: boolean;
}

interface Course {
  id: string;
  course_id: string;
  course_name: string;
  default_platform_ids?: string[];
}

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface WsPayload {
  type: string;
  data: {
    status: string;
    qr: string;
    isMock: boolean;
  };
}

const PlatformManager = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseDefaults, setCourseDefaults] = useState<Record<string, string[]>>({});
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waQr, setWaQr] = useState('');
  const [isWaMock, setIsWaMock] = useState(false);
  const [tgStatus, setTgStatus] = useState('DISCONNECTED');
  const [isTgMock, setIsTgMock] = useState(true);
  const [messengerStatus, setMessengerStatus] = useState('DISCONNECTED');
  const [isMessengerMock, setIsMessengerMock] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('telegram');
  const [pChatId, setPChatId] = useState('');
  const [pTopicId, setPTopicId] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCourseId, setPCourseId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const handleGroupSelect = (e: CustomEvent<WhatsAppGroup>) => {
      const group = e.detail;
      setPName(group.name);
      setPChatId(group.id);
      setPType('whatsapp');
      setEditId(null);
      setShowForm(true);
    };
    window.addEventListener('whatsappGroupSelected', handleGroupSelect as EventListener);
    return () => window.removeEventListener('whatsappGroupSelected', handleGroupSelect as EventListener);
  }, []);

  const fetchPlatforms = useCallback(async () => {
    try { setPlatforms(await platformsAPI.list() as Platform[]); } catch (e) { console.error(e); }
  }, []);

  const fetchCourses = useCallback(async () => {
    try { setCourses(await coursesAPI.list() as Course[]); } catch (e) { console.error(e); }
  }, []);

  const fetchCourseDefaults = useCallback(async () => {
    try {
      const defaults: Record<string, string[]> = {};
      for (const course of courses) {
        const courseData = await coursesAPI.get(course.id) as Course;
        if (courseData.default_platform_ids) defaults[course.id] = courseData.default_platform_ids;
      }
      setCourseDefaults(defaults);
    } catch (e) { console.error(e); }
  }, [courses]);

  const fetchTelegramStatus = useCallback(async () => {
    try {
      const res = await platformsAPI.getTelegramStatus() as { status: string; isMock: boolean };
      setTgStatus(res.status);
      setIsTgMock(res.isMock);
    } catch (e) { console.error(e); }
  }, []);

  const fetchMessengerStatus = useCallback(async () => {
    try {
      const res = await platformsAPI.getMessengerStatus() as { status: string; isMock: boolean };
      setMessengerStatus(res.status);
      setIsMessengerMock(res.isMock);
    } catch (e) { console.error(e); }
  }, []);

  const handleWsMessage = useCallback((payload: WsPayload) => {
    if (payload.type === 'whatsapp_status') {
      setWaStatus(payload.data.status);
      setWaQr(payload.data.qr);
      setIsWaMock(payload.data.isMock);
    }
  }, []);

  const { isConnected } = useWebSocket({ onMessage: handleWsMessage });

  useEffect(() => {
    setLoading(true);
    fetchPlatforms().finally(() => setLoading(false));
    fetchCourses().then(() => fetchCourseDefaults());
    fetchTelegramStatus();
    fetchMessengerStatus();
  }, [fetchPlatforms, fetchCourses, fetchCourseDefaults, fetchTelegramStatus, fetchMessengerStatus]);

  useEffect(() => {
    if (isConnected) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await platformsAPI.getWhatsAppStatus() as { status: string; qr: string; isMock: boolean };
        setWaStatus(res.status);
        setWaQr(res.qr);
        setIsWaMock(res.isMock);
      } catch { /* ignore */ }
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [isConnected]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this broadcasting channel?')) return;
    try {
      setPlatforms(prev => prev.filter(p => p.id !== id));
      await platformsAPI.delete(id);
      fetchPlatforms();
    } catch {
      alert('Delete failed');
      fetchPlatforms();
    }
  };

  const handleSetDefault = async (platformId: string, courseId: string) => {
    if (!window.confirm('Set this platform as default for this course?')) return;
    setSettingDefault(platformId);
    try {
      const currentDefaults = courseDefaults[courseId] || [];
      const newDefaults = currentDefaults.includes(platformId)
        ? currentDefaults.filter(id => id !== platformId)
        : [...currentDefaults, platformId];
      await coursesAPI.setDefaultPlatforms(courseId, newDefaults);
      setCourseDefaults(prev => ({ ...prev, [courseId]: newDefaults }));
      toast.success(currentDefaults.includes(platformId) ? 'Removed from course defaults' : 'Set as course default');
    } catch {
      toast.error('Failed to update course defaults');
    } finally {
      setSettingDefault(null);
    }
  };

  const handleEdit = (platform: Platform) => {
    setEditId(platform.id);
    setPName(platform.platform_name);
    setPType(platform.platform_type);
    setPCourseId(platform.course_id || null);
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
    setPName(''); setPChatId(''); setPTopicId(''); setPDesc('');
    setPCourseId(null); setEditId(null); setShowForm(false); setErr('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pChatId) { setErr('Please fill in name and ID'); return; }
    setErr('');
    try {
      let finalChatId = pChatId.trim();
      if (pType === 'telegram' && pTopicId.trim()) finalChatId = `${finalChatId}/${pTopicId.trim()}`;
      const platformData = { platform_name: pName, platform_type: pType, chat_id: finalChatId, description: pDesc, course_id: pCourseId };
      if (editId) await platformsAPI.update(editId, platformData);
      else await platformsAPI.create(platformData);
      handleCancelForm();
      fetchPlatforms();
    } catch (error: any) {
      setErr(error.response?.data?.error || 'Operation failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-md tracking-tight font-sans text-ink">Broadcasting Channels</h1>
        <p className="text-sm text-ink-mute mt-1.5">Configure WhatsApp groups and Telegram channels that will receive class notices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <WhatsAppStatusCard waStatus={waStatus} setWaStatus={setWaStatus}
            waQr={waQr} setWaQr={setWaQr} isWaMock={isWaMock} setIsWaMock={setIsWaMock} />
          <TelegramStatusCard tgStatus={tgStatus} isTgMock={isTgMock} />
          <MessengerStatusCard messengerStatus={messengerStatus} isMessengerMock={isMessengerMock}
            onAppStateSaved={fetchMessengerStatus} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
              <h3 className="text-md font-medium text-ink font-sans">Active Target Registry</h3>
              {!showForm && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Link Channel
                </button>
              )}
            </div>

            {showForm && (
              <ChannelForm editId={editId} pName={pName} setPName={setPName}
                pType={pType} setPType={setPType} pChatId={pChatId} setPChatId={setPChatId}
                pTopicId={pTopicId} setPTopicId={setPTopicId} pDesc={pDesc} setPDesc={setPDesc}
                pCourseId={pCourseId} setPCourseId={setPCourseId} courses={courses}
                err={err} onSubmit={handleSubmit} onCancel={handleCancelForm} />
            )}

            {loading ? (
              <div className="py-8 text-center text-ink-mute text-sm">Loading platforms...</div>
            ) : platforms.length === 0 ? (
              <div className="py-12 text-center text-ink-mute text-sm">
                <Radio className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
                No targets registered. Click 'Link Channel' to hook up your first WhatsApp or Telegram broadcast group.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map(p => (
                  <ChannelCard key={p.id} platform={p}
                    waStatus={waStatus} tgStatus={tgStatus} messengerStatus={messengerStatus}
                    courseDefaults={courseDefaults} courses={courses} settingDefault={settingDefault}
                    onEdit={handleEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformManager;
