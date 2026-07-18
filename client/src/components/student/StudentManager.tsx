import { useState, useEffect, useCallback, useRef } from 'react';
import { studentsAPI, coursesAPI } from '../../services/api';
import { Plus, Trash2, X, AlertCircle, Upload, Search, Check, ChevronDown } from 'lucide-react';
import { confirm } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  student_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  batch: string | null;
  section: string | null;
  is_active: boolean;
}

interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const [formData, setFormData] = useState({
    student_id: '', name: '', email: '', phone: '', batch: '', section: '', is_active: true
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [enrollAll, setEnrollAll] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [selectedEnrollCourseIds, setSelectedEnrollCourseIds] = useState<number[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setLoading(true);
      const [studentsData, coursesData] = await Promise.all([
        studentsAPI.list({ search: search || undefined, signal: controller.signal }),
        coursesAPI.list({ signal: controller.signal })
      ]);
      if (controller.signal.aborted) return;
      setStudents(Array.isArray(studentsData) ? studentsData : studentsData.rows || []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (e: any) {
      if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
        console.error(e);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); return () => abortRef.current?.abort(); }, [fetchData]);

  const resetForm = () => {
    setFormData({ student_id: '', name: '', email: '', phone: '', batch: '', section: '', is_active: true });
    setSelectedEnrollCourseIds([]);
    setEditId(null);
    setShowForm(false);
    setErr('');
  };

  const handleEdit = async (s: Student) => {
    setFormData({
      student_id: s.student_id,
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      batch: s.batch || '',
      section: s.section || '',
      is_active: s.is_active
    });
    setEditId(s.id);
    setShowForm(true);
    try {
      const currentCourses = await studentsAPI.getCourses(s.id);
      setSelectedEnrollCourseIds(currentCourses.map((c: any) => c.id));
    } catch (e) {
      console.error(e);
      setSelectedEnrollCourseIds([]);
    }
  };

  const handleOpenAddForm = () => {
    setFormData({ student_id: '', name: '', email: '', phone: '', batch: '', section: '', is_active: true });
    setSelectedEnrollCourseIds(courses.map(c => c.id));
    setEditId(null);
    setShowForm(true);
    setErr('');
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this student? This will remove all attendance records.', { title: 'Delete Student', variant: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      await studentsAPI.delete(id);
      toast.success('Student deleted');
      fetchData();
    } catch (e: any) {
      toast.error('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.name) {
      setErr('Student ID and Name are required');
      return;
    }
    setErr('');
    try {
      const payload = {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        batch: formData.batch.trim() || null,
        section: formData.section.trim() || null,
        is_active: formData.is_active,
      };

      if (editId) {
        await studentsAPI.updateWithCourses(editId, {
          ...payload,
          course_ids: selectedEnrollCourseIds,
        });
        toast.success('Student updated');
      } else {
        const student = await studentsAPI.create(payload);
        if (selectedEnrollCourseIds.length > 0) {
          await studentsAPI.enrollCourses(student.id, selectedEnrollCourseIds);
        }
        toast.success('Student created');
      }
      resetForm();
      fetchData();
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to save student');
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkData.trim().split('\n').filter(Boolean);
    const students = lines.map(line => {
      const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      return {
        student_id: parts[0]?.trim() || '',
        name: parts[1]?.trim() || '',
        email: parts[2]?.trim() || '',
        phone: parts[3]?.trim() || '',
        batch: parts[4]?.trim() || '',
        section: parts[5]?.trim() || ''
      };
    }).filter(s => s.student_id && s.name);

    if (students.length === 0) {
      toast.error('No valid student data found');
      return;
    }

    try {
      const result = await studentsAPI.bulkImport({
        students,
        enroll_all: enrollAll,
        course_ids: enrollAll ? undefined : selectedCourseIds
      });
      toast.success(`Imported ${result.created?.length || 0} students` + (result.errors?.length ? ` (${result.errors.length} errors)` : ''));
      setShowBulkModal(false);
      setBulkData('');
      fetchData();
    } catch (e: any) {
      toast.error('Import failed: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Students</h1>
          <p className="text-sm text-ink-mute mt-1.5">Manage student records and course enrollment.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors cursor-pointer shadow-sm">
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </button>
          <button onClick={handleOpenAddForm}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors cursor-pointer shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink">
              {editId ? 'Edit Student' : 'Add Student'}
            </h3>
            <button onClick={resetForm} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {err && (
            <div className="bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Student ID *</label>
              <input type="text" required value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="e.g. 232-35-315 or 210104001"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Phone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center justify-between border-t border-hairline-cool pt-4">
                <span className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Course Enrollments</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEnrollCourseIds.length === courses.length) {
                      setSelectedEnrollCourseIds([]);
                    } else {
                      setSelectedEnrollCourseIds(courses.map(c => c.id));
                    }
                  }}
                  className="text-xs text-primary hover:text-primary-deep font-medium cursor-pointer"
                >
                  {selectedEnrollCourseIds.length === courses.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              {courses.length === 0 ? (
                <p className="text-sm text-ink-mute">No courses available. Please create courses first.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {courses.map(c => {
                    const isSelected = selectedEnrollCourseIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEnrollCourseIds(selectedEnrollCourseIds.filter(id => id !== c.id));
                          } else {
                            setSelectedEnrollCourseIds([...selectedEnrollCourseIds, c.id]);
                          }
                        }}
                        className={`flex items-center justify-between px-3 h-9 rounded-sm border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-hairline bg-canvas text-ink hover:border-hairline-cool hover:bg-canvas-soft'
                        }`}
                      >
                        <span>{c.course_id}</span>
                        {isSelected && <Check className="w-4 h-4 ml-1.5 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer">{editId ? 'Save Changes' : 'Add Student'}</button>
            </div>
          </form>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-canvas rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Bulk Import Students</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-ink-mute">
              Paste data below. Each line: <code className="bg-canvas-soft px-1 rounded">Student ID, Name, Email, Phone, Batch, Section</code> (tab or comma separated).
            </p>
            <textarea value={bulkData} onChange={e => setBulkData(e.target.value)}
              rows={8} placeholder="232-35-315\tJohn Doe\tjohn@example.com\t\tSWE 41\tH"
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-canvas text-ink" />
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enrollAll} onChange={e => setEnrollAll(e.target.checked)}
                  className="rounded border-hairline text-primary focus:ring-primary" />
                <span className="text-ink">Enroll in all courses</span>
              </label>
              {!enrollAll && (
                <div>
                  <label className="block text-xs font-semibold text-ink-mute mb-1">Select courses:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {courses.map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedCourseIds([...selectedCourseIds, c.id]);
                            else setSelectedCourseIds(selectedCourseIds.filter(id => id !== c.id));
                          }}
                          className="rounded border-hairline text-primary focus:ring-primary" />
                        <span className="text-ink truncate">{c.course_id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border border-hairline rounded-sm text-sm text-ink hover:bg-canvas-soft cursor-pointer">Cancel</button>
              <button onClick={handleBulkImport} disabled={!bulkData.trim()}
                className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep disabled:opacity-50 cursor-pointer">
                Import {bulkData.trim().split('\n').filter(Boolean).length} Students
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID or name..."
          className="pl-9 pr-3 py-2 w-full border border-hairline rounded-sm text-sm bg-canvas text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      </div>

      {loading ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center">
          <p className="text-ink-mute text-sm">No students found. Add one or import via CSV.</p>
        </div>
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-hairline">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Student ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-mute uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-canvas-soft transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-ink">{s.student_id}</td>
                  <td className="px-4 py-3 text-sm text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(s)} className="text-ink-mute hover:text-primary mr-2 cursor-pointer" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-ink-mute hover:text-accent-tomato cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentManager;
