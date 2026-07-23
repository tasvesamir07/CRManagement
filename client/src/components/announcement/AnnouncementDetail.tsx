import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { announcementsAPI, filesAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { loadFontsFromHtml } from '../../lib/fontLoader';
import { htmlToWhatsappMarkdown, cleanHtmlForTelegram, stripHtml } from '../../lib/htmlParser';
import {
  ArrowLeft, Edit3, Trash2, CheckCircle, AlertTriangle, Clock, Paperclip, Clipboard, HelpCircle, Download, Check
} from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { confirm } from '../ui/ConfirmDialog';
import TroubleshootModal from '../ui/TroubleshootModal';
import type { Announcement, UploadedFile, DeliveryItem } from './types';

type PlatformTab = 'whatsapp' | 'telegram' | 'messenger' | 'original';

const AnnouncementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [troubleshootingError, setTroubleshootingError] = useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformTab>('whatsapp');

  const fetchAnnouncement = useCallback(async () => {
    if (!id) { navigate('/dashboard'); return; }
    setLoading(true);
    try {
      const data = await announcementsAPI.get(id);
      setAnnouncement(data);
    } catch {
      toast.error('Failed to load announcement');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  useEffect(() => {
    if (announcement && announcement.content) {
      loadFontsFromHtml(announcement.content);
    }
  }, [announcement]);

  useRefetchOnFocus(fetchAnnouncement);

  const handleWsMessage = useCallback((payload: { type: string; data: { id: number; status: string; sent_at?: string; delivery?: DeliveryItem[] } }) => {
    if (payload.type === 'announcement_status' && payload.data.id === parseInt(id || '')) {
      setAnnouncement(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.data.status,
          sent_at: payload.data.sent_at || prev.sent_at,
          delivery: payload.data.delivery && payload.data.delivery.length > 0
            ? payload.data.delivery
            : prev.delivery
        };
      });
    }
  }, [id]);

  useWebSocket({ onMessage: handleWsMessage });

  const handleDelete = async () => {
    if (!(await confirm('Delete this announcement permanently?', { title: 'Delete Announcement', variant: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      if (!id) return;
      await announcementsAPI.delete(id);
      toast.success('Announcement deleted');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const { url } = await filesAPI.getDownloadUrl(String(file.id));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Download failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary"><CheckCircle className="w-3 h-3 mr-1" /> Delivered</span>;
      case 'partial':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-yellow/15 text-ink"><AlertTriangle className="w-3 h-3 mr-1" /> Partial</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-tomato/15 text-accent-tomato"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</span>;
      case 'scheduled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-indigo/15 text-accent-indigo"><Clock className="w-3 h-3 mr-1" /> Scheduled</span>;
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute"><Clock className="w-3 h-3 mr-1" /> Draft</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!announcement) return null;

  const getFormattedMessageForPlatform = (platform: PlatformTab) => {
    if (!announcement || !announcement.content) return '';
    const rawText = announcement.content;
    const isHtml = rawText.startsWith('<') || /<[a-z][\s\S]*>/i.test(rawText);

    if (platform === 'whatsapp') {
      if (isHtml) {
        return htmlToWhatsappMarkdown(rawText);
      }
      return rawText;
    } else if (platform === 'telegram') {
      if (isHtml) {
        return cleanHtmlForTelegram(rawText);
      }
      return rawText
        .replace(/\*(.*?)\*/g, '<b>$1</b>')
        .replace(/_(.*?)_/g, '<i>$1</i>')
        .replace(/~(.*?)~/g, '<s>$1</s>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    } else if (platform === 'messenger') {
      if (isHtml) {
        return stripHtml(rawText);
      }
      return rawText
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~(.*?)~/g, '$1')
        .replace(/`(.*?)`/g, '$1');
    }
    return rawText;
  };

  const handleCopyPlatform = (platform: PlatformTab) => {
    const formatted = getFormattedMessageForPlatform(platform);
    if (!formatted) {
      toast.error('No content to copy!');
      return;
    }
    navigator.clipboard.writeText(formatted);
    const platformLabel = platform === 'whatsapp' ? 'WhatsApp' : platform === 'telegram' ? 'Telegram' : platform === 'messenger' ? 'Messenger' : 'Original';
    toast.success(`Copied formatted text for ${platformLabel}!`);
  };

  const canEdit = announcement.status === 'draft' || announcement.status === 'scheduled';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="inline-flex items-center text-xs text-ink-mute hover:text-ink mb-2">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-display-md tracking-tight font-sans text-ink">{announcement.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/announcement/edit/${announcement.id}`}
              className="flex items-center px-3 py-1.5 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> {announcement.status === 'scheduled' ? 'Edit Schedule' : 'Edit Draft'}
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center px-3 py-1.5 border border-accent-tomato/20 rounded-sm text-xs font-medium text-accent-tomato hover:bg-accent-tomato/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </button>
        </div>
      </div>

      {/* Meta info card */}
      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Status</p>
            <div className="mt-1.5">{getStatusBadge(announcement.status)}</div>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Category</p>
            <p className="text-sm font-medium text-ink mt-1 capitalize">{announcement.category.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Course</p>
            <p className="text-sm font-medium text-ink mt-1">{announcement.c_id || 'General'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Created By</p>
            <p className="text-sm font-medium text-ink mt-1">{announcement.created_by_name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Created</p>
            <p className="text-sm font-medium text-ink mt-1">{new Date(announcement.created_at).toLocaleString()}</p>
          </div>
          {announcement.sent_at && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Sent At</p>
              <p className="text-sm font-medium text-ink mt-1">{new Date(announcement.sent_at).toLocaleString()}</p>
            </div>
          )}
          {announcement.scheduled_at && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-mute tracking-wider">Scheduled</p>
              <p className="text-sm font-medium text-ink mt-1">{new Date(announcement.scheduled_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content & Platform Formats */}
      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Message Content</h3>
            <p className="text-xs text-ink-mute mt-0.5">View & copy pre-formatted message text for any delivery channel</p>
          </div>

          {/* Quick Copy Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyPlatform('whatsapp')}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[#25D366]/40 bg-[#25D366]/10 rounded-sm text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
              title="Copy formatted text for WhatsApp"
            >
              <FaWhatsapp className="w-3.5 h-3.5" />
              Copy WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleCopyPlatform('telegram')}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[#0088CC]/40 bg-[#0088CC]/10 rounded-sm text-xs font-medium text-[#0088CC] hover:bg-[#0088CC]/20 transition-colors cursor-pointer"
              title="Copy formatted text for Telegram"
            >
              <FaTelegram className="w-3.5 h-3.5" />
              Copy Telegram
            </button>
            <button
              type="button"
              onClick={() => handleCopyPlatform('messenger')}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[#00B2FF]/40 bg-[#00B2FF]/10 rounded-sm text-xs font-medium text-[#00B2FF] hover:bg-[#00B2FF]/20 transition-colors cursor-pointer"
              title="Copy plain text for Messenger"
            >
              <FaFacebookMessenger className="w-3.5 h-3.5" />
              Copy Messenger
            </button>
          </div>
        </div>

        {/* Platform View Tabs */}
        <div className="flex items-center gap-2 border-b border-hairline pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActivePlatformTab('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
              activePlatformTab === 'whatsapp'
                ? 'bg-[#25D366]/15 text-[#25D366] font-semibold border border-[#25D366]/30'
                : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
            }`}
          >
            <FaWhatsapp className="w-3.5 h-3.5" /> WhatsApp View
          </button>
          <button
            type="button"
            onClick={() => setActivePlatformTab('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
              activePlatformTab === 'telegram'
                ? 'bg-[#0088CC]/15 text-[#0088CC] font-semibold border border-[#0088CC]/30'
                : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
            }`}
          >
            <FaTelegram className="w-3.5 h-3.5" /> Telegram View
          </button>
          <button
            type="button"
            onClick={() => setActivePlatformTab('messenger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
              activePlatformTab === 'messenger'
                ? 'bg-[#00B2FF]/15 text-[#00B2FF] font-semibold border border-[#00B2FF]/30'
                : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
            }`}
          >
            <FaFacebookMessenger className="w-3.5 h-3.5" /> Messenger View
          </button>
        </div>

        {/* Preview Box */}
        <div className="bg-canvas-night text-on-dark rounded-lg p-4 font-sans text-sm leading-relaxed relative group">
          <button
            type="button"
            onClick={() => handleCopyPlatform(activePlatformTab)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-sm text-xs font-medium transition-colors cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Copy {activePlatformTab.charAt(0).toUpperCase() + activePlatformTab.slice(1)} Format
          </button>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed pt-6 sm:pt-0 pr-24">
            {getFormattedMessageForPlatform(activePlatformTab)}
          </pre>
        </div>
      </div>

      {/* Delivery Status */}
      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-mute mb-4">Delivery Status</h3>
        {announcement.delivery && announcement.delivery.length > 0 ? (
          <div className="space-y-3">
            {announcement.delivery.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-hairline rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-canvas-soft flex items-center justify-center border border-hairline">
                    {d.platform_type === 'whatsapp' ? (
                      <FaWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} /> 
                    ) : d.platform_type === 'telegram' ? (
                      <FaTelegram className="w-4 h-4" style={{ color: '#0088CC' }} />
                    ) : (
                      <FaFacebookMessenger className="w-4 h-4" style={{ color: '#00B2FF' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{d.platform_name}</p>
                    <p className="text-xs text-ink-mute font-mono">{d.chat_id || d.platform_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.platform_status === 'sent'
                      ? 'bg-primary/15 text-primary'
                      : d.platform_status === 'failed'
                        ? 'bg-accent-tomato/15 text-accent-tomato'
                        : 'bg-hairline/50 text-ink-mute'
                  }`}>
                    {d.platform_status}
                  </span>
                  {d.error_message && (
                    <div className="mt-1 text-right">
                      <p className="text-[10px] text-accent-tomato max-w-[200px] truncate">{d.error_message}</p>
                      <button
                        type="button"
                        onClick={() => setTroubleshootingError(d.error_message || '')}
                        className="inline-flex items-center text-[10px] font-semibold text-primary hover:text-primary-deep mt-0.5 hover:underline cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 mr-0.5" /> Troubleshoot
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-mute">No platforms targeted for this announcement.</p>
        )}
      </div>

      {/* Attachments */}
      {announcement.files && announcement.files.length > 0 && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-mute mb-4">Attachments</h3>
          <div className="space-y-2">
            {announcement.files.map((f, i) => (
              <div key={f.id || i} className="flex items-center justify-between p-3 border border-hairline rounded-sm">
                <div className="flex items-center gap-3">
                  <Paperclip className="w-4 h-4 text-ink-mute" />
                  <span className="text-sm text-ink">{f.original_name}</span>
                  <span className="text-xs text-ink-mute">({(f.file_size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(f)}
                  className="p-1.5 text-ink-mute hover:text-primary hover:bg-primary/10 rounded-sm transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        {canEdit && (
          <Link
            to={`/announcement/edit/${announcement.id}`}
            className="flex items-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
          >
            <Edit3 className="w-4 h-4 mr-2" /> {announcement.status === 'scheduled' ? 'Edit Schedule' : 'Edit & Broadcast'}
          </Link>
        )}
      </div>

      <TroubleshootModal errorMessage={troubleshootingError} onClose={() => setTroubleshootingError(null)} />
    </div>
  );
};

export default AnnouncementDetail;
