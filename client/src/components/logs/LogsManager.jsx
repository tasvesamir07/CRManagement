import { useAuth } from '../../context/AuthContext';
import {
  Search, Filter, X, Loader2, ChevronLeft, ChevronRight,
  RefreshCw, Eye, AlertCircle, ClipboardList, Trash2
} from 'lucide-react';
import MobileFiltersDrawer from './MobileFiltersDrawer';
import LogDetailModal from './LogDetailModal';
import { parseDetails, getActionLabel, troubleshootError } from './logsHelpers';
import useLogsManager from '../../hooks/useLogsManager';

const LogsManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const {
    logs, loading, page, totalPages, totalLogs,
    expandedLogId, setExpandedLogId,
    filtersOpen, setFiltersOpen,
    actionFilter, entityTypeFilter, searchUserId,
    selectedLog, setSelectedLog,
    handleRefresh, handleClearFilters,
    handleDeleteLog, handleClearLogs, handleRetrySend,
    handleActionFilterChange, handleEntityTypeFilterChange, handleSearchUserIdChange,
    setPage
  } = useLogsManager(isAdmin);

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
              onChange={(e) => handleActionFilterChange(e.target.value)}
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
              onChange={(e) => handleEntityTypeFilterChange(e.target.value)}
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
                onChange={(e) => handleSearchUserIdChange(e.target.value)}
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

      <MobileFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        actionFilter={actionFilter}
        onActionFilterChange={handleActionFilterChange}
        entityTypeFilter={entityTypeFilter}
        onEntityTypeFilterChange={handleEntityTypeFilterChange}
        searchUserId={searchUserId}
        onSearchUserIdChange={handleSearchUserIdChange}
        isAdmin={isAdmin}
        onClearFilters={handleClearFilters}
      />

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

      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onRetrySend={handleRetrySend}
      />
    </div>
  );
};

export default LogsManager;
