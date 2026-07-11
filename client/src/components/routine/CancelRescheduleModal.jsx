import { X, Clock } from 'lucide-react';
import { formatTimeRange } from './routineUtils';

export default function CancelRescheduleModal({ announceTarget, onClose }) {
  if (!announceTarget) return null;

  const { routine, slot, matchedCourse } = announceTarget;
  const initials = matchedCourse ? matchedCourse.teacher_initials : '';
  const timeRangeStr = formatTimeRange(slot.start, slot.end);

  const handleCancelClass = () => {
    onClose('cancel', {
      preFillTitle: `Class Cancelled: ${routine.c_id}`,
      preFillBody: `Dear batch,\n\nPlease note that the *${matchedCourse?.course_name || routine.c_id}* (${initials ? initials : ''}) class scheduled for *${routine.day_of_week}* at *${timeRangeStr}* in Room *${routine.room_number}* has been *CANCELLED*.\n\nEnjoy the break! ☕`,
      preFillCategory: 'notice'
    });
  };

  const handleRescheduleClass = () => {
    onClose('reschedule', {
      preFillTitle: `Class Rescheduled: ${routine.c_id}`,
      preFillBody: `Dear batch,\n\nPlease note that the *${matchedCourse?.course_name || routine.c_id}* (${initials ? initials : ''}) class scheduled for *${routine.day_of_week}* at *${timeRangeStr}* in Room *${routine.room_number}* has been *RESCHEDULED*.\n\n*New Schedule:*\n- Day/Date: [New Day]\n- Time: [New Time]\n- Room: [New Room]\n\nKindly adjust your timings. 🕒`,
      preFillCategory: 'notice'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-canvas border border-hairline rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between border-b border-hairline-cool pb-2.5">
          <h3 className="text-sm font-semibold text-ink">Announce Class Change</h3>
          <button onClick={() => onClose('dismiss')} className="text-ink-mute hover:text-ink cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <p className="text-xs text-ink-mute">
          Draft an announcement for <strong>{routine.c_id}</strong> on {routine.day_of_week} at {timeRangeStr}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleCancelClass}
            className="flex flex-col items-center justify-center p-4 bg-canvas hover:border-accent-tomato hover:bg-accent-tomato/5 border border-hairline rounded-md cursor-pointer transition-all duration-150 text-ink hover:text-accent-tomato group">
            <X className="w-6 h-6 mb-2 text-ink-mute group-hover:text-accent-tomato" />
            <span className="text-xs font-semibold">Cancel Class</span>
          </button>
          <button onClick={handleRescheduleClass}
            className="flex flex-col items-center justify-center p-4 bg-canvas hover:border-primary hover:bg-primary/5 border border-hairline rounded-md cursor-pointer transition-all duration-150 text-ink hover:text-primary group">
            <Clock className="w-6 h-6 mb-2 text-ink-mute group-hover:text-primary" />
            <span className="text-xs font-semibold">Reschedule Class</span>
          </button>
        </div>
      </div>
    </div>
  );
}
