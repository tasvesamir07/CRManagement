import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, coursesAPI } from '../../services/api';
import { Download, X, AlertCircle, Save, Check, Trash2, Edit, Loader2 } from 'lucide-react';
import { confirm } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';
import CustomSelect from '../ui/custom-select';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

interface StudentRecord {
  id: number;
  student_id: string;
  name: string;
  section: string | null;
  batch: string | null;
  attendance_id: number | null;
  status: string | null;
  notes: string | null;
}

const AttendanceManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'take' | 'saved'>('take');
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await coursesAPI.list();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedCourseId || !date) return;
    setLoading(true);
    try {
      const data = await attendanceAPI.getByCourseDate(selectedCourseId as number, date);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Failed to load: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, date]);

  useEffect(() => {
    if (selectedCourseId && date) fetchAttendance();
  }, [selectedCourseId, date, fetchAttendance]);

  const markAllPresent = () => {
    setRecords(prev => prev.map(r => ({ ...r, status: 'present' })));
  };

  const toggleStatus = (id: number) => {
    setRecords(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === 'present' ? 'absent' : 'present' } : r
    ));
  };

  const handleSave = async () => {
    if (!selectedCourseId || !date) return;
    setSaving(true);
    try {
      const markedRecords = records
        .filter(r => r.status)
        .map(r => ({ student_id: r.id, status: r.status!, notes: r.notes || undefined }));

      if (markedRecords.length === 0) {
        toast.error('No attendance records to save');
        setSaving(false);
        return;
      }

      await attendanceAPI.bulkMark({
        course_id: selectedCourseId as number,
        date,
        records: markedRecords
      });
      toast.success(`Attendance saved (${markedRecords.length} students)`);
      fetchAttendance();
    } catch (e: any) {
      toast.error('Save failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedCourseId || !date) return;
    try {
      const res = await attendanceAPI.getPdf(selectedCourseId as number, date);
      const blob = res.data;
      
      const disposition = res.headers['content-disposition'];
      let filename = '';
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      if (!filename) {
        const course = courses.find(c => c.id === selectedCourseId);
        const courseCode = course ? course.course_id : `course-${selectedCourseId}`;
        const dateObj = new Date(date);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const cleanDate = `${day}-${month}-${year}`;
        filename = `${courseCode}_${cleanDate}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      toast.error('PDF generation failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const fetchSavedSheets = useCallback(async () => {
    setLoadingSheets(true);
    try {
      const data = await attendanceAPI.listSavedSheets();
      setSavedSheets(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Failed to load saved sheets: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingSheets(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedSheets();
    }
  }, [activeTab, fetchSavedSheets]);

  const handleDeleteSheet = async (courseId: number, dateStr: string) => {
    if (!(await confirm('Are you sure you want to delete this entire attendance sheet? This will wipe all records for this date.', {
      title: 'Delete Attendance Sheet',
      variant: 'danger',
      confirmLabel: 'Delete'
    }))) return;

    try {
      await attendanceAPI.deleteSheet(courseId, dateStr);
      toast.success('Attendance sheet deleted');
      fetchSavedSheets();
    } catch (e: any) {
      toast.error('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDownloadSavedPdf = async (courseId: number, dateStr: string) => {
    try {
      const res = await attendanceAPI.getPdf(courseId, dateStr);
      const blob = res.data;
      
      const disposition = res.headers['content-disposition'];
      let filename = '';
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      if (!filename) {
        const course = courses.find(c => c.id === courseId);
        const courseCode = course ? course.course_id : `course-${courseId}`;
        const dateObj = new Date(dateStr);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const cleanDate = `${day}-${month}-${year}`;
        filename = `${courseCode}_${cleanDate}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      toast.error('PDF generation failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const unmarkedCount = records.filter(r => !r.status).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              DAILY CLASS TRACKER
            </span>
          </div>
          <h1 className="text-display-md tracking-tight font-extrabold text-ink">
            Attendance <span className="gradient-text">Console</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-mute mt-1">Mark, export, and manage daily student class attendance sheets.</p>
        </div>
      </div>

      <div className="flex border-b border-hairline/60 gap-2">
        <button
          onClick={() => setActiveTab('take')}
          className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'take'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
          }`}
        >
          Take Attendance
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
          }`}
        >
          Saved Attendance Sheets
        </button>
      </div>

      {activeTab === 'take' && (
        <>
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-3 sm:gap-4">
              <div className="w-full sm:flex-1 lg:w-64">
                <label className="block text-xs font-bold text-ink-secondary uppercase tracking-wider mb-1.5">Course *</label>
                <CustomSelect
                  value={selectedCourseId}
                  onChange={(val) => setSelectedCourseId(val ? parseInt(val) : '')}
                  placeholder="Select a course..."
                  options={[
                    { value: '', label: 'Select a course...' },
                    ...courses.map((c) => ({ value: String(c.id), label: `${c.course_id} - ${c.course_name}` })),
                  ]}
                />
              </div>
              <div className="w-full sm:flex-1 lg:w-48">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="appearance-none block w-full h-10 px-3 py-1.5 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
              </div>
              <button onClick={fetchAttendance} disabled={!selectedCourseId || !date || loading}
                className="w-full lg:w-auto px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-deep disabled:opacity-50 cursor-pointer h-10 transition-all flex items-center justify-center">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : 'Load Students'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="glass-panel rounded-3xl p-8 border border-white/20 dark:border-white/10 shadow-2xl text-center space-y-4">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">Loading Enrolled Students...</h3>
                <p className="text-xs text-ink-mute">Preparing daily attendance sheet</p>
              </div>
              <div className="space-y-2 max-w-sm mx-auto pt-2">
                <div className="shimmer-bg h-10 rounded-xl"></div>
                <div className="shimmer-bg h-10 rounded-xl"></div>
                <div className="shimmer-bg h-10 rounded-xl"></div>
              </div>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/60 pb-4">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-ink font-medium">Total: <span className="font-semibold">{records.length}</span></span>
                  <span className="text-emerald-500 font-medium">Present: <span className="font-semibold">{presentCount}</span></span>
                  <span className="text-rose-500 font-medium">Absent: <span className="font-semibold">{absentCount}</span></span>
                  {unmarkedCount > 0 && <span className="text-ink-mute font-medium">Unmarked: <span className="font-semibold">{unmarkedCount}</span></span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={markAllPresent}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-xs font-bold border border-hairline rounded-xl text-ink hover:bg-canvas-soft transition-all cursor-pointer">
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Mark All Present
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl hover:bg-primary-deep disabled:opacity-50 transition-all cursor-pointer shadow-sm">
                    <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                  <button onClick={handleDownloadPdf}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-xs font-bold border border-hairline rounded-xl text-ink hover:bg-canvas-soft transition-all cursor-pointer">
                    <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Download PDF
                  </button>
                </div>
              </div>

              {/* Mobile Card-Based Roll Call (Thumb-Friendly) */}
              <div className="md:hidden space-y-3">
                {records.map((r, i) => (
                  <div key={r.id} className={`glass-card rounded-2xl p-4 border transition-all space-y-3 ${
                    r.status === 'absent' ? 'border-rose-500/30 bg-rose-500/5' : r.status === 'present' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-hairline'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono text-ink-mute px-1.5 py-0.5 rounded bg-canvas-soft border border-hairline">#{i + 1}</span>
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{r.student_id}</span>
                          {r.section && (
                            <span className="text-[10px] font-mono font-medium text-ink-mute px-1.5 py-0.5 rounded bg-canvas-soft border border-hairline">Sec {r.section}</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-ink truncate">{r.name}</div>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'present'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : r.status === 'absent'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-canvas-soft text-ink-mute border border-hairline'
                        }`}>
                          {r.status || 'Unmarked'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, status: 'present' } : rec))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          r.status === 'present'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                            : 'glass-card text-ink hover:bg-emerald-500/10 hover:text-emerald-500'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, status: 'absent' } : rec))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          r.status === 'absent'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-500/30'
                            : 'glass-card text-ink hover:bg-rose-500/10 hover:text-rose-500'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" /> Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="min-w-full divide-y divide-hairline">
                  <thead className="bg-canvas-soft sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase w-12">SL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Student ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Section</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {records.map((r, i) => (
                      <tr key={r.id} className={`hover:bg-canvas-soft transition-colors ${r.status === 'absent' ? 'bg-rose-500/5' : ''}`}>
                        <td className="px-4 py-3 text-sm text-ink-mute">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono text-ink font-semibold">{r.student_id}</td>
                        <td className="px-4 py-3 text-sm text-ink font-medium">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-ink-mute font-mono">{r.section || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleStatus(r.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer min-w-[80px] ${
                              r.status === 'present'
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25'
                                : r.status === 'absent'
                                ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
                                : 'bg-canvas-soft text-ink-mute border-hairline hover:bg-hairline-cool'
                            }`}>
                            {r.status === 'present' ? 'Present' : r.status === 'absent' ? 'Absent' : 'Mark'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedCourseId && date && records.length === 0 && !loading && (
            <div className="glass-panel rounded-3xl p-12 text-center border border-hairline">
              <p className="text-ink-mute text-sm font-semibold">No enrolled students found for this course.</p>
              <p className="text-ink-mute text-xs mt-1">Add students and enroll them in this course first.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {loadingSheets ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-ink-mute text-sm border border-hairline shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Loading saved records...
            </div>
          ) : savedSheets.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-hairline shadow-lg">
              <p className="text-ink-mute text-sm font-semibold">No saved attendance sheets found.</p>
              <p className="text-ink-mute text-xs mt-1">Take class attendance and save it to review past sessions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Card-Based Saved Sheets */}
              <div className="md:hidden space-y-3">
                {savedSheets.map((s) => {
                  const total = parseInt(s.total_students);
                  const present = parseInt(s.present_count);
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                  
                  let formattedDate = s.date;
                  try {
                    const dObj = new Date(s.date);
                    if (!isNaN(dObj.getTime())) {
                      formattedDate = dObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                  } catch {}

                  return (
                    <div key={`${s.course_id}-${s.date}`} className="glass-card rounded-2xl p-4 border border-hairline shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{s.c_id}</span>
                            <span className="text-xs font-mono text-ink-mute">{formattedDate}</span>
                          </div>
                          <div className="text-xs text-ink-mute truncate">{s.course_name}</div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          rate >= 80 ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : rate >= 50 ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        }`}>
                          {rate}% Rate
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium pt-1 border-t border-hairline/60">
                        <span className="text-ink">Total: <strong className="font-bold">{total}</strong></span>
                        <span className="text-emerald-500">Present: <strong className="font-bold">{present}</strong></span>
                        <span className="text-rose-500">Absent: <strong className="font-bold">{s.absent_count}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedCourseId(s.course_id);
                            let rawDate = s.date;
                            try {
                              rawDate = new Date(s.date).toISOString().split('T')[0];
                            } catch {}
                            setDate(rawDate);
                            setActiveTab('take');
                          }}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1 text-primary" /> Edit
                        </button>
                        <button
                          onClick={() => handleDownloadSavedPdf(s.course_id, s.date)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 mr-1 text-indigo-400" /> PDF
                        </button>
                        <button
                          onClick={() => handleDeleteSheet(s.course_id, s.date)}
                          className="p-2 border border-rose-500/20 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
                          title="Delete Sheet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block glass-panel rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-hairline">
                    <thead className="bg-canvas-soft">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Course</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase">Total Students</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase text-emerald-500">Present</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase text-rose-500">Absent</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase">Attendance Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-ink-mute uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {savedSheets.map((s) => {
                        const total = parseInt(s.total_students);
                        const present = parseInt(s.present_count);
                        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                        
                        let formattedDate = s.date;
                        try {
                          const dObj = new Date(s.date);
                          if (!isNaN(dObj.getTime())) {
                            formattedDate = dObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                          }
                        } catch {}

                        return (
                          <tr key={`${s.course_id}-${s.date}`} className="hover:bg-canvas-soft transition-colors">
                            <td className="px-4 py-3 text-sm text-ink font-mono">{formattedDate}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-bold text-ink">{s.c_id}</div>
                              <div className="text-xs text-ink-mute truncate max-w-[200px]">{s.course_name}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-ink font-semibold">{total}</td>
                            <td className="px-4 py-3 text-sm text-center text-emerald-500 font-bold">{present}</td>
                            <td className="px-4 py-3 text-sm text-center text-rose-500 font-bold">{s.absent_count}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                rate >= 80 ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : rate >= 50 ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                              }`}>
                                {rate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedCourseId(s.course_id);
                                    let rawDate = s.date;
                                    try {
                                      rawDate = new Date(s.date).toISOString().split('T')[0];
                                    } catch {}
                                    setDate(rawDate);
                                    setActiveTab('take');
                                  }}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft cursor-pointer transition-colors"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDownloadSavedPdf(s.course_id, s.date)}
                                  className="inline-flex items-center p-2 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft cursor-pointer transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSheet(s.course_id, s.date)}
                                  className="inline-flex items-center p-2 border border-rose-500/20 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                                  title="Delete Sheet"
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
