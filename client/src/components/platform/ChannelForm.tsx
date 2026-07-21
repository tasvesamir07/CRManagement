import { X } from 'lucide-react';
import CustomSelect from '../ui/custom-select';

interface Course {
  id: string;
  course_id: string;
  course_name: string;
}

interface ChannelFormProps {
  editId: string | null;
  pName: string;
  setPName: (name: string) => void;
  pType: string;
  setPType: (type: string) => void;
  pChatId: string;
  setPChatId: (id: string) => void;
  pTopicId: string;
  setPTopicId: (id: string) => void;
  pDesc: string;
  setPDesc: (desc: string) => void;
  pCourseId: string | null;
  setPCourseId: (id: string | null) => void;
  courses: Course[];
  err: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const ChannelForm = ({ editId, pName, setPName, pType, setPType, pChatId, setPChatId,
  pTopicId, setPTopicId, pDesc, setPDesc, pCourseId, setPCourseId,
  courses, err, onSubmit, onCancel }: ChannelFormProps) => {

  return (
    <form onSubmit={onSubmit} className="p-4 bg-canvas-soft border border-hairline rounded-sm space-y-4">
      <div className="flex items-center justify-between border-b border-hairline-cool pb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          {editId ? 'Edit Broadcast Target' : 'Link Broadcast Target'}
        </h4>
        <button type="button" onClick={onCancel} className="text-ink-mute hover:text-ink cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {err && <div className="text-xs text-accent-tomato">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Platform Type</label>
          <CustomSelect
            value={pType}
            onChange={(val) => setPType(val)}
            options={[
              { value: 'telegram', label: 'Telegram Bot Channel' },
              { value: 'whatsapp', label: 'WhatsApp Group JID' },
              { value: 'messenger', label: 'Facebook Messenger Group' },
            ]}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Course (Optional)</label>
          <CustomSelect
            value={pCourseId || ''}
            onChange={(val) => setPCourseId(val || null)}
            placeholder="No Course Association"
            options={[
              { value: '', label: 'No Course Association' },
              ...courses.map(course => ({ value: String(course.id), label: `${course.course_id} - ${course.course_name}` })),
            ]}
          />
          <p className="text-[9px] text-ink-mute mt-1">Associate this platform with a course for default platform selection.</p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Channel / Group Name</label>
          <input type="text" required value={pName} onChange={(e) => setPName(e.target.value)}
            placeholder="e.g. SWE Course Channel"
            className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Group / Chat ID / Thread ID</label>
          <input type="text" required value={pChatId} onChange={(e) => setPChatId(e.target.value)}
            placeholder={pType === 'telegram' ? 'e.g. -1001234567890' : pType === 'whatsapp' ? 'e.g. 12036329481920@g.us' : 'e.g. 123456789012345 (Group Thread ID)'}
            className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs" />
        </div>

        {pType === 'telegram' && (
          <div>
            <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Topic ID (Optional)</label>
            <input type="text" value={pTopicId} onChange={(e) => setPTopicId(e.target.value)}
              placeholder="e.g. 42"
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs" />
            <p className="text-[9px] text-ink-mute mt-1">For supergroups with Forum Topics enabled.</p>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase text-ink-mute mb-1">Description / Notes</label>
          <input type="text" value={pDesc} onChange={(e) => setPDesc(e.target.value)}
            placeholder="Main broadcasting group"
            className="w-full px-3 py-2 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-2 border-t border-hairline-cool">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 border border-hairline rounded-sm text-xs font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
          Cancel
        </button>
        <button type="submit"
          className="px-3 py-1.5 rounded-sm text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors cursor-pointer">
          {editId ? 'Save Changes' : 'Register Target'}
        </button>
      </div>
    </form>
  );
};

export default ChannelForm;
