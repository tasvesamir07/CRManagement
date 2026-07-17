import { useState, useEffect, useCallback } from 'react';
import { coursesAPI } from '../../services/api';
import { Plus, Edit2, Trash2, BookOpen, X, AlertCircle, Flag } from 'lucide-react';
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
    try {
      setCourses(prev => prev.filter(c => c.id !== id));
      await coursesAPI.delete(id);
      fetchCourses(true);
    } catch (e: any) {
      toast.error('Delete failed: ' + (e.response?.data?.error || e.message));
      fetchCourses();
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
        await coursesAPI.update(editId, courseData);
      } else {
        await coursesAPI.create(courseData);
      }
      
      resetForm();
      fetchCourses();
    } catch (error: any) {
      setErr(error.response?.data?.error || 'Failed to save course. Check for duplicate Course ID.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Course Directory</h1>
          <p className="text-sm text-ink-mute mt-1.5">Configure course entities for automated notification templates.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors duration-150 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Course
          </button>
        )}
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink">
              {editId ? 'Edit Course Details' : 'Register New Course'}
            </h3>
            <button onClick={resetForm} className="text-ink-mute hover:text-ink cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {err && (
            <div className="bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={courseId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseId(e.target.value)}
                placeholder="SE211"
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseName(e.target.value)}
                placeholder="Software Engineering"
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Teacher Name *
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherName(e.target.value)}
                placeholder="Dr. Nadirali"
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Teacher Initials *
              </label>
              <input
                type="text"
                required
                value={teacherInitials}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherInitials(e.target.value)}
                placeholder="NA"
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink font-mono uppercase"
              />
            </div>

            {editId && (
              <div className="md:col-span-4 border-t border-hairline-cool pt-4">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">
                  Assigned Representatives ({editMembers.length})
                </label>
                {loadingMembers ? (
                  <div className="text-xs text-ink-mute flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Loading members...
                  </div>
                ) : editMembers.length === 0 ? (
                  <div className="text-xs text-ink-mute">No Course Representatives assigned yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas-soft border border-hairline text-xs font-medium text-ink"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {member.display_name || member.username} (@{member.username})
                        <span className="text-[10px] text-ink-mute font-semibold uppercase px-1 bg-hairline-cool rounded ml-1">
                          {member.role}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-4 flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors cursor-pointer"
              >
                {editId ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses List */}
      <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            Loading courses database...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            <BookOpen className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
            No courses registered. Click 'Add Course' to start.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-hairline-cool">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-mute uppercase tracking-wider bg-canvas-soft">
                    <th className="py-3 px-6">Code</th>
                    <th className="py-3 px-6">Course Name</th>
                    <th className="py-3 px-6">Instructor</th>
                    <th className="py-3 px-6">Initials</th>
                    <th className="py-3 px-6">Default Platforms</th>
                    <th className="py-3 px-6">CRs Assigned</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-cool text-sm text-ink-secondary">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-canvas-soft transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-ink">{course.course_id}</td>
                      <td className="py-4 px-6 font-medium text-ink">{course.course_name}</td>
                      <td className="py-4 px-6">{course.teacher_name}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-hairline-cool text-ink">
                          {course.teacher_initials}
                        </span>
                      </td>
                    <td className="py-4 px-6">
                      {(course.default_platform_ids || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(course.default_platform_ids || []).map(pid => (
                            <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary-deep">
                              <Flag className="w-2.5 h-2.5" />
                              {pid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-mute">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary-deep">
                        {course.member_count || 0} {course.member_count === 1 ? 'CR' : 'CRs'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-1 text-ink-mute hover:text-ink hover:bg-hairline-cool rounded transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-all cursor-pointer"
                            title="Delete"
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
            <div className="md:hidden divide-y divide-hairline-cool bg-canvas">
              {courses.map((course) => (
                <div key={course.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-ink">{course.course_id}</h4>
                      <p className="text-sm font-medium text-ink-secondary">{course.course_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-hairline-cool text-ink">
                      {course.teacher_initials}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-ink-mute">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-ink-mute/70">Instructor</span>
                      <span className="text-ink-secondary">{course.teacher_name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-ink-mute/70">CRs Assigned</span>
                      <span className="text-ink-secondary">{course.member_count || 0} CR(s)</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-ink-mute/70 mb-1">Default Platforms</span>
                    {(course.default_platform_ids || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(course.default_platform_ids || []).map(pid => (
                          <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary-deep">
                            <Flag className="w-2.5 h-2.5" />
                            {pid}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-mute">None</span>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-hairline-cool/40">
                    <button
                      onClick={() => handleEdit(course)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded text-xs font-semibold text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-tomato/20 rounded text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer"
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
