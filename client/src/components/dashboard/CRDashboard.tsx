import { useState } from 'react';
import { Link, type NavigateFunction } from 'react-router-dom';
import {
  Megaphone, BookOpen, Radio, Send, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Trash2, Eye, Edit3, Filter, X, Sparkles, Search, Layers, Copy, Check, CopyPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import { StatCardSkeleton, TableSkeleton } from '../ui/LoadingSkeleton';
import OfflineDraftsPanel from './OfflineDraftsPanel';
import DashboardFiltersDrawer from './DashboardFiltersDrawer';
import useDashboardData from '../../hooks/useDashboardData';
import CustomSelect from '../ui/custom-select';

interface CRDashboardProps {
  navigate: NavigateFunction;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Delivered</span>);
    case 'partial':
      return (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Partial</span>);
    case 'failed':
      return (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm"><AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> Failed</span>);
    case 'scheduled':
      return (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm"><Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Scheduled</span>);
    default:
      return (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 shadow-sm"><Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Draft</span>);
  }
};

const CRDashboard = ({ navigate }: CRDashboardProps) => {
  const [copiedNoticeId, setCopiedNoticeId] = useState<number | null>(null);

  const {
    courses, announcements, loading, search, statusFilter, courseFilter,
    dateFrom, dateTo, page, totalPages, totalCount, filtersOpen, stats,
    offlineDrafts, setSearch, setStatusFilter, setCourseFilter,
    setDateFrom, setDateTo, setPage, setFiltersOpen,
    handleEditClick, handleDeleteAnnouncement, deleteOfflineDraft,
    clearFilters, getUniquePlatformDeliveries: getDeliveries
  } = useDashboardData(navigate);

  const handleCopyNotice = (ann: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = ann.content || ann.title;
    if (!textToCopy) {
      toast.error('No notice content to copy');
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoticeId(ann.id);
    toast.success('Notice copied to clipboard!');
    setTimeout(() => setCopiedNoticeId(null), 2000);
  };

  const handleDuplicateNotice = (ann: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/announcement/new', { state: { cloneFromId: ann.id, cloneAnn: ann } });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="shimmer-bg h-8 w-48 rounded-xl"></div>
          <div className="shimmer-bg h-4 w-96 rounded-xl"></div>
        </div>
        <StatCardSkeleton />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              REAL-TIME BROADCAST ENGINE
            </span>
          </div>
          <h1 className="text-display-md tracking-tight font-extrabold text-ink">
            Console <span className="gradient-text">Overview</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-mute mt-1">Live metrics and multi-channel notice management.</p>
        </div>

        <Link
          to="/announcement/new"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-xs text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all duration-150"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          Create New Broadcast
        </Link>
      </div>

      {/* Futuristic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Active Courses</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-ink mt-3">{stats.coursesCount}</h3>
          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between">
            <Link to="/courses" className="text-xs font-bold text-primary hover:underline flex items-center">
              Manage Courses <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <span className="text-[10px] font-mono text-ink-mute">ACTIVE</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-indigo-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Broadcast Targets</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shadow-inner">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-ink mt-3">{stats.platformsCount}</h3>
          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between">
            <Link to="/platforms" className="text-xs font-bold text-indigo-400 hover:underline flex items-center">
              Setup Targets <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <span className="text-[10px] font-mono text-ink-mute">CONNECTED</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-purple-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Total Broadcasts</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shadow-inner">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-ink mt-3">{stats.announcementsCount}</h3>
          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between">
            <Link to="/announcement/new" className="text-xs font-bold text-purple-400 hover:underline flex items-center">
              New Notice <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <span className="text-[10px] font-mono text-ink-mute">LOGGED</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-cyan-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Delivered Notices</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shadow-inner">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-ink mt-3">{stats.deliveredCount}</h3>
          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400">
              {stats.announcementsCount > 0 ? Math.round((stats.deliveredCount / stats.announcementsCount) * 100) : 0}% Success
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">OPTIMAL</span>
          </div>
        </div>
      </div>

      <OfflineDraftsPanel drafts={offlineDrafts} onDelete={deleteOfflineDraft} />

      {/* Broadcast Table Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/20 dark:border-white/10 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline/60 pb-5">
          <div>
            <h2 className="text-lg font-extrabold text-ink tracking-tight flex items-center gap-2">
              Recent Broadcast Notices
              <span className="text-xs font-mono text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline">
                {totalCount} Total
              </span>
            </h2>
            <p className="text-xs text-ink-mute">Filter and track delivery across all connected messaging networks.</p>
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden md:flex flex-wrap items-center gap-3 pb-2">
          <div className="relative flex-1 min-w-[220px]">
            <input type="text" placeholder="Search title or content..." value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="glass-input w-full pl-9 pr-4 py-2.5 text-xs rounded-xl text-ink font-medium placeholder:text-ink-mute" />
            <Search className="absolute left-3 top-3 w-4 h-4 text-ink-mute" />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            placeholder="All Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'sending', label: 'Sending' },
              { value: 'sent', label: 'Delivered' },
              { value: 'partial', label: 'Partial' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
          <CustomSelect
            value={courseFilter}
            onChange={(val) => { setCourseFilter(val); setPage(1); }}
            placeholder="All Courses"
            className="max-w-[180px]"
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map((c: any) => ({ value: String(c.id), label: c.course_id })),
            ]}
          />
          <input type="date" value={dateFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateFrom(e.target.value); setPage(1); }}
            className="glass-input px-3.5 py-2.5 text-xs rounded-xl text-ink font-medium" title="From date" />
          <span className="text-xs text-ink-mute font-bold">to</span>
          <input type="date" value={dateTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateTo(e.target.value); setPage(1); }}
            className="glass-input px-3.5 py-2.5 text-xs rounded-xl text-ink font-medium" title="To date" />
          {(search || statusFilter || courseFilter || dateFrom || dateTo) && (
            <button onClick={clearFilters}
              className="px-3.5 py-2.5 text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all">
              Clear
            </button>
          )}
        </div>

        {/* Mobile Filter Bar */}
        <div className="flex md:hidden flex-col gap-2 pb-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Search broadcasts..." value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl text-ink" />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-mute" />
            </div>
            <button onClick={() => setFiltersOpen(true)}
              className="flex items-center justify-center p-2.5 border border-hairline rounded-xl text-ink bg-canvas-soft hover:bg-canvas-soft/80"
              title="Filters"><Filter className="w-4 h-4 text-primary" /></button>
            {(statusFilter || courseFilter || dateFrom || dateTo) && (
              <button onClick={() => { setStatusFilter(''); setCourseFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="flex items-center justify-center p-2.5 border border-rose-500/20 rounded-xl text-rose-500 bg-rose-500/10" title="Clear filters"><X className="w-4 h-4" /></button>
            )}
          </div>
        </div>

        <DashboardFiltersDrawer
          filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} setPage={setPage}
          courseFilter={courseFilter} setCourseFilter={setCourseFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
          courses={courses} clearFilters={clearFilters} />

        {announcements.length === 0 ? (
          <div className="text-center py-16 text-ink-mute text-xs">
            <Megaphone className="w-12 h-12 text-primary/40 mx-auto stroke-[1.5] mb-3 animate-pulse" />
            <p className="font-bold text-sm text-ink mb-1">No Broadcasts Found</p>
            {search || statusFilter || courseFilter ? (
              <>No announcements match your search filters.</>
            ) : (
              <>No announcements sent yet. Click 'Create New Broadcast' to draft your first announcement.</>
            )}
          </div>
        ) : (
          <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {announcements.map((ann: any) => (
              <div key={ann.id} onClick={() => navigate(`/announcement/${ann.id}`)}
                className="glass-card rounded-2xl p-4 space-y-3 border border-hairline hover:border-primary/40 transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink truncate" title={ann.title}>{ann.title}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{ann.c_id || 'General'}</span>
                      <span className="text-[11px] font-mono text-ink-mute">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={(e: React.MouseEvent) => handleDuplicateNotice(ann, e)}
                        className="p-2 text-ink-mute hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer" title="Duplicate Notice to New Broadcast">
                        <CopyPlus className="w-4 h-4" />
                      </button>
                      <button onClick={(e: React.MouseEvent) => handleCopyNotice(ann, e)}
                        className="p-2 text-ink-mute hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer" title="Copy Notice Text">
                        {copiedNoticeId === ann.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <Link to={`/announcement/${ann.id}`}
                        className="p-2 text-ink-mute hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(ann.status === 'draft' || ann.status === 'scheduled' || ann.status === 'partial' || ann.status === 'failed') && (
                        <button onClick={(e: React.MouseEvent) => handleEditClick(ann, e)}
                          className="p-2 text-ink-mute hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAnnouncement(ann.id); }}
                        className="p-2 text-ink-mute hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-hairline/60">
                  <div className="flex items-center gap-1.5">
                    {getDeliveries(ann.delivery).map((d: any, i: number) => (
                      <span key={i}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${d.platform_status === 'sent' ? 'bg-emerald-500/15' : d.platform_status === 'failed' ? 'bg-rose-500/15' : 'bg-canvas-soft'}`}
                        title={d.title}>
                        {d.platform_type === 'whatsapp' ? (<FaWhatsapp className="w-3.5 h-3.5 text-[#25D366]" />)
                          : d.platform_type === 'telegram' ? (<FaTelegram className="w-3.5 h-3.5 text-[#0088CC]" />)
                            : (<FaFacebookMessenger className="w-3.5 h-3.5 text-[#00B2FF]" />)}
                      </span>
                    ))}
                  </div>
                  <div>{getStatusBadge(ann.status)}</div>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-1">
                <span className="text-xs text-ink-mute font-mono">Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-bold glass-card rounded-xl text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-bold glass-card rounded-xl text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-hairline/60">
              <thead>
                <tr className="text-left text-[11px] font-bold text-ink-mute uppercase tracking-wider">
                  <th className="py-3 pr-4">Title & Attachments</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Channels</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/60 text-xs">
                {announcements.map((ann: any) => (
                  <tr key={ann.id} className="hover:bg-canvas-soft/60 transition-colors cursor-pointer" onClick={() => navigate(`/announcement/${ann.id}`)}>
                    <td className="py-4 pr-4 font-bold text-ink">
                      <div className="truncate max-w-[240px] text-sm" title={ann.title}>{ann.title}</div>
                      {ann.files && ann.files.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ann.files.map((file: any, fIdx: number) => (
                            <span key={file.id || fIdx} className="inline-flex items-center text-[10px] text-ink-mute font-mono bg-canvas-soft px-2 py-0.5 rounded-md border border-hairline">📎 {file.original_name}</span>
                          ))}
                        </div>
                      ) : ann.file_name ? (
                        <span className="inline-flex items-center mt-1 text-[10px] text-ink-mute font-mono bg-canvas-soft px-2 py-0.5 rounded-md border border-hairline">📎 {ann.file_name}</span>
                      ) : null}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs font-bold text-primary">{ann.c_id || 'General'}</td>
                    <td className="py-4 px-4 font-semibold text-ink-secondary">{ann.created_by_name || `CR #${ann.created_by}`}</td>
                    <td className="py-4 px-4 text-ink-mute font-mono text-[11px]">
                      {ann.status === 'scheduled' && ann.scheduled_at ? (
                        <span className="flex flex-col gap-0.5">
                          <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                          <span className="text-indigo-400 flex items-center gap-1 font-bold">
                            <Clock className="w-3 h-3" />{new Date(ann.scheduled_at).toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        new Date(ann.created_at).toLocaleDateString()
                      )}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(ann.status)}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {getDeliveries(ann.delivery).map((d: any, i: number) => (
                          <span key={i}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl ${d.platform_status === 'sent' ? 'bg-emerald-500/15 border border-emerald-500/30' : d.platform_status === 'failed' ? 'bg-rose-500/15 border border-rose-500/30' : 'bg-canvas-soft'}`}
                            title={d.title}>
                            {d.platform_type === 'whatsapp' ? (<FaWhatsapp className="w-4 h-4 text-[#25D366]" />)
                              : d.platform_type === 'telegram' ? (<FaTelegram className="w-4 h-4 text-[#0088CC]" />)
                                : (<FaFacebookMessenger className="w-4 h-4 text-[#00B2FF]" />)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex justify-center items-center gap-1">
                        <button onClick={(e: React.MouseEvent) => handleDuplicateNotice(ann, e)}
                          className="p-2 text-ink-mute hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer" title="Duplicate Notice to New Broadcast">
                          <CopyPlus className="w-4 h-4" />
                        </button>
                        <button onClick={(e: React.MouseEvent) => handleCopyNotice(ann, e)}
                          className="p-2 text-ink-mute hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer" title="Copy Notice Text">
                          {copiedNoticeId === ann.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <Link to={`/announcement/${ann.id}`}
                          className="p-2 text-ink-mute hover:text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(ann.status === 'draft' || ann.status === 'scheduled' || ann.status === 'partial' || ann.status === 'failed') && (
                          <button onClick={(e: React.MouseEvent) => handleEditClick(ann, e)}
                            className="p-2 text-ink-mute hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer" title="Edit Broadcast">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAnnouncement(ann.id); }}
                          className="p-2 text-ink-mute hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer" title="Delete Broadcast Notice">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-5 pb-1 border-t border-hairline/60">
                <span className="text-xs font-mono text-ink-mute">Showing page {page} of {totalPages} ({totalCount} total)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-4 py-2 text-xs font-bold glass-card rounded-xl text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="px-4 py-2 text-xs font-bold glass-card rounded-xl text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CRDashboard;

