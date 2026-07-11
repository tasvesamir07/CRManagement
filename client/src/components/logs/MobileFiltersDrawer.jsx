import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';

export default function MobileFiltersDrawer({
  open, onClose,
  actionFilter, onActionFilterChange,
  entityTypeFilter, onEntityTypeFilterChange,
  searchUserId, onSearchUserIdChange,
  isAdmin,
  onClearFilters
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-end justify-center z-50 md:hidden" onClick={onClose}>
      <div className="bg-canvas border-t border-hairline rounded-t-xl w-full max-h-[80vh] flex flex-col p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">Filter Logs</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-canvas-soft rounded">
            <X className="w-4 h-4 text-ink-mute" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto pb-6">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Event Type</label>
            <select
              value={actionFilter}
              onChange={(e) => { onActionFilterChange(e.target.value); }}
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
              onChange={(e) => { onEntityTypeFilterChange(e.target.value); }}
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
                onChange={(e) => { onSearchUserIdChange(e.target.value); }}
                className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2 border-t border-hairline">
          <button
            onClick={() => { onClearFilters(); onClose(); }}
            className="flex-1 py-2 border border-hairline rounded-sm text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5"
          >
            Clear Filters
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-primary hover:bg-primary-deep text-white rounded-sm text-xs font-semibold"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
