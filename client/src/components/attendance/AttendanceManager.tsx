import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, coursesAPI } from '../../services/api';
import { Download, X, AlertCircle, Save, Check, Trash2, Edit } from 'lucide-react';
import { confirm } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';

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
        const cleanDate = date.substring(0, 10);
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
        const cleanDate = dateStr.substring(0, 10);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Attendance</h1>
          <p className="text-sm text-ink-mute mt-1.5">Mark and manage daily attendance.</p>
        </div>
      </div>

      <div className="flex border-b border-hairline-cool">
        <button
          onClick={() => setActiveTab('take')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'take'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          Take Attendance
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'saved'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          Saved Attendance
        </button>
      </div>

      {activeTab === 'take' && (
        <>
          <div className="bg-canvas border border-hairline rounded-lg p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-64">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Course *</label>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : '')}
                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink">
                  <option value="">Select a course...</option>
                  {courses.map(c => (<option key={c.id} value={c.id}>{c.course_id} - {c.course_name}</option>))}
                </select>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
              </div>
              <button onClick={fetchAttendance} disabled={!selectedCourseId || !date}
                className="px-4 py-2 bg-primary text-on-primary rounded-sm text-sm font-medium hover:bg-primary-deep disabled:opacity-50 cursor-pointer h-9">
                Load Students
              </button>
            </div>
          </div>

          {records.length > 0 && (
            <div className="bg-canvas border border-hairline rounded-lg p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-ink font-medium">Total: <span className="font-semibold">{records.length}</span></span>
                  <span className="text-green-600 font-medium">Present: <span className="font-semibold">{presentCount}</span></span>
                  <span className="text-accent-tomato font-medium">Absent: <span className="font-semibold">{absentCount}</span></span>
                  {unmarkedCount > 0 && <span className="text-ink-mute font-medium">Unmarked: <span className="font-semibold">{unmarkedCount}</span></span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={markAllPresent}
                    className="flex items-center px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft cursor-pointer">
                    <Check className="w-3.5 h-3.5 mr-1.5" /> Mark All Present
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-sm hover:bg-primary-deep disabled:opacity-50 cursor-pointer">
                    <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                  <button onClick={handleDownloadPdf}
                    className="flex items-center px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft cursor-pointer">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-hairline">
                  <thead className="bg-canvas-soft sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-mute uppercase w-10">SL</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-mute uppercase">Student ID</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-mute uppercase">Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-mute uppercase">Section</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-ink-mute uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {records.map((r, i) => (
                      <tr key={r.id} className={`hover:bg-canvas-soft transition-colors ${r.status === 'absent' ? 'bg-accent-tomato/5' : ''}`}>
                        <td className="px-3 py-2 text-sm text-ink-mute">{i + 1}</td>
                        <td className="px-3 py-2 text-sm font-mono text-ink">{r.student_id}</td>
                        <td className="px-3 py-2 text-sm text-ink">{r.name}</td>
                        <td className="px-3 py-2 text-sm text-ink-mute">{r.section || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => toggleStatus(r.id)}
                            className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors cursor-pointer min-w-[70px] ${
                              r.status === 'present'
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : r.status === 'absent'
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-canvas-soft text-ink-mute border-hairline hover:bg-hairline-cool'
                            }`}>
                            {r.status === 'present' ? 'Present' : r.status === 'absent' ? 'Absent' : 'Click to mark'}
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
            <div className="bg-canvas border border-hairline rounded-lg p-12 text-center">
              <p className="text-ink-mute text-sm">No enrolled students found for this course.</p>
              <p className="text-ink-mute text-xs mt-1">Add students and enroll them in this course first.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {loadingSheets ? (
            <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Loading saved records...
            </div>
          ) : savedSheets.length === 0 ? (
            <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center">
              <p className="text-ink-mute text-sm">No saved attendance sheets found.</p>
            </div>
          ) : (
            <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline">
                <thead className="bg-canvas-soft">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Course</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase">Total Students</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase text-green-600">Present</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-ink-mute uppercase text-red-600">Absent</th>
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
                        <td className="px-4 py-3 text-sm text-ink">{formattedDate}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-ink">{s.c_id}</div>
                          <div className="text-xs text-ink-mute truncate max-w-[200px]">{s.course_name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-ink">{total}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{present}</td>
                        <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{s.absent_count}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            rate >= 80 ? 'bg-green-50 text-green-700' : rate >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
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
                            className="inline-flex items-center px-2 py-1 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft cursor-pointer transition-colors"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDownloadSavedPdf(s.course_id, s.date)}
                            className="inline-flex items-center px-2 py-1 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft cursor-pointer transition-colors"
                            title="PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSheet(s.course_id, s.date)}
                            className="inline-flex items-center px-2 py-1 border border-transparent rounded-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 cursor-pointer transition-colors"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
