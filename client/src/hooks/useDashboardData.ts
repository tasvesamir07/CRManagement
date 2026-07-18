import { useState, useEffect, useCallback, useRef } from 'react';
import { coursesAPI, platformsAPI, announcementsAPI } from '../services/api';
import { useWebSocket } from './useWebSocket';
import * as offlineService from '../services/offline';
import useKeepAlive from './useKeepAlive';
import toast from 'react-hot-toast';
import { confirm } from '../components/ui/ConfirmDialog';

const getUniquePlatformDeliveries = (deliveryList: any[]) => {
  if (!deliveryList) return [];
  const groups: Record<string, any[]> = {};
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

export default function useDashboardData(navigate: (path: string) => void) {
  const [courses, setCourses] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
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
  const [offlineDrafts, setOfflineDrafts] = useState<any[]>([]);

  useKeepAlive();

  const fetchOfflineDrafts = async () => {
    try {
      const list = await offlineService.OfflineDrafts.list();
      setOfflineDrafts(list);
    } catch (e) {
      console.error('Failed to load offline drafts:', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOfflineDrafts();
  }, []);

  const fetchData = async (silent: boolean = false) => {
    try {
      const announcementsParams = {
        page, limit: 10, search: debouncedSearch || undefined,
        status: statusFilter || undefined, course_id: courseFilter || undefined,
        date_from: dateFrom || undefined, date_to: dateTo || undefined
      };

      // Try to load from local cache first to load instantly
      const coursesKey = '/courses';
      const platformsKey = '/platforms';
      const announcementsKey = '/announcements' + JSON.stringify(announcementsParams);

      const [cachedCourses, cachedPlatforms, cachedAnnouncements] = await Promise.all([
        offlineService.OfflineCache.get(coursesKey),
        offlineService.OfflineCache.get(platformsKey),
        offlineService.OfflineCache.get(announcementsKey)
      ]);

      if (cachedCourses && cachedPlatforms && cachedAnnouncements) {
        setCourses(cachedCourses);
        setPlatforms(cachedPlatforms);
        const rawAnnouncements = Array.isArray(cachedAnnouncements) ? cachedAnnouncements : (cachedAnnouncements.announcements || []);
        setAnnouncements(rawAnnouncements);
        if (cachedAnnouncements.totalPages) setTotalPages(cachedAnnouncements.totalPages);
        if (cachedAnnouncements.totalCount) setTotalCount(cachedAnnouncements.totalCount);
        const delivered = rawAnnouncements.filter((a: any) => a.status === 'sent' || a.status === 'partial').length;
        setStats({
          coursesCount: cachedCourses.length, platformsCount: cachedPlatforms.length,
          announcementsCount: cachedAnnouncements.totalCount || rawAnnouncements.length,
          deliveredCount: delivered
        });
        setLoading(false);
        silent = true; // Skip spinner, background fetch is silent
      }

      if (!silent) setLoading(true);
      const [coursesData, platformsData, announcementsData] = await Promise.all([
        coursesAPI.list(),
        platformsAPI.list(),
        announcementsAPI.list(announcementsParams)
      ]);
      setCourses(coursesData);
      setPlatforms(platformsData);
      const rawAnnouncements = Array.isArray(announcementsData) ? announcementsData : (announcementsData.announcements || []);
      setAnnouncements(rawAnnouncements);
      if (announcementsData.totalPages) setTotalPages(announcementsData.totalPages);
      if (announcementsData.totalCount) setTotalCount(announcementsData.totalCount);
      const delivered = rawAnnouncements.filter((a: any) => a.status === 'sent' || a.status === 'partial').length;
      setStats({
        coursesCount: coursesData.length, platformsCount: platformsData.length,
        announcementsCount: announcementsData.totalCount || rawAnnouncements.length,
        deliveredCount: delivered
      });
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
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

  const handleWsMessage = useCallback((payload: any) => {
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
    }
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const handleEditClick = (ann: any, e: any) => {
    e.stopPropagation();
    if (ann.status === 'sent') {
      toast.error('This notice has already been successfully delivered and cannot be edited');
      return;
    }
    navigate(`/announcement/edit/${ann.id}`);
  };

  const handleDeleteAnnouncement = async (id: number | string) => {
    if (!(await confirm('Are you sure you want to delete this broadcast notice from history?', { title: 'Delete Notice', variant: 'danger', confirmLabel: 'Delete' }))) return;
    const prev = announcements;
    setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    try {
      await announcementsAPI.delete(id);
    } catch (e) {
      setAnnouncements(prev);
      toast.error('Delete failed: ' + ((e as any).response?.data?.error || (e as any).message));
    }
  };

  const deleteOfflineDraft = async (draftId: string) => {
    if (!(await confirm('Are you sure you want to delete this local offline draft?', { title: 'Delete Draft', variant: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      await offlineService.OfflineDrafts.delete(draftId);
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
