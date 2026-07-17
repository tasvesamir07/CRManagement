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

interface Slot {
  start: string;
  end: string;
}

export const DAYS_OF_WEEK = [
  'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
];

export const STANDARD_SLOTS_24: Slot[] = [
  { start: '08:30', end: '10:00' },
  { start: '10:00', end: '11:30' },
  { start: '11:30', end: '13:00' },
  { start: '13:00', end: '14:30' },
  { start: '14:30', end: '16:00' },
  { start: '16:00', end: '17:30' }
];

export const formatTimeRange = (start24: string, end24: string): string => {
  const to12h = (timeStr: string): string => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const formattedHour = hour % 12 || 12;
    return `${String(formattedHour).padStart(2, '0')}:${m}`;
  };
  return `${to12h(start24)} – ${to12h(end24)}`;
};

export const getSortedSlots = (routines: Routine[], customSlots?: Slot[]): Slot[] => {
  const slotsMap = new Map<string, string>();
  const baseSlots = customSlots || STANDARD_SLOTS_24;
  baseSlots.forEach(s => { slotsMap.set(s.start, s.end); });
  routines.forEach(r => {
    const start = r.start_time.substring(0, 5);
    const end = r.end_time.substring(0, 5);
    slotsMap.set(start, end);
  });
  const sortedStarts = Array.from(slotsMap.keys()).sort((a, b) => a.localeCompare(b));
  return sortedStarts.map(start => ({ start, end: slotsMap.get(start)! }));
};

export const getActiveDays = (routines: Routine[], customDays?: string[]): string[] => {
  const baseDays = customDays || ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Thursday'];
  const activeDays: string[] = [];
  DAYS_OF_WEEK.forEach(day => {
    const hasRoutine = routines.some(r => r.day_of_week.toLowerCase() === day.toLowerCase());
    if (baseDays.includes(day) || hasRoutine) {
      activeDays.push(day);
    }
  });
  return activeDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
};

export const getCellRoutines = (routines: Routine[], slot: Slot, day: string): Routine[] => {
  return routines.filter(r => {
    const rStart = r.start_time.substring(0, 5);
    const rEnd = r.end_time.substring(0, 5);
    return rStart === slot.start && rEnd === slot.end && r.day_of_week.toLowerCase() === day.toLowerCase();
  });
};
