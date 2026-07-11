
import { Calendar, Clock, X } from 'lucide-react';

export default function SchedulePicker({ scheduleDateTime, setScheduleDateTime, show, onToggle }) {
  if (!show) {
    return (
      <button type="button" onClick={onToggle}
        className="flex items-center px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">
        <Clock className="w-4 h-4 mr-2" /> Schedule for Later
      </button>
    );
  }

  return (
    <div className="border border-accent-violet/30 rounded-sm p-4 bg-accent-violet/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-accent-violet">
          <Calendar className="w-4 h-4" />
          Schedule Broadcast
        </div>
        <button type="button" onClick={onToggle} className="p-1 text-ink-mute hover:text-accent-tomato cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <input type="datetime-local" value={scheduleDateTime} onChange={e => setScheduleDateTime(e.target.value)}
        className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink focus:outline-none focus:border-accent-violet" />
      <p className="text-xs text-ink-mute">The announcement will be sent automatically at the scheduled time.</p>
    </div>
  );
}
