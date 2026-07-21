import { BookOpen, Users, Trash2 } from 'lucide-react';
import CustomSelect from '../ui/custom-select';

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Course {
  id: string;
  course_id: string;
  course_name: string;
}

interface CourseMember {
  id: string;
  username: string;
  display_name?: string;
  role: string;
}

interface CourseMemberAssignmentProps {
  courses: Course[];
  users: User[];
  courseMembers: CourseMember[];
  selectedCourseId: string;
  selectedUserId: string;
  selectedRole: string;
  assigning: boolean;
  onCourseChange: (courseId: string) => void;
  onAssign: (e: React.FormEvent) => void;
  onRemoveMember: (userId: string) => void;
  onUserIdChange: (userId: string) => void;
  onRoleChange: (role: string) => void;
}

export default function CourseMemberAssignment({
  courses, users, courseMembers, selectedCourseId, selectedUserId, selectedRole,
  assigning, onCourseChange, onAssign, onRemoveMember, onUserIdChange, onRoleChange
}: CourseMemberAssignmentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-md font-medium text-ink font-sans">Course Assignment</h3>
          <p className="text-xs text-ink-mute mt-1">Assign Course Representatives to shared course entities.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
              Select Course
            </label>
            <CustomSelect
              value={selectedCourseId}
              onChange={(val) => onCourseChange(val)}
              placeholder="Choose a course..."
              options={[
                { value: '', label: 'Choose a course...' },
                ...courses.map((c) => ({ value: String(c.id), label: `${c.course_id} - ${c.course_name}` })),
              ]}
            />
          </div>

          {selectedCourseId && (
            <form onSubmit={onAssign} className="border-t border-hairline-cool pt-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Assign Representative</h4>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Select CR User
                </label>
                <CustomSelect
                  value={selectedUserId}
                  onChange={(val) => onUserIdChange(val)}
                  placeholder="Choose user..."
                  options={[
                    { value: '', label: 'Choose user...' },
                    ...users
                      .filter(u => u.is_active && u.role === 'cr' && !courseMembers.some(cm => cm.id === u.id))
                      .map((u) => ({ value: String(u.id), label: `${u.display_name || u.username} (@${u.username})` }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Membership Role
                </label>
                <CustomSelect
                  value={selectedRole}
                  onChange={(val) => onRoleChange(val)}
                  options={[
                    { value: 'cr', label: 'Course Rep (CR)' },
                    { value: 'lead', label: 'Lead CR' },
                  ]}
                />
              </div>

              <button
                type="submit"
                disabled={assigning || !selectedUserId}
                className="w-full px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50 h-[38px]"
              >
                {assigning ? 'Assigning...' : 'Assign User'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="border-b border-hairline-cool pb-4">
          <h3 className="text-md font-medium text-ink font-sans">
            {selectedCourseId
              ? `Course Members for ${courses.find(c => String(c.id) === String(selectedCourseId))?.course_id}`
              : 'Course Members'
            }
          </h3>
        </div>

        {!selectedCourseId ? (
          <div className="text-center py-12 text-ink-mute text-sm">
            <BookOpen className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
            Select a course from the left panel to manage its assigned Course Representatives.
          </div>
        ) : courseMembers.length === 0 ? (
          <div className="text-center py-12 text-ink-mute text-sm">
            <Users className="w-12 h-12 text-hairline-strong mx-auto stroke-[1] mb-3" />
            No representatives assigned to this course yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseMembers.map((member) => (
              <div key={member.id} className="p-4 border border-hairline rounded-sm flex items-center justify-between hover:border-hairline-strong transition-all bg-canvas-soft/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-hairline-strong flex items-center justify-center font-bold text-ink-secondary text-sm">
                    {(member.display_name || member.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">{member.display_name || member.username}</h4>
                    <p className="text-xs text-ink-mute">@{member.username}</p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      member.role === 'lead' ? 'bg-accent-violet/15 text-accent-violet' : 'bg-primary/15 text-primary-deep'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="p-1.5 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer"
                  title="Remove CR"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
