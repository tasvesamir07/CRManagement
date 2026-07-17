import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { DAYS_OF_WEEK } from './routineUtils';

interface Slot {
  start: string;
  end: string;
}

interface Routine {
  id: number;
  course_id: number;
  c_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section?: string;
}

interface ConfigureLayoutModalProps {
  show: boolean;
  onClose: () => void;
  customDays: string[];
  customSlots: Slot[];
  routines: Routine[];
  onSave: (days: string[], slots: Slot[]) => void;
}

export default function ConfigureLayoutModal({
  show,
  onClose,
  customDays,
  customSlots,
  routines,
  onSave
}: ConfigureLayoutModalProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(customDays);
  const [slots, setSlots] = useState<Slot[]>(customSlots);

  // New slot form state
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [error, setError] = useState('');

  if (!show) return null;

  const handleToggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStart || !newEnd) {
      setError('Please select both start and end times');
      return;
    }

    if (newStart >= newEnd) {
      setError('Start time must be before end time');
      return;
    }

    // Check if slot already exists
    const duplicate = slots.some(s => s.start === newStart && s.end === newEnd);
    if (duplicate) {
      setError('This time slot already exists');
      return;
    }

    const updatedSlots = [...slots, { start: newStart, end: newEnd }].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    setSlots(updatedSlots);
    setNewStart('');
    setNewEnd('');
    setError('');
  };

  const handleDeleteSlot = (slot: Slot) => {
    if (isSlotInUse(slot)) return;
    setSlots(prev => prev.filter(s => !(s.start === slot.start && s.end === slot.end)));
  };

  const isSlotInUse = (slot: Slot) => {
    return routines.some(
      r => r.start_time.substring(0, 5) === slot.start && r.end_time.substring(0, 5) === slot.end
    );
  };

  const isDayInUse = (day: string) => {
    return routines.some(r => r.day_of_week.toLowerCase() === day.toLowerCase());
  };

  const handleSave = () => {
    if (selectedDays.length === 0) {
      setError('Please select at least one active day');
      return;
    }
    onSave(selectedDays, slots);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-canvas border border-hairline rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline p-4">
          <h3 className="text-sm font-semibold text-ink">Configure Grid Layout</h3>
          <button onClick={onClose} className="text-ink-mute hover:text-ink cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Days Section */}
          <div className="space-y-2">
            <label className="font-semibold text-ink uppercase tracking-wider block">Active Days</label>
            <p className="text-[10px] text-ink-mute leading-relaxed">
              Select which days are visible in your routine grid. Days with scheduled classes will remain visible automatically to prevent hidden notices.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {DAYS_OF_WEEK.map(day => {
                const isChecked = selectedDays.includes(day);
                const hasRoutines = isDayInUse(day);
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-2 p-2 border rounded-sm transition-colors ${
                      isChecked ? 'border-primary/40 bg-primary/5 text-ink' : 'border-hairline hover:bg-canvas-soft text-ink-mute'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked || hasRoutines}
                      disabled={hasRoutines}
                      onChange={() => handleToggleDay(day)}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span>{day}</span>
                    {hasRoutines && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full ml-auto">
                        In Use
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Time Slots Section */}
          <div className="space-y-2">
            <label className="font-semibold text-ink uppercase tracking-wider block">Time Slots</label>
            <p className="text-[10px] text-ink-mute leading-relaxed">
              Manage the row time slots for your schedule. You cannot delete a time slot that currently has a scheduled class.
            </p>

            {/* List of slots */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto border border-hairline rounded p-2 bg-canvas-soft/30">
              {slots.length === 0 ? (
                <p className="text-ink-faint text-center py-4">No time slots configured.</p>
              ) : (
                slots.map((s, idx) => {
                  const inUse = isSlotInUse(s);
                  return (
                    <div
                      key={`${s.start}-${s.end}-${idx}`}
                      className="flex items-center justify-between p-2 bg-canvas border border-hairline rounded-sm"
                    >
                      <span className="font-medium text-ink">
                        {s.start} &ndash; {s.end}
                      </span>
                      <button
                        type="button"
                        disabled={inUse}
                        onClick={() => handleDeleteSlot(s)}
                        className={`p-1.5 rounded-sm transition-colors ${
                          inUse
                            ? 'text-ink-faint bg-hairline/20 cursor-not-allowed'
                            : 'text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/5 cursor-pointer'
                        }`}
                        title={inUse ? 'Cannot delete: Class scheduled in this slot' : 'Delete time slot'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add time slot form */}
            <form onSubmit={handleAddSlot} className="flex gap-2 items-end pt-2 border-t border-hairline">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-ink-mute block mb-1">Start Time</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="w-full px-2 py-1.5 border border-hairline rounded-sm bg-canvas text-ink text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-ink-mute block mb-1">End Time</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="w-full px-2 py-1.5 border border-hairline rounded-sm bg-canvas text-ink text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary hover:bg-primary-deep text-on-primary font-semibold rounded-sm cursor-pointer transition-colors shadow-sm h-[29px] flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {error && (
            <div className="flex items-start gap-1.5 p-2.5 bg-accent-tomato/5 border border-accent-tomato/20 rounded-sm text-accent-tomato text-[10px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hairline flex items-center justify-end gap-2 bg-canvas-soft/30 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-hairline rounded-sm text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-deep text-on-primary font-semibold rounded-sm cursor-pointer transition-colors shadow-sm"
          >
            Save Layout
          </button>
        </div>

      </div>
    </div>
  );
}
