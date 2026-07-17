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
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
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

export const getSortedSlots = (routines: Routine[]): Slot[] => {
  const slotsMap = new Map<string, string>();
  STANDARD_SLOTS_24.forEach(s => { slotsMap.set(s.start, s.end); });
  routines.forEach(r => {
    const start = r.start_time.substring(0, 5);
    const end = r.end_time.substring(0, 5);
    slotsMap.set(start, end);
  });
  const sortedStarts = Array.from(slotsMap.keys()).sort((a, b) => a.localeCompare(b));
  return sortedStarts.map(start => ({ start, end: slotsMap.get(start)! }));
};

export const getActiveDays = (routines: Routine[]): string[] => {
  const baseDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Thursday'];
  const hasWednesday = routines.some(r => r.day_of_week.toLowerCase() === 'wednesday');
  const hasFriday = routines.some(r => r.day_of_week.toLowerCase() === 'friday');
  const activeDays: string[] = [];
  if (routines.some(r => r.day_of_week.toLowerCase() === 'saturday') || baseDays.includes('Saturday')) activeDays.push('Saturday');
  if (routines.some(r => r.day_of_week.toLowerCase() === 'sunday') || baseDays.includes('Sunday')) activeDays.push('Sunday');
  if (routines.some(r => r.day_of_week.toLowerCase() === 'monday') || baseDays.includes('Monday')) activeDays.push('Monday');
  if (routines.some(r => r.day_of_week.toLowerCase() === 'tuesday') || baseDays.includes('Tuesday')) activeDays.push('Tuesday');
  if (hasWednesday) activeDays.push('Wednesday');
  if (routines.some(r => r.day_of_week.toLowerCase() === 'thursday') || baseDays.includes('Thursday')) activeDays.push('Thursday');
  if (hasFriday) activeDays.push('Friday');
  return activeDays;
};

export const getCellRoutines = (routines: Routine[], slot: Slot, day: string): Routine[] => {
  return routines.filter(r => {
    const rStart = r.start_time.substring(0, 5);
    const rEnd = r.end_time.substring(0, 5);
    return rStart === slot.start && rEnd === slot.end && r.day_of_week.toLowerCase() === day.toLowerCase();
  });
};
