import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { logsAPI, announcementsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Trash2
} from 'lucide-react';

const LogsManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch logs
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        userId: searchUserId || undefined
      };
      const data = await logsAPI.list(params);
      setLogs(data.logs || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalLogs(data.pagination.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load logs');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter, searchUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const handleRefresh = () => {
    setPage(1);
    setRefreshTrigger(prev => prev + 1);
    toast.success('Logs updated');
  };

  const handleClearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setSearchUserId('');
    setPage(1);
  };

  const handleDeleteLog = async (logId, event) => {
    event.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this log entry?')) return;
    try {
      setLogs(prev => prev.filter(l => l.id !== logId));
      await logsAPI.delete(logId);
      toast.success('Log entry deleted');
      if (logs.length === 1 && page > 1) {
        setPage(prev => prev - 1);
      } else {
        fetchLogs(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete log');
      fetchLogs();
    }
  };

  const handleClearLogs = async () => {
    const confirmMsg = isAdmin 
      ? 'Are you sure you want to delete ALL system audit logs? This cannot be undone.'
      : 'Are you sure you want to clear all your notice delivery logs?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await logsAPI.clear();
      toast.success('Logs cleared successfully');
      setPage(1);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear logs');
    }
  };

  const handleRetrySend = async (announcementId) => {
    try {
      toast.loading('Retrying broadcast...', { id: 'retry-toast' });
      await announcementsAPI.send(announcementId);
      toast.success('Broadcast resent successfully!', { id: 'retry-toast' });
      handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to retry broadcast', { id: 'retry-toast' });
    }
  };

  // Helper to parse JSON details
  const parseDetails = (detailsStr) => {
    if (!detailsStr) return null;
    try {
      if (typeof detailsStr === 'object') return detailsStr;
      return JSON.parse(detailsStr);
    } catch (e) {
      return detailsStr;
    }
  };

  // Human-friendly Action names
  const getActionLabel = (action) => {
    switch (action) {
      case 'announcement.delivery_failed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-tomato/15 text-accent-tomato">Delivery Failed</span>;
      case 'announcement.delivery_sent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">Delivery Success</span>;
      case 'announcement.broadcast_completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-violet/15 text-accent-violet">Broadcast End</span>;
      case 'admin.create_user':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-indigo/15 text-accent-indigo">User Created</span>;
      case 'admin.update_user':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-violet/15 text-accent-violet">User Updated</span>;
      case 'admin.delete_user':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-tomato/15 text-accent-tomato">User Removed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-hairline-strong/15 text-ink-mute capitalize">{action.replace(/[._]/g, ' ')}</span>;
    }
  };

  // Troubleshooter advisor logic
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">
            {isAdmin ? 'System Audit Logs' : 'Broadcast & Delivery Logs'}
          </h1>
          <p className="text-sm text-ink-mute mt-1.5">
            {isAdmin 
              ? 'View all administrative events, user updates, and delivery history logs.'
              : 'View status history and troubleshooting advice for your notice broadcasts.'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="flex items-center px-3 py-1.5 border border-accent-tomato/20 rounded-sm text-xs font-medium text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {isAdmin ? 'Clear All Logs' : 'Clear Logs'}
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-1.5 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Card */}
      {/* Desktop Filters */}
      <div className="hidden md:block bg-canvas border border-hairline rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-mute" />
            <span className="text-xs font-semibold uppercase text-ink-mute tracking-wider">Filters</span>
          </div>

          {/* Action Type Filter */}
          <div className="w-48">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="block w-full px-2 py-1.5 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Event Types</option>
              <option value="announcement.delivery_failed">Delivery Failures</option>
              <option value="announcement.delivery_sent">Delivery Successes</option>
              <option value="announcement.broadcast_completed">Completed Broadcasts</option>
              {isAdmin && (
                <>
                  <option value="admin.create_user">User Creation</option>
                  <option value="admin.update_user">User Updates</option>
                  <option value="admin.delete_user">User Removals</option>
                </>
              )}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="w-40">
            <select
              value={entityTypeFilter}
              onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
              className="block w-full px-2 py-1.5 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Entities</option>
              <option value="announcement">Announcements</option>
              {isAdmin && <option value="user">Users</option>}
            </select>
          </div>

          {/* Admin-only User ID filter */}
          {isAdmin && (
            <div className="relative flex-1 max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-ink-mute" />
              </span>
              <input
                type="text"
                placeholder="Filter by User ID..."
                value={searchUserId}
                onChange={(e) => { setSearchUserId(e.target.value); setPage(1); }}
                className="block w-full pl-8 pr-3 py-1.5 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {(actionFilter || entityTypeFilter || searchUserId) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center text-xs text-accent-tomato hover:text-accent-tomato/80 font-medium cursor-pointer"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear Filters
            </button>
          )}

          <div className="ml-auto text-xs text-ink-mute">
            Found {totalLogs} events
          </div>
        </div>
      </div>

      {/* Mobile Filters Trigger Bar */}
      <div className="flex md:hidden items-center justify-between gap-3 bg-canvas border border-hairline rounded-lg p-3 shadow-sm">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 px-3 py-2 border border-hairline rounded-sm text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft/80"
        >
          <Filter className="w-3.5 h-3.5 text-primary" />
          Filter Events {(actionFilter || entityTypeFilter || searchUserId) ? '(Active)' : ''}
        </button>
        {(actionFilter || entityTypeFilter || searchUserId) && (
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center p-2 border border-accent-tomato/20 rounded-sm text-accent-tomato hover:bg-accent-tomato/5"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile Filters Drawer Bottom Sheet */}
      {filtersOpen && createPortal(
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-end justify-center z-50 md:hidden" onClick={() => setFiltersOpen(false)}>
          <div className="bg-canvas border-t border-hairline rounded-t-xl w-full max-h-[80vh] flex flex-col p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-ink">Filter Logs</h3>
              </div>
              <button onClick={() => setFiltersOpen(false)} className="p-1 hover:bg-canvas-soft rounded">
                <X className="w-4 h-4 text-ink-mute" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto pb-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Event Type</label>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none"
                >
                  <option value="">All Event Types</option>
                  <option value="announcement.delivery_failed">Delivery Failures</option>
                  <option value="announcement.delivery_sent">Delivery Successes</option>
                  <option value="announcement.broadcast_completed">Completed Broadcasts</option>
                  {isAdmin && (
                    <>
                      <option value="admin.create_user">User Creation</option>
                      <option value="admin.update_user">User Updates</option>
                      <option value="admin.delete_user">User Removals</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Entity Type</label>
                <select
                  value={entityTypeFilter}
                  onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
                  className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none"
                >
                  <option value="">All Entities</option>
                  <option value="announcement">Announcements</option>
                  {isAdmin && <option value="user">Users</option>}
                </select>
              </div>
              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">User ID</label>
                  <input
                    type="text"
                    placeholder="Filter by User ID..."
                    value={searchUserId}
                    onChange={(e) => { setSearchUserId(e.target.value); setPage(1); }}
                    className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2 border-t border-hairline">
              <button
                onClick={() => { handleClearFilters(); setFiltersOpen(false); }}
                className="flex-1 py-2 border border-hairline rounded-sm text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 py-2 bg-primary hover:bg-primary-deep text-white rounded-sm text-xs font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Logs Table */}
      <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-ink-mute">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-ink-mute space-y-3">
            <ClipboardList className="w-12 h-12 text-hairline-strong mx-auto stroke-[1]" />
            <p className="text-sm">No log events match your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline-cool">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-mute uppercase tracking-wider bg-canvas-soft/40">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Event / Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-cool text-sm text-ink-secondary">
                  {logs.map((log) => {
                    const details = parseDetails(log.details);
                    const isError = log.action.includes('failed');
                    return (
                      <tr key={log.id} className="hover:bg-canvas-soft/30 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-ink-mute">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          {log.display_name || log.username || `User ID: ${log.user_id}`}
                        </td>
                        <td className="py-3 px-4">
                          {getActionLabel(log.action)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.entity_type && (
                            <span className="font-semibold text-ink-mute capitalize">
                              {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-ink-mute">
                          {log.ip_address || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center px-2 py-1 text-xs border border-hairline rounded-sm text-ink-mute hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </button>
                            <button
                              onClick={(e) => handleDeleteLog(log.id, e)}
                              className="inline-flex items-center px-2 py-1 text-xs border border-accent-tomato/20 rounded-sm text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer"
                              title="Delete log entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-Based View */}
            <div className="md:hidden divide-y divide-hairline-cool bg-canvas">
              {logs.map((log) => {
                const details = parseDetails(log.details);
                const isExpanded = expandedLogId === log.id;
                const errorMsg = details?.error || details?.message;
                const troubleshoot = troubleshootError(errorMsg);

                return (
                  <div 
                    key={log.id} 
                    className={`p-4 space-y-3 cursor-pointer transition-colors ${isExpanded ? 'bg-canvas-soft/30' : 'hover:bg-canvas-soft/10'}`}
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-ink-mute">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {getActionLabel(log.action)}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-ink font-semibold">
                          {log.display_name || log.username || `User #${log.user_id}`}
                        </span>
                        {log.entity_type && (
                          <span className="text-ink-mute block">
                            Entity: <span className="capitalize">{log.entity_type}</span> {log.entity_id ? `#${log.entity_id}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-mute font-mono">
                        {log.ip_address || 'No IP'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-hairline-cool/40 space-y-3 text-xs" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-ink-mute/70 mb-1">IP Address</span>
                          <span className="font-mono text-ink-secondary">{log.ip_address || '—'}</span>
                        </div>

                        {troubleshoot && (
                          <div className="bg-accent-tomato/5 border border-accent-tomato/20 rounded p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-accent-tomato font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {troubleshoot.title}
                            </div>
                            <p className="text-[11px] text-ink-secondary leading-relaxed">
                              {troubleshoot.explanation}
                            </p>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-accent-tomato tracking-wider block">Suggested Fixes:</span>
                              <ul className="list-decimal pl-4 text-[11px] text-ink-secondary space-y-0.5">
                                {troubleshoot.steps.map((step, idx) => (
                                  <li key={idx} className="leading-tight">{step}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-bold text-ink-mute/70">Raw Event Metadata</span>
                          <pre className="bg-canvas-night text-on-dark text-[10px] p-3 rounded font-mono overflow-x-auto max-h-32 whitespace-pre-wrap">
                            {JSON.stringify(details, null, 2)}
                          </pre>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          {selectedLog?.entity_type === 'announcement' && selectedLog?.entity_id && (
                            <button
                              onClick={() => handleRetrySend(log.entity_id)}
                              className="px-2.5 py-1.5 bg-accent-tomato hover:bg-accent-tomato-deep text-white rounded-sm text-[11px] font-semibold cursor-pointer"
                            >
                              Retry Broadcast
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-hairline rounded text-[11px] font-semibold text-ink hover:bg-canvas-soft cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Modal
                          </button>
                          <button
                            onClick={(e) => handleDeleteLog(log.id, e)}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-accent-tomato/20 rounded text-[11px] font-semibold text-accent-tomato hover:bg-accent-tomato/5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Log
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-canvas-soft/20 border-t border-hairline">
            <div className="text-xs text-ink-mute">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1 border border-hairline rounded-sm hover:bg-canvas disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-ink-secondary" />
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1 border border-hairline rounded-sm hover:bg-canvas disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-ink-secondary" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details & Troubleshooter Modal */}
      {selectedLog && createPortal(
        (() => {
          const details = parseDetails(selectedLog.details);
          const errorMsg = details?.error || details?.message;
          const troubleshoot = troubleshootError(errorMsg);

          return (
            <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-canvas border border-hairline rounded-lg w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <h3 className="text-md font-semibold text-ink">Log Entry #{selectedLog.id} Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1 hover:bg-canvas-soft rounded cursor-pointer"
                  >
                    <X className="w-4 h-4 text-ink-mute" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Meta details grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-hairline pb-4">
                    <div>
                      <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Action Type</span>
                      <div className="mt-1 font-medium">{selectedLog.action}</div>
                    </div>
                    <div>
                      <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Timestamp</span>
                      <div className="mt-1 font-mono">{new Date(selectedLog.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">Triggered By</span>
                      <div className="mt-1 font-medium">{selectedLog.display_name || selectedLog.username || 'System'}</div>
                    </div>
                    <div>
                      <span className="text-ink-mute block uppercase tracking-wider font-semibold text-[10px]">IP Address</span>
                      <div className="mt-1 font-mono">{selectedLog.ip_address || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Troubleshooter Advisor section (if failure exists) */}
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
                            {troubleshoot.steps.map((step, idx) => (
                              <li key={idx} className="leading-normal">{step}</li>
                            ))}
                          </ul>
                        </div>
                        {selectedLog.entity_type === 'announcement' && selectedLog.entity_id && (
                          <button
                            onClick={() => {
                              handleRetrySend(selectedLog.entity_id);
                              setSelectedLog(null);
                            }}
                            className="px-3 py-1.5 bg-accent-tomato hover:bg-accent-tomato-deep text-white rounded-sm text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-sm self-start sm:self-auto"
                          >
                            Retry Broadcast
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Event Details JSON */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Event Metadata (Raw Details)</h4>
                    <pre className="bg-canvas-night text-on-dark text-xs p-4 rounded font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-4 border-t border-hairline bg-canvas-soft/30 rounded-b-lg">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-ink text-on-dark hover:bg-ink-secondary text-xs font-medium rounded-sm transition-colors cursor-pointer"
                  >
                    Close
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

export default LogsManager;
