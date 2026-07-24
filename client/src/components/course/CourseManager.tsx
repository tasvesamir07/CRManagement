import { useState, useEffect, useCallback } from 'react';
import { coursesAPI } from '../../services/api';
import { Plus, Edit2, Trash2, BookOpen, X, AlertCircle, Flag, Sparkles } from 'lucide-react';
import { confirm } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
  teacher_name: string;
  teacher_initials: string;
  member_count?: number;
  default_platform_ids?: string[];
}

interface Member {
  id: number;
  display_name?: string;
  username: string;
  role: string;
}

const CourseManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherInitials, setTeacherInitials] = useState('');
  const [editMembers, setEditMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [err, setErr] = useState('');

  const fetchCourses = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const data: Course[] = await coursesAPI.list();
      setCourses(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const resetForm = () => {
    setCourseId('');
    setCourseName('');
    setTeacherName('');
    setTeacherInitials('');
    setEditId(null);
    setShowForm(false);
    setErr('');
    setEditMembers([]);
  };

  const handleEdit = async (course: Course) => {
    setEditId(course.id);
    setCourseId(course.course_id);
    setCourseName(course.course_name);
    setTeacherName(course.teacher_name);
    setTeacherInitials(course.teacher_initials);
    setShowForm(true);
    
    try {
      setLoadingMembers(true);
      const members: Member[] = await coursesAPI.getMembers(course.id);
      setEditMembers(members);
    } catch (e) {
      console.error('Failed to fetch members:', e);
      setEditMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Are you sure you want to delete this course? This will also hide its routines.', { title: 'Delete Course', variant: 'danger', confirmLabel: 'Delete' }))) {
      return;
    }
    const prev = courses;
    setCourses(prev => prev.filter(c => c.id !== id));
    try {
      await coursesAPI.delete(id);
    } catch (e: any) {
      setCourses(prev);
      toast.error('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !courseName || !teacherName || !teacherInitials) {
      setErr('Please fill in all fields');
      return;
    }

    setErr('');
    try {
      const courseData = {
        course_id: courseId.toUpperCase(),
        course_name: courseName,
        teacher_name: teacherName,
        teacher_initials: teacherInitials.toUpperCase()
      };

      if (editId) {
        const updated = await coursesAPI.update(editId, courseData);
        setCourses(prev => prev.map(c => c.id === editId ? { ...c, ...updated } : c));
      } else {
        const created = await coursesAPI.create(courseData);
        setCourses(prev => [...prev, created]);
      }
      
      resetForm();
    } catch (error: any) {
      setErr(error.response?.data?.error || 'Failed to save course. Check for duplicate Course ID.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              ACADEMIC CONFIGURATION
            </span>
          </div>
          <h1 className="text-display-md tracking-tight font-extrabold text-ink">
            Course <span className="gradient-text">Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-mute mt-1">Configure course entities and instructor mappings for notice templates.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-xs text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all duration-150 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Register New Course
          </button>
        )}
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
        <div className="glass-panel rounded-3xl p-6 border border-white/20 dark:border-white/10 shadow-2xl space-y-5 animate-slide-up">
          <div className="flex items-center justify-between border-b border-hairline/60 pb-4">
            <h3 className="text-base font-extrabold text-ink tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {editId ? 'Edit Course Details' : 'Register New Course'}
            </h3>
            <button onClick={resetForm} className="p-2 text-ink-mute hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {err && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-500 text-sm p-3.5 rounded-xl font-medium flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={courseId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseId(e.target.value)}
                placeholder="SE211"
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs text-ink font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseName(e.target.value)}
                placeholder="Software Engineering"
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs text-ink font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                Teacher Name *
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherName(e.target.value)}
                placeholder="Dr. Nadirali"
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs text-ink font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                Teacher Initials *
              </label>
              <input
                type="text"
                required
                value={teacherInitials}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherInitials(e.target.value)}
                placeholder="NA"
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs text-ink font-mono uppercase font-bold"
              />
            </div>

            {editId && (
              <div className="md:col-span-4 border-t border-hairline/60 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">
                  Assigned Representatives ({editMembers.length})
                </label>
                {loadingMembers ? (
                  <div className="text-xs text-ink-mute flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    Loading assigned representatives...
                  </div>
                ) : editMembers.length === 0 ? (
                  <div className="text-xs text-ink-mute">No Representatives assigned to this course yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-bold text-ink"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {member.display_name || member.username} (@{member.username})
                        <span className="text-[10px] text-primary font-mono uppercase px-1.5 py-0.5 bg-primary/10 rounded-md">
                          {member.role}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-4 flex justify-end gap-3 pt-3 border-t border-hairline/60">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 border border-hairline rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all cursor-pointer"
              >
                {editId ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses List */}
      <div className="glass-panel rounded-3xl p-6 border border-white/20 dark:border-white/10 shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-ink-mute text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            Loading course directory...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-ink-mute text-xs">
            <BookOpen className="w-12 h-12 text-primary/40 mx-auto stroke-[1.5] mb-3 animate-pulse" />
            <p className="font-bold text-sm text-ink mb-1">No Courses Registered</p>
            Click 'Register New Course' to configure your first course.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline/60">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-ink-mute uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Course Name</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Initials</th>
                    <th className="py-3 px-4">Default Platforms</th>
                    <th className="py-3 px-4">CRs Assigned</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/60 text-xs">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-canvas-soft/60 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs font-bold text-primary">{course.course_id}</td>
                      <td className="py-4 px-4 font-bold text-ink text-sm">{course.course_name}</td>
                      <td className="py-4 px-4 font-semibold text-ink-secondary">{course.teacher_name}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-canvas-soft text-ink border border-hairline">
                          {course.teacher_initials}
                        </span>
                      </td>
                    <td className="py-4 px-4">
                      {(course.default_platform_ids || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(course.default_platform_ids || []).map(pid => (
                            <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <Flag className="w-2.5 h-2.5" />
                              {pid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-mute">None</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {course.member_count || 0} {course.member_count === 1 ? 'CR' : 'CRs'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-2 text-ink-mute hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 text-ink-mute hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-Based View */}
            <div className="md:hidden space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="glass-card rounded-2xl p-4 space-y-3 border border-hairline">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-extrabold text-primary font-mono">{course.course_id}</h4>
                      <p className="text-sm font-bold text-ink">{course.course_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-canvas-soft text-ink border border-hairline">
                      {course.teacher_initials}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-ink-mute">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-ink-mute">Instructor</span>
                      <span className="text-ink font-semibold">{course.teacher_name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-ink-mute">CRs Assigned</span>
                      <span className="text-ink font-semibold">{course.member_count || 0} CR(s)</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-mute mb-1">Default Platforms</span>
                    {(course.default_platform_ids || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(course.default_platform_ids || []).map(pid => (
                          <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            <Flag className="w-2.5 h-2.5" />
                            {pid}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-mute">None</span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-hairline/60">
                    <button
                      onClick={() => handleEdit(course)}
                      className="flex items-center gap-1.5 px-3 py-1.5 glass-card rounded-xl text-xs font-bold text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseManager;

