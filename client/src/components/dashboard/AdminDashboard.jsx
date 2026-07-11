import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, announcementsAPI } from '../../services/api';
import {
  Megaphone, Send, Clock, CheckCircle, AlertTriangle, ArrowRight,
  Users, UserCog, LayoutDashboard, Activity
} from 'lucide-react';
import { StatCardSkeleton, TableSkeleton } from '../ui/LoadingSkeleton';

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
      <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="shimmer-bg h-8 w-48 rounded"></div>
          <div className="shimmer-bg h-4 w-96 rounded"></div>
        </div>
        <StatCardSkeleton />
        <TableSkeleton rows={4} cols={4} />
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
        <div className="bg-canvas border border-hairline hover:border-primary/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Users</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{totalUsers}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/admin/users" className="text-xs font-medium text-ink-secondary hover:text-ink hover:underline flex items-center">
              Manage Users <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary stroke-[1.5]">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-canvas border border-hairline hover:border-accent-violet/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-accent-violet/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">CR Users</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{crUsers}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-ink-mute">{activeUsers} active users</span>
            <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center text-accent-violet stroke-[1.5]">
              <UserCog className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-canvas border border-hairline hover:border-accent-indigo/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-accent-indigo/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Total Broadcasts</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{totalBroadcasts}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-ink-mute">{scheduledBroadcasts} scheduled</span>
            <div className="w-10 h-10 rounded-lg bg-accent-indigo/10 flex items-center justify-center text-accent-indigo stroke-[1.5]">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-canvas border border-hairline hover:border-emerald-500/20 rounded-lg p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-emerald-500/5 to-transparent glass-panel hover:scale-[1.02] transition-all duration-200">
          <div>
            <span className="text-xs font-medium text-ink-mute uppercase tracking-wider">Delivered Notices</span>
            <h3 className="text-3xl font-medium text-ink mt-2">{deliveredBroadcasts}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-primary font-medium">
            <span>{totalBroadcasts > 0 ? Math.round((deliveredBroadcasts / totalBroadcasts) * 100) : 0}% delivery rate</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 stroke-[1.5]">
              <Send className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-4">
            <h2 className="text-lg font-medium text-ink">Recent Broadcasts</h2>
            <Link to="/admin/users" className="text-xs font-medium text-primary hover:underline">View All Users</Link>
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
                      <td className="py-3.5 px-4 text-xs text-ink-mute">{new Date(ann.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        {ann.status === 'sent' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Delivered</span>
                        ) : ann.status === 'scheduled' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-violet/15 text-accent-violet"><Clock className="w-3.5 h-3.5 mr-1" /> Scheduled</span>
                        ) : ann.status === 'failed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-tomato/15 text-accent-tomato"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Failed</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hairline-strong/15 text-ink-mute"><Clock className="w-3.5 h-3.5 mr-1" /> {ann.status}</span>
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
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft"><Users className="w-4 h-4 text-ink-secondary" /></div>
                <div><h4 className="text-sm font-medium text-ink">CR Users</h4><p className="text-xs text-ink-mute">{crUsers} registered</p></div>
              </div>
              <span className="text-lg font-medium text-ink">{crUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft"><Activity className="w-4 h-4 text-ink-secondary" /></div>
                <div><h4 className="text-sm font-medium text-ink">Active Users</h4><p className="text-xs text-ink-mute">{activeUsers} currently active</p></div>
              </div>
              <span className="text-lg font-medium text-ink">{activeUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft"><LayoutDashboard className="w-4 h-4 text-ink-secondary" /></div>
                <div><h4 className="text-sm font-medium text-ink">Scheduled</h4><p className="text-xs text-ink-mute">{scheduledBroadcasts} upcoming</p></div>
              </div>
              <span className="text-lg font-medium text-ink">{scheduledBroadcasts}</span>
            </div>
          </div>

          <Link to="/admin/users"
            className="block w-full text-center px-4 py-2.5 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer">
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
