import { useState, useEffect, useCallback } from 'react';
import { logsAPI, announcementsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function useLogsManager(isAdmin: boolean) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        page, limit: 15,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleDeleteLog = async (logId: number, event: any) => {
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
      toast.error((err as any).response?.data?.error || 'Failed to delete log');
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
      toast.error((err as any).response?.data?.error || 'Failed to clear logs');
    }
  };

  const handleRetrySend = async (announcementId: number | string | undefined) => {
    if (announcementId == null) return;
    try {
      toast.loading('Retrying broadcast...', { id: 'retry-toast' });
      await announcementsAPI.send(announcementId);
      toast.success('Broadcast resent successfully!', { id: 'retry-toast' });
      handleRefresh();
    } catch (err) {
      toast.error((err as any).response?.data?.error || 'Failed to retry broadcast', { id: 'retry-toast' });
    }
  };

  const handleActionFilterChange = (val: string) => {
    setActionFilter(val);
    setPage(1);
  };

  const handleEntityTypeFilterChange = (val: string) => {
    setEntityTypeFilter(val);
    setPage(1);
  };

  const handleSearchUserIdChange = (val: string) => {
    setSearchUserId(val);
    setPage(1);
  };

  return {
    logs, loading, page, totalPages, totalLogs,
    expandedLogId, setExpandedLogId,
    filtersOpen, setFiltersOpen,
    actionFilter, entityTypeFilter, searchUserId,
    selectedLog, setSelectedLog,
    handleRefresh, handleClearFilters,
    handleDeleteLog, handleClearLogs, handleRetrySend,
    handleActionFilterChange, handleEntityTypeFilterChange, handleSearchUserIdChange,
    setPage
  };
}
