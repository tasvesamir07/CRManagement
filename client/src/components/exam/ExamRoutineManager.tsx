import { useState, useEffect, useCallback } from 'react';
import { examRoutinesAPI, coursesAPI } from '../../services/api';
import { Plus, Trash2, X, AlertCircle, Edit2 } from 'lucide-react';
import { confirm } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

interface ExamRoutine {
  id: number;
  course_id: number;
  c_id: string;
  course_name: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section: string;
  instructions: string;
}

const EXAM_TYPES = ['mid', 'final', 'quiz', 'makeup'];

const ExamRoutineManager = () => {
  const [routines, setRoutines] = useState<ExamRoutine[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({
    course_id: '', exam_type: 'mid', exam_date: '',
    start_time: '', end_time: '', room_number: '', section: '', instructions: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [routinesData, coursesData] = await Promise.all([
        examRoutinesAPI.list({ exam_type: filterType || undefined }),
        coursesAPI.list()
      ]);
      const fetchedRoutines = Array.isArray(routinesData) ? routinesData : [];
      const fetchedCourses = Array.isArray(coursesData) ? coursesData : [];
      setRoutines(fetchedRoutines);
      setCourses(fetchedCourses);
      if (fetchedCourses.length > 0) {
        setFormData(prev => {
          if (!prev.course_id) {
            return { ...prev, course_id: fetchedCourses[0].id.toString() };
          }
          return prev;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormData({
      course_id: courses[0]?.id?.toString() || '',
      exam_type: 'mid', exam_date: '',
      start_time: '', end_time: '', room_number: '', section: '', instructions: ''
    });
    setEditId(null);
    setShowForm(false);
    setErr('');
  };

  const handleEdit = (r: ExamRoutine) => {
    setFormData({
      course_id: r.course_id.toString(),
      exam_type: r.exam_type,
      exam_date: r.exam_date,
      start_time: r.start_time.substring(0, 5),
      end_time: r.end_time.substring(0, 5),
      room_number: r.room_number || '',
      section: r.section || '',
      instructions: r.instructions || ''
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this exam routine?', { title: 'Delete Exam Routine', variant: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      await examRoutinesAPI.delete(id);
      toast.success('Exam routine deleted');
      fetchData();
    } catch (e: any) {
      toast.error('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id || !formData.exam_date || !formData.start_time || !formData.end_time) {
      setErr('Please fill in all required fields');
      return;
    }
    setErr('');
    try {
      const payload = {
        course_id: parseInt(formData.course_id),
        exam_type: formData.exam_type,
        exam_date: formData.exam_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room_number: formData.room_number || null,
        section: formData.section || null,
        instructions: formData.instructions || null
      };
      if (editId) await examRoutinesAPI.update(editId, payload);
      else await examRoutinesAPI.create(payload);
      toast.success(editId ? 'Exam routine updated' : 'Exam routine created');
      resetForm();
      fetchData();
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to save exam routine');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Exam Routines</h1>
          <p className="text-sm text-ink-mute mt-1.5">Manage Mid, Final, Quiz and Makeup exam schedules.</p>
        </div>
        {courses.length > 0 && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors cursor-pointer shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Exam
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink">{editId ? 'Edit Exam' : 'Add Exam Schedule'}</h3>
            <button onClick={resetForm} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {err && (
            <div className="bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Course *</label>
              <select required value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}
                className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas text-sm text-ink">
                {courses.map(c => (<option key={c.id} value={c.id}>{c.course_id}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Exam Type *</label>
              <select required value={formData.exam_type} onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas text-sm text-ink">
                {EXAM_TYPES.map(t => (<option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Date *</label>
              <input type="date" required value={formData.exam_date} onChange={e => setFormData({ ...formData, exam_date: e.target.value })}
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Start Time *</label>
              <input type="time" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">End Time *</label>
              <input type="time" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Room</label>
              <input type="text" value={formData.room_number} onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="Room 402"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Section</label>
              <input type="text" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}
                placeholder="e.g. A"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Instructions</label>
              <input type="text" value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Bring calculator..."
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer">{editId ? 'Save Changes' : 'Add Exam'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setFilterType('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer ${
            !filterType ? 'bg-primary text-on-primary border-primary' : 'bg-canvas text-ink border-hairline hover:bg-canvas-soft'
          }`}>All</button>
        {EXAM_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer capitalize ${
              filterType === t ? 'bg-primary text-on-primary border-primary' : 'bg-canvas text-ink border-hairline hover:bg-canvas-soft'
            }`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading exam routines...
        </div>
      ) : routines.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center">
          <p className="text-ink-mute text-sm">No exam routines found.</p>
        </div>
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-hairline">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Course</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Room</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Section</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-mute uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {routines.map(r => (
                <tr key={r.id} className="hover:bg-canvas-soft transition-colors">
                  <td className="px-4 py-3 text-sm text-ink">{new Date(r.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3 text-sm text-ink">{r.c_id} - {r.course_name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary capitalize">{r.exam_type}</span></td>
                  <td className="px-4 py-3 text-sm font-mono text-ink">{r.start_time.substring(0, 5)} - {r.end_time.substring(0, 5)}</td>
                  <td className="px-4 py-3 text-sm text-ink-mute">{r.room_number || '-'}</td>
                  <td className="px-4 py-3 text-sm text-ink-mute">{r.section || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(r)} className="text-ink-mute hover:text-primary mr-2 cursor-pointer" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-ink-mute hover:text-accent-tomato cursor-pointer" title="Delete">
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

export default ExamRoutineManager;
