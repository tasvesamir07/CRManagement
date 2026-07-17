import { Link, type NavigateFunction } from 'react-router-dom';
import {
  Megaphone, BookOpen, Radio, Send, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Trash2, Eye, Edit3, Filter, X
} from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import { StatCardSkeleton, TableSkeleton } from '../ui/LoadingSkeleton';
import OfflineDraftsPanel from './OfflineDraftsPanel';
import DashboardFiltersDrawer from './DashboardFiltersDrawer';
import useDashboardData from '../../hooks/useDashboardData';

interface CRDashboardProps {
  navigate: NavigateFunction;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Delivered</span>);
    case 'partial':
      return (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-yellow/15 text-ink"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Partially Sent</span>);
    case 'failed':
      return (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-tomato/15 text-accent-tomato"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Failed</span>);
    case 'scheduled':
      return (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-violet/15 text-accent-violet"><Clock className="w-3.5 h-3.5 mr-1" /> Scheduled</span>);
    default:
      return (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute"><Clock className="w-3.5 h-3.5 mr-1" /> Draft</span>);
  }
};

const CRDashboard = ({ navigate }: CRDashboardProps) => {
  const {
    courses, announcements, loading, search, statusFilter, courseFilter,
    dateFrom, dateTo, page, totalPages, totalCount, filtersOpen, stats,
    offlineDrafts, setSearch, setStatusFilter, setCourseFilter,
    setDateFrom, setDateTo, setPage, setFiltersOpen,
    handleEditClick, handleDeleteAnnouncement, deleteOfflineDraft,
    clearFilters, getUniquePlatformDeliveries: getDeliveries
  } = useDashboardData(navigate);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="shimmer-bg h-8 w-48 rounded"></div>
          <div className="shimmer-bg h-4 w-96 rounded"></div>
        </div>
        <StatCardSkeleton />
        <TableSkeleton rows={5} cols={6} />
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
        <div className="bg-canvas border border-hairline hover:border-primary/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Active Courses</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.coursesCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/courses" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Manage Courses <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary stroke-[1.5]">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-canvas border border-hairline hover:border-accent-violet/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-accent-violet/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Broadcast Targets</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.platformsCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/platforms" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Setup Targets <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center text-accent-violet stroke-[1.5]">
              <Radio className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-canvas border border-hairline hover:border-accent-indigo/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-accent-indigo/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Broadcasts</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.announcementsCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/announcement/new" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              New Notice <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-accent-indigo/10 flex items-center justify-center text-accent-indigo stroke-[1.5]">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-canvas border border-hairline hover:border-emerald-500/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-emerald-500/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Delivered Notices</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{stats.deliveredCount}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary font-medium">
            <span>{stats.announcementsCount > 0 ? Math.round((stats.deliveredCount / stats.announcementsCount) * 100) : 0}% success rate</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 stroke-[1.5]">
              <Send className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <OfflineDraftsPanel drafts={offlineDrafts} onDelete={deleteOfflineDraft} />

      <div className="w-full bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
          <h2 className="text-lg font-medium text-ink">Recent Broadcasts</h2>
          <Link to="/announcement/new" className="text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep px-3 py-1.5 rounded-sm transition-colors cursor-pointer">
            Create Notice
          </Link>
        </div>

        <div className="hidden md:flex flex-wrap items-center gap-3 pb-2">
          <div className="relative flex-1 min-w-[200px]">
            <input type="text" placeholder="Search by title or content..." value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary transition-colors" />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-ink-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Delivered</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
          <select value={courseFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setCourseFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary max-w-[180px]">
            <option value="">All Courses</option>
            {courses.map((c: any) => (<option key={c.id} value={c.id}>{c.course_id}</option>))}
          </select>
          <input type="date" value={dateFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" title="From date" />
          <span className="text-xs text-ink-mute">to</span>
          <input type="date" value={dateTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" title="To date" />
          {(search || statusFilter || courseFilter || dateFrom || dateTo) && (
            <button onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-ink-mute hover:text-accent-tomato border border-hairline rounded-sm hover:border-accent-tomato/30 transition-colors">
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex md:hidden flex-col gap-2 pb-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Search broadcasts..." value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary transition-colors" />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-ink-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={() => setFiltersOpen(true)}
              className="flex items-center justify-center p-2.5 border border-hairline rounded-sm text-ink bg-canvas-soft hover:bg-canvas-soft/80"
              title="Filters"><Filter className="w-4 h-4 text-primary" /></button>
            {(statusFilter || courseFilter || dateFrom || dateTo) && (
              <button onClick={() => { setStatusFilter(''); setCourseFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="flex items-center justify-center p-2.5 border border-accent-tomato/20 rounded-sm text-accent-tomato hover:bg-accent-tomato/5" title="Clear filters"><X className="w-4 h-4" /></button>
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
                {announcements.map((ann: any) => (
                  <tr key={ann.id} className="hover:bg-canvas-soft transition-colors cursor-pointer" onClick={() => navigate(`/announcement/${ann.id}`)}>
                    <td className="py-3.5 pr-4 font-medium text-ink">
                      <div className="truncate max-w-[200px]" title={ann.title}>{ann.title}</div>
                      {ann.files && ann.files.length > 0 ? (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {ann.files.map((file: any, fIdx: number) => (
                            <span key={file.id || fIdx} className="inline-flex items-center text-xs text-ink-mute">📎 {file.original_name}</span>
                          ))}
                        </div>
                      ) : ann.file_name ? (
                        <span className="inline-flex items-center mt-1 text-xs text-ink-mute">📎 {ann.file_name}</span>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">{ann.c_id || 'General'}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-ink-secondary">{ann.created_by_name || `CR #${ann.created_by}`}</td>
                    <td className="py-3.5 px-4 text-xs text-ink-mute">
                      {ann.status === 'scheduled' && ann.scheduled_at ? (
                        <span className="flex flex-col gap-0.5">
                          <span className="text-ink-mute">{new Date(ann.created_at).toLocaleDateString()}</span>
                          <span className="text-accent-violet flex items-center gap-1">
                            <Clock className="w-3 h-3 inline-block" />{new Date(ann.scheduled_at).toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        new Date(ann.created_at).toLocaleDateString()
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(ann.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {getDeliveries(ann.delivery).map((d: any, i: number) => (
                          <span key={i}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded ${d.platform_status === 'sent' ? 'bg-primary/10' : d.platform_status === 'failed' ? 'bg-accent-tomato/10' : 'bg-hairline'}`}
                            title={d.title}>
                            {d.platform_type === 'whatsapp' ? (<FaWhatsapp className={`w-3.5 h-3.5 ${d.platform_status !== 'sent' ? 'opacity-60' : ''}`} style={{ color: '#25D366' }} />)
                              : d.platform_type === 'telegram' ? (<FaTelegram className={`w-3.5 h-3.5 ${d.platform_status !== 'sent' ? 'opacity-60' : ''}`} style={{ color: '#0088CC' }} />)
                                : (<FaFacebookMessenger className={`w-3.5 h-3.5 ${d.platform_status !== 'sent' ? 'opacity-60' : ''}`} style={{ color: '#00B2FF' }} />)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 pl-4 text-right whitespace-nowrap" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Link to={`/announcement/${ann.id}`}
                        className="p-1 text-ink-mute hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer inline-block" title="View Details"><Eye className="w-4 h-4" /></Link>
                      {(ann.status === 'draft' || ann.status === 'scheduled' || ann.status === 'partial' || ann.status === 'failed') && (
                        <button onClick={(e: React.MouseEvent) => handleEditClick(ann, e)}
                          className="p-1 text-ink-mute hover:text-accent-violet hover:bg-accent-violet/10 rounded transition-colors cursor-pointer inline-block mr-1" title="Edit Broadcast"><Edit3 className="w-4 h-4" /></button>
                      )}
                      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAnnouncement(ann.id); }}
                        className="p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer" title="Delete Broadcast Notice"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 pb-1">
                <span className="text-xs text-ink-mute">Showing page {page} of {totalPages} ({totalCount} total)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                  <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CRDashboard;
