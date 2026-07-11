import { useState, useEffect, useCallback, useRef } from 'react';
import { coursesAPI, platformsAPI, announcementsAPI } from '../services/api';
import { useWebSocket } from './useWebSocket';
import { OfflineDrafts } from '../services/offline';
import useKeepAlive from './useKeepAlive';
import toast from 'react-hot-toast';

const getUniquePlatformDeliveries = (deliveryList) => {
  if (!deliveryList) return [];
  const groups = {};
  for (const d of deliveryList) {
    if (!groups[d.platform_type]) {
      groups[d.platform_type] = [];
    }
    groups[d.platform_type].push(d);
  }
  return Object.keys(groups).map((type) => {
    const items = groups[type];
    let status = 'sent';
    if (items.some(item => item.platform_status === 'failed')) {
      status = 'failed';
    } else if (items.some(item => item.platform_status === 'sending' || item.platform_status === 'pending')) {
      status = 'pending';
    }
    const names = items.map(item => `${item.platform_name} (${item.platform_status})`).join(', ');
    return { platform_type: type, platform_status: status, title: names };
  });
};

export { getUniquePlatformDeliveries };

export default function useDashboardData(navigate) {
  const [courses, setCourses] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stats, setStats] = useState({
    coursesCount: 0, platformsCount: 0, announcementsCount: 0, deliveredCount: 0
  });
  const [offlineDrafts, setOfflineDrafts] = useState([]);

  useKeepAlive();

  const fetchOfflineDrafts = async () => {
    try {
      const list = await OfflineDrafts.list();
      setOfflineDrafts(list);
    } catch (e) {
      console.error('Failed to load offline drafts:', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOfflineDrafts();
  }, []);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [coursesData, platformsData, announcementsData] = await Promise.all([
        coursesAPI.list(),
        platformsAPI.list(),
        announcementsAPI.list({
          page, limit: 10, search: debouncedSearch || undefined,
          status: statusFilter || undefined, course_id: courseFilter || undefined,
          date_from: dateFrom || undefined, date_to: dateTo || undefined
        })
      ]);
      setCourses(coursesData);
      setPlatforms(platformsData);
      const rawAnnouncements = Array.isArray(announcementsData) ? announcementsData : (announcementsData.announcements || []);
      setAnnouncements(rawAnnouncements);
      if (announcementsData.totalPages) setTotalPages(announcementsData.totalPages);
      if (announcementsData.totalCount) setTotalCount(announcementsData.totalCount);
      const delivered = rawAnnouncements.filter(a => a.status === 'sent' || a.status === 'partial').length;
      setStats({
        coursesCount: coursesData.length, platformsCount: platformsData.length,
        announcementsCount: announcementsData.totalCount || rawAnnouncements.length,
        deliveredCount: delivered
      });
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; });

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, courseFilter, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    const handleSync = () => {
      fetchOfflineDrafts();
      fetchDataRef.current(true);
    };
    window.addEventListener('offline-drafts-synced', handleSync);
    return () => window.removeEventListener('offline-drafts-synced', handleSync);
  }, []);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'announcement_status') {
      setAnnouncements(prev => prev.map(ann => {
        if (ann.id === payload.data.id) {
          return {
            ...ann, status: payload.data.status,
            sent_at: payload.data.sent_at || ann.sent_at,
            delivery: payload.data.delivery && payload.data.delivery.length > 0 ? payload.data.delivery : ann.delivery
          };
        }
        return ann;
      }));
      fetchDataRef.current(true);
    }
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const handleEditClick = (ann, e) => {
    e.stopPropagation();
    if (ann.status === 'sent') {
      toast.error('This notice has already been successfully delivered and cannot be edited');
      return;
    }
    navigate(`/announcement/edit/${ann.id}`);
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this broadcast notice from history?')) return;
    try {
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      await announcementsAPI.delete(id);
      fetchData(true);
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
      fetchData();
    }
  };

  const deleteOfflineDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this local offline draft?')) return;
    try {
      await OfflineDrafts.delete(draftId);
      toast.success('Local draft deleted');
      fetchOfflineDrafts();
    } catch {
      toast.error('Failed to delete local draft');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCourseFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return {
    courses, platforms, announcements, loading,
    search, debouncedSearch, statusFilter, courseFilter, dateFrom, dateTo,
    page, totalPages, totalCount, filtersOpen, stats, offlineDrafts,
    setSearch, setStatusFilter, setCourseFilter, setDateFrom, setDateTo,
    setPage, setFiltersOpen,
    handleEditClick, handleDeleteAnnouncement, deleteOfflineDraft,
    clearFilters, fetchData, getUniquePlatformDeliveries
  };
}
