
import { BookOpen, Users, ChevronDown, Trash2 } from 'lucide-react';

export default function CourseMemberAssignment({
  courses, users, courseMembers, selectedCourseId, selectedUserId, selectedRole,
  assigning, onCourseChange, onAssign, onRemoveMember, onUserIdChange, onRoleChange
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel: Course Selector & Assign Member Form */}
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
            <div className="custom-select-wrapper">
              <select
                value={selectedCourseId}
                onChange={(e) => onCourseChange(e.target.value)}
                className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-[38px] cursor-pointer hover:border-hairline-strong transition-all duration-150"
              >
                <option value="">Choose a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_id} - {c.course_name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {selectedCourseId && (
            <form onSubmit={onAssign} className="border-t border-hairline-cool pt-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Assign Representative</h4>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Select CR User
                </label>
                <div className="custom-select-wrapper">
                  <select
                    value={selectedUserId}
                    onChange={(e) => onUserIdChange(e.target.value)}
                    className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-[38px] cursor-pointer hover:border-hairline-strong transition-all duration-150"
                    required
                  >
                    <option value="">Choose user...</option>
                    {users
                      .filter(u => u.is_active && u.role === 'cr' && !courseMembers.some(cm => cm.id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name || u.username} (@{u.username})
                        </option>
                      ))
                    }
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Membership Role
                </label>
                <div className="custom-select-wrapper">
                  <select
                    value={selectedRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-[38px] cursor-pointer hover:border-hairline-strong transition-all duration-150"
                  >
                    <option value="cr">Course Rep (CR)</option>
                    <option value="lead">Lead CR</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
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

      {/* Right Panel: Assigned Course Members List */}
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
