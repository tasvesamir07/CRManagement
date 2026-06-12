import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { coursesAPI, platformsAPI, announcementsAPI, adminAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Megaphone, 
  BookOpen, 
  Radio, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Trash2,
  Eye,
  Edit3,
  Users,
  UserCog,
  LayoutDashboard,
  Activity
} from 'lucide-react';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa6';

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

    return {
      platform_type: type,
      platform_status: status,
      title: names
    };
  });
};

const CRDashboard = ({ navigate }) => {
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

  const [stats, setStats] = useState({
    coursesCount: 0,
    platformsCount: 0,
    announcementsCount: 0,
    deliveredCount: 0
  });

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [coursesData, platformsData] = await Promise.all([
        coursesAPI.list(),
        platformsAPI.list()
      ]);

      setCourses(coursesData);
      setPlatforms(platformsData);

      const announcementsData = await announcementsAPI.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        course_id: courseFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      });

      const rawAnnouncements = Array.isArray(announcementsData) ? announcementsData : (announcementsData.announcements || []);
      setAnnouncements(rawAnnouncements);
      if (announcementsData.totalPages) setTotalPages(announcementsData.totalPages);
      if (announcementsData.totalCount) setTotalCount(announcementsData.totalCount);

      const delivered = rawAnnouncements.filter(a => a.status === 'sent' || a.status === 'partial').length;

      setStats({
        coursesCount: coursesData.length,
        platformsCount: platformsData.length,
        announcementsCount: announcementsData.totalCount || rawAnnouncements.length,
        deliveredCount: delivered
      });
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data on filters, search, or page changes
  useEffect(() => {
    fetchData();
  }, [page, statusFilter, courseFilter, dateFrom, dateTo, debouncedSearch]);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'announcement_status') {
      setAnnouncements(prev => prev.map(ann => {
        if (ann.id === payload.data.id) {
          return {
            ...ann,
            status: payload.data.status,
            sent_at: payload.data.sent_at || ann.sent_at,
            delivery: payload.data.delivery && payload.data.delivery.length > 0
              ? payload.data.delivery
              : ann.delivery
          };
        }
        return ann;
      }));
      fetchData(true);
    }
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const handleEditClick = (ann, e) => {
    e.stopPropagation();
    if (ann.status === 'sent' || ann.status === 'partial') {
      toast.error('This notice has already been delivered and cannot be edited');
      return;
    }
    if (ann.status === 'failed') {
      toast.error('This notice has failed and cannot be edited');
      return;
    }
    navigate(`/announcement/edit/${ann.id}`);
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this broadcast notice from history?')) {
      return;
    }
    try {
      await announcementsAPI.delete(id);
      fetchData();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };



  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Delivered
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-yellow/15 text-ink">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Partially Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-tomato/15 text-accent-tomato">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Failed
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-violet/15 text-accent-violet">
            <Clock className="w-3.5 h-3.5 mr-1" /> Scheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute">
            <Clock className="w-3.5 h-3.5 mr-1" /> Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-md tracking-tight font-sans text-ink">Dashboard Overview</h1>
        <p className="text-sm text-ink-mute mt-1.5">Quick insights into your class courses and notification status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Active Courses</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.coursesCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/courses" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Manage Courses <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <BookOpen className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Broadcast Targets</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.platformsCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/platforms" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Setup Targets <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <Radio className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Broadcasts</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.announcementsCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/announcement/new" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              New Notice <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <Megaphone className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Delivered Notices</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.deliveredCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary font-medium">
            <span>{stats.announcementsCount > 0 ? Math.round((stats.deliveredCount / stats.announcementsCount) * 100) : 0}% success rate</span>
            <Send className="w-6 h-6 text-primary stroke-[1.25]" />
          </div>
        </div>
      </div>

      <div className="w-full bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
            <h2 className="text-lg font-medium text-ink">Recent Broadcasts</h2>
            <Link to="/announcement/new" className="text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep px-3 py-1.5 rounded-sm transition-colors cursor-pointer">
              Create Notice
            </Link>
          </div>

          {/* Search and filters */}
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by title or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary transition-colors"
              />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-ink-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="sent">Delivered</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary max-w-[180px]"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.course_id}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary"
              title="From date"
            />
            <span className="text-xs text-ink-mute">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary"
              title="To date"
            />
            {(search || statusFilter || courseFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setCourseFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="px-3 py-2 text-xs font-medium text-ink-mute hover:text-accent-tomato border border-hairline rounded-sm hover:border-accent-tomato/30 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-12 text-ink-mute text-sm">
              <Megaphone className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
              {search || statusFilter || courseFilter ? (
                <>No announcements match your filters. Try different search criteria.</>
              ) : (
                <>No announcements sent yet. Click 'Create Notice' to draft your first announcement.</>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline-cool">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-mute uppercase tracking-wider">
                    <th className="py-3 pr-4">Title</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Sent By</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Channels</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-cool text-sm text-ink-secondary">
                  {announcements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-canvas-soft transition-colors cursor-pointer" onClick={() => navigate(`/announcement/${ann.id}`)}>
                      <td className="py-3.5 pr-4 font-medium text-ink">
                        <div className="truncate max-w-[200px]" title={ann.title}>{ann.title}</div>
                        {ann.files && ann.files.length > 0 ? (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {ann.files.map((file, fIdx) => (
                              <span key={file.id || fIdx} className="inline-flex items-center text-xs text-ink-mute">
                                📎 {file.original_name}
                              </span>
                            ))}
                          </div>
                        ) : ann.file_name ? (
                          <span className="inline-flex items-center mt-1 text-xs text-ink-mute">
                            📎 {ann.file_name}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{ann.c_id || 'General'}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-ink-secondary">{ann.created_by_name || `CR #${ann.created_by}`}</td>
                      <td className="py-3.5 px-4 text-xs text-ink-mute">
                        {ann.status === 'scheduled' && ann.scheduled_at ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="text-ink-mute">{new Date(ann.created_at).toLocaleDateString()}</span>
                            <span className="text-accent-violet flex items-center gap-1">
                              <Clock className="w-3 h-3 inline-block" />
                              {new Date(ann.scheduled_at).toLocaleString()}
                            </span>
                          </span>
                        ) : (
                          new Date(ann.created_at).toLocaleDateString()
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(ann.status)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          {getUniquePlatformDeliveries(ann.delivery).map((d, i) => (
                            <span 
                              key={i} 
                              className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                                d.platform_status === 'sent' 
                                  ? 'bg-primary/10' 
                                  : d.platform_status === 'failed' 
                                    ? 'bg-accent-tomato/10' 
                                    : 'bg-hairline'
                              }`}
                              title={d.title}
                            >
                              {d.platform_type === 'whatsapp' 
                                ? <FaWhatsapp className={`w-3.5 h-3.5 ${d.platform_status !== 'sent' ? 'opacity-60' : ''}`} style={{ color: '#25D366' }} /> 
                                : <FaTelegram className={`w-3.5 h-3.5 ${d.platform_status !== 'sent' ? 'opacity-60' : ''}`} style={{ color: '#0088CC' }} />
                              }
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/announcement/${ann.id}`}
                          className="p-1 text-ink-mute hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer inline-block"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => handleEditClick(ann, e)}
                          className="p-1 text-ink-mute hover:text-accent-violet hover:bg-accent-violet/10 rounded transition-colors cursor-pointer inline-block mr-1"
                          title="Edit Broadcast"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer"
                          title="Delete Broadcast Notice"
                        >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-1">
                  <span className="text-xs text-ink-mute">
                    Showing page {page} of {totalPages} ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersData, announcementsData] = await Promise.all([
          adminAPI.listUsers(),
          announcementsAPI.list()
        ]);
        setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
        const rawAnnouncements = Array.isArray(announcementsData) ? announcementsData : (announcementsData.announcements || []);
        setAnnouncements(rawAnnouncements);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const totalUsers = users.length;
  const crUsers = users.filter(u => u.role === 'cr').length;
  const activeUsers = users.filter(u => u.is_active).length;
  const totalBroadcasts = announcements.length;
  const deliveredBroadcasts = announcements.filter(a => a.status === 'sent' || a.status === 'partial').length;
  const scheduledBroadcasts = announcements.filter(a => a.status === 'scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-md tracking-tight font-sans text-ink">Admin Overview</h1>
        <p className="text-sm text-ink-mute mt-1.5">System-wide statistics and user management at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Users</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{totalUsers}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/admin/users" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Manage Users <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <Users className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">CR Users</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{crUsers}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-ink-mute">{activeUsers} active users</span>
            <UserCog className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Broadcasts</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{totalBroadcasts}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-ink-mute">{scheduledBroadcasts} scheduled</span>
            <Megaphone className="w-8 h-8 text-hairline-strong stroke-[1.25]" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Delivered Notices</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{deliveredBroadcasts}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary font-medium">
            <span>{totalBroadcasts > 0 ? Math.round((deliveredBroadcasts / totalBroadcasts) * 100) : 0}% delivery rate</span>
            <Send className="w-6 h-6 text-primary stroke-[1.25]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
            <h2 className="text-lg font-medium text-ink">Recent Broadcasts</h2>
            <Link to="/admin/users" className="text-xs font-medium text-primary hover:underline">
              View All Users
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-12 text-ink-mute text-sm">
              <Megaphone className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
              No broadcasts have been created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline-cool">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-mute uppercase tracking-wider">
                    <th className="py-3 pr-4">Title</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-cool text-sm text-ink-secondary">
                  {announcements.slice(0, 5).map((ann) => (
                    <tr key={ann.id} className="hover:bg-canvas-soft transition-colors">
                      <td className="py-3.5 pr-4 font-medium text-ink">
                        <div className="truncate max-w-[200px]" title={ann.title}>{ann.title}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">{ann.created_by_username || `User #${ann.created_by}`}</td>
                      <td className="py-3.5 px-4 text-xs text-ink-mute">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {ann.status === 'sent' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Delivered
                          </span>
                        ) : ann.status === 'scheduled' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-violet/15 text-accent-violet">
                            <Clock className="w-3.5 h-3.5 mr-1" /> Scheduled
                          </span>
                        ) : ann.status === 'failed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-tomato/15 text-accent-tomato">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute">
                            <Clock className="w-3.5 h-3.5 mr-1" /> {ann.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
          <div className="border-b border-hairline-cool pb-4">
            <h2 className="text-lg font-medium text-ink">System Overview</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft">
                  <Users className="w-4 h-4 text-ink-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-ink">CR Users</h4>
                  <p className="text-xs text-ink-mute">{crUsers} registered</p>
                </div>
              </div>
              <span className="text-lg font-medium text-ink">{crUsers}</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft">
                  <Activity className="w-4 h-4 text-ink-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-ink">Active Users</h4>
                  <p className="text-xs text-ink-mute">{activeUsers} currently active</p>
                </div>
              </div>
              <span className="text-lg font-medium text-ink">{activeUsers}</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft">
                  <LayoutDashboard className="w-4 h-4 text-ink-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-ink">Scheduled</h4>
                  <p className="text-xs text-ink-mute">{scheduledBroadcasts} upcoming</p>
                </div>
              </div>
              <span className="text-lg font-medium text-ink">{scheduledBroadcasts}</span>
            </div>
          </div>

          <Link
            to="/admin/users"
            className="block w-full text-center px-4 py-2.5 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer"
          >
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
};

const MainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <CRDashboard navigate={navigate} />;
};

export default MainDashboard;
