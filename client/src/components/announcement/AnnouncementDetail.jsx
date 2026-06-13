import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { announcementsAPI, filesAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Paperclip,
  Clipboard,
  HelpCircle,
  X,
  Download
} from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import toast from 'react-hot-toast';

const troubleshootError = (errorStr) => {
  if (!errorStr) return null;
  const lower = errorStr.toLowerCase();
  
  if (lower.includes('thread not found') || lower.includes('message thread not found') || lower.includes('message thread no')) {
    return {
      title: 'Telegram Topic/Thread Missing',
      explanation: 'The Telegram broadcast was sent to a topic/thread ID that does not exist or was deleted in that group.',
      steps: [
        'Open the target Telegram group and check if the topic/thread still exists.',
        'If the topic was deleted, recreate it in Telegram.',
        'Go to "Broadcasting Targets" in the sidebar, edit the Telegram platform, and update the Chat ID suffix (e.g. -100xxxxxxxx/thread_id) with the correct thread ID.',
        'Ensure the Telegram bot is permitted to post inside topics.'
      ]
    };
  }
  
  if (lower.includes('chat not found') || lower.includes('chat_id_invalid')) {
    return {
      title: 'Chat/Group Not Found',
      explanation: 'The Telegram bot cannot find the chat or group ID specified in the platform setup.',
      steps: [
        'Ensure the Telegram Bot token in the server configuration (.env) is correct.',
        'Double-check that the Chat ID in "Broadcasting Targets" is correct (group IDs usually start with -100).',
        'Make sure the Telegram Bot has been added as a member/administrator to the target group.'
      ]
    };
  }
  
  if (lower.includes('bot was blocked') || lower.includes('user is deactivated')) {
    return {
      title: 'Bot Blocked/Kicked',
      explanation: 'The bot was blocked by the user or removed from the group chat.',
      steps: [
        'Ensure the bot is still a member of the group/channel.',
        'If it is a private chat, the target user must start the chat with the bot first by clicking "/start".',
        'Verify the bot has not been banned or restricted.'
      ]
    };
  }
  
  if (lower.includes('admin') || lower.includes('not enough rights') || lower.includes('privileges')) {
    return {
      title: 'Insufficient Permissions',
      explanation: 'The bot does not have permission to post messages in the selected group or channel.',
      steps: [
        'Promote the Telegram Bot to an Administrator in the group/channel settings.',
        'Make sure the administrator permission "Post Messages" (or "Send Messages") is enabled for the bot.'
      ]
    };
  }
  
  if (lower.includes('whatsapp') && (lower.includes('session') || lower.includes('close') || lower.includes('not paired') || lower.includes('disconnected'))) {
    return {
      title: 'WhatsApp Session Disconnected',
      explanation: 'The WhatsApp service is running in mock mode or its authentication session has expired.',
      steps: [
        'Go to "Broadcasting Targets" in the sidebar.',
        'Check the status badge for WhatsApp.',
        'If disconnected, follow the pairing instructions (scan QR code or use a pairing code) to re-authenticate the device.'
      ]
    };
  }
  
  if (lower.includes('quota') || lower.includes('limit') || lower.includes('size')) {
    return {
      title: 'Size or Rate Limit Exceeded',
      explanation: 'The payload or attachment is too large, or you are broadcasting too many messages at once.',
      steps: [
        'Verify that your file attachments are within size limits (WhatsApp/Telegram have limits around 16MB - 50MB depending on type).',
        'If sending a large notice with multiple attachments, use the "Schedule" feature instead of sending immediately to allow staggered dispatch.'
      ]
    };
  }

  if (lower.includes('text is empty') || lower.includes('message text is empty') || lower.includes('empty text') || lower.includes('body is empty')) {
    return {
      title: 'Empty Message Content',
      explanation: 'The Telegram broadcast failed because the compiled message body was empty.',
      steps: [
        'Ensure the notice content is not blank before sending.',
        'If broadcasting a "Share File" notice, verify that you have uploaded at least one attachment.',
        'If using a template, verify that all variables are filled out so that the compiled content is not empty.'
      ]
    };
  }

  return {
    title: 'General Delivery Failure',
    explanation: 'An unexpected platform or network error occurred during broadcast delivery.',
    steps: [
      'Check the server console logs for full stack traces.',
      'Verify internet connectivity and external platform API status.',
      'Double check that the broadcasting target channel details are valid.'
    ]
  };
};

const AnnouncementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [troubleshootingError, setTroubleshootingError] = useState(null);

  const fetchAnnouncement = async () => {
    try {
      const data = await announcementsAPI.get(id);
      setAnnouncement(data);
    } catch (err) {
      toast.error('Failed to load announcement');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnnouncement();
  }, [id, navigate]);

  // Refetch on window focus to avoid stale data when navigating back
  useEffect(() => {
    const handleFocus = () => {
      fetchAnnouncement();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'announcement_status' && payload.data.id === parseInt(id)) {
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
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      await announcementsAPI.delete(id);
      toast.success('Announcement deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleDownload = async (file) => {
    try {
      const { url } = await filesAPI.getDownloadUrl(file.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const getStatusBadge = (status) => {
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

      {/* Content */}
      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Message Content</h3>
          <button type="button" onClick={() => { navigator.clipboard.writeText(announcement.content); toast.success('Message copied!'); }} className="flex items-center gap-1.5 px-2.5 py-1 border border-hairline rounded-sm text-xs font-medium text-ink-mute hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer"><Clipboard className="w-3.5 h-3.5" />Copy</button>
        </div>
        <div className="bg-canvas-night text-on-dark rounded-lg p-4 font-sans text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{announcement.content}</pre>
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
                        onClick={() => setTroubleshootingError(d.error_message)}
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

      {troubleshootingError && createPortal(
        (() => {
          const troubleshoot = troubleshootError(troubleshootingError);
          return (
            <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-canvas border border-hairline rounded-lg w-full max-w-md shadow-xl p-6 relative">
                <button
                  onClick={() => setTroubleshootingError(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-canvas-soft rounded cursor-pointer"
                >
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
                      {troubleshootingError}
                    </p>
                  </div>
                  
                  {troubleshoot && (
                    <>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">{troubleshoot.title}</span>
                        <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                          {troubleshoot.explanation}
                        </p>
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
                  <button
                    onClick={() => setTroubleshootingError(null)}
                    className="px-4 py-2 bg-ink text-on-dark hover:bg-ink-secondary text-xs font-medium rounded-sm transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default AnnouncementDetail;