export interface Routine {
  id: number;
  course_id: number;
  c_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section?: string;
}

export interface Slot {
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

/**
 * Normalizes any time string (e.g. "01:00", "1:00 PM", "13:00", "01:00:00") into 24-hour "HH:MM" format.
 * In academic routines, hours 1 to 7 without AM/PM are intelligently treated as PM (13:00 to 19:00),
 * and end times that numerically wrap around morning start times (e.g. 11:30 to 01:00) are recognized as PM.
 */
export const normalizeTo24Hour = (timeStr?: string, refStartTime?: string): string => {
  if (!timeStr) return '';
  const cleaned = timeStr.trim();
  if (!cleaned) return '';

  // Explicit AM / PM match (e.g. "01:00 PM", "1:30am")
  const ampmMatch = cleaned.match(/(AM|PM)/i);
  if (ampmMatch) {
    const withoutPeriod = cleaned.replace(/(AM|PM)/i, '').trim();
    const match = withoutPeriod.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const isPM = ampmMatch[1].toUpperCase() === 'PM';
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }

  // Standard or unlabelled time "HH:MM" or "H:MM"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return cleaned.substring(0, 5);

  let h = parseInt(match[1], 10);
  const m = match[2];

  // Already 24h afternoon/evening (>= 13:00)
  if (h >= 13) {
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // 12:xx is 12:xx PM (noon)
  if (h === 12) {
    return `12:${m}`;
  }

  // Check against reference start time (e.g., start 11:30 -> end 01:00)
  if (refStartTime) {
    const ref24 = normalizeTo24Hour(refStartTime);
    const [refHStr] = ref24.split(':');
    const refH = parseInt(refHStr, 10);
    if (!isNaN(refH)) {
      if (h < 12 && (refH >= 12 || (refH >= 10 && h < 8))) {
        return `${String(h + 12).padStart(2, '0')}:${m}`;
      }
    }
  }

  // Academic schedule heuristics:
  // University class hours between 1 and 7 (01:00 - 07:59) are afternoon/evening classes (PM)
  if (h >= 1 && h <= 7) {
    return `${String(h + 12).padStart(2, '0')}:${m}`;
  }

  // Morning hours (8 to 11) or midnight (0)
  return `${String(h).padStart(2, '0')}:${m}`;
};

/**
 * Splits a time string into 12-hour "hh:mm" and period ("AM" | "PM").
 */
export const splitTo12Hour = (timeStr?: string, refStartTime?: string): { time: string; period: 'AM' | 'PM' } => {
  if (!timeStr) return { time: '12:00', period: 'AM' };
  const norm24 = normalizeTo24Hour(timeStr, refStartTime);
  const [hStr, mStr] = norm24.split(':');
  const h = parseInt(hStr, 10) || 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return {
    time: `${String(hour12).padStart(2, '0')}:${mStr || '00'}`,
    period
  };
};

/**
 * Combines a 12-hour time string ("01:00") and a period ("PM") into 24-hour "13:00".
 */
export const combineTo24Hour = (time12: string, period: 'AM' | 'PM'): string => {
  if (!time12) return '';
  const match = time12.trim().match(/^(\d{1,2}):?(\d{0,2})/);
  if (!match) return time12;
  let h = parseInt(match[1], 10) || 12;
  const m = (match[2] || '00').padEnd(2, '0').substring(0, 2);
  if (h > 12) h = h % 12 || 12; // Handle accidental 24h entry gracefully
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

/**
 * Checks if two time strings represent the same time slot (e.g. "01:00" and "13:00").
 */
export const areSlotsMatching = (timeA?: string, timeB?: string): boolean => {
  if (!timeA || !timeB) return false;
  const a5 = timeA.substring(0, 5);
  const b5 = timeB.substring(0, 5);
  if (a5 === b5) return true;
  return normalizeTo24Hour(timeA) === normalizeTo24Hour(timeB);
};

/**
 * Formats a start and end time range for display.
 * If includePeriod is true: "11:30 AM – 01:00 PM"
 * If false: "11:30 – 01:00"
 */
export const formatTimeRange = (start: string, end: string, includePeriod = false): string => {
  if (!start && !end) return '';
  const startNorm = normalizeTo24Hour(start);
  const endNorm = normalizeTo24Hour(end, startNorm);
  const start12 = splitTo12Hour(startNorm);
  const end12 = splitTo12Hour(endNorm, startNorm);

  if (includePeriod) {
    return `${start12.time} ${start12.period} – ${end12.time} ${end12.period}`;
  }
  return `${start12.time} – ${end12.time}`;
};

export const getSortedSlots = (routines: Routine[], customSlots?: Slot[]): Slot[] => {
  const slotsMap = new Map<string, string>();
  const baseSlots = customSlots || STANDARD_SLOTS_24;
  baseSlots.forEach(s => {
    const s24 = normalizeTo24Hour(s.start);
    const e24 = normalizeTo24Hour(s.end, s24);
    slotsMap.set(s24, e24);
  });
  routines.forEach(r => {
    const start = normalizeTo24Hour(r.start_time);
    const end = normalizeTo24Hour(r.end_time, start);
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
    const dayMatches = r.day_of_week.toLowerCase() === day.toLowerCase();
    const startMatches = areSlotsMatching(r.start_time, slot.start);
    return dayMatches && startMatches;
  });
};
