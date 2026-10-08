import { describe, it, expect } from 'vitest';
import {
  normalizeTo24Hour,
  splitTo12Hour,
  combineTo24Hour,
  areSlotsMatching,
  formatTimeRange,
  getSortedSlots,
  getCellRoutines,
  Slot,
  Routine
} from './routineUtils';

describe('routineUtils - Time Normalization and AM/PM Handling', () => {
  describe('normalizeTo24Hour', () => {
    it('should keep standard morning hours as AM', () => {
      expect(normalizeTo24Hour('08:30')).toBe('08:30');
      expect(normalizeTo24Hour('10:00')).toBe('10:00');
      expect(normalizeTo24Hour('11:30')).toBe('11:30');
    });

    it('should normalize afternoon academic routine hours without AM/PM to PM', () => {
      expect(normalizeTo24Hour('01:00')).toBe('13:00');
      expect(normalizeTo24Hour('02:30')).toBe('14:30');
      expect(normalizeTo24Hour('04:00')).toBe('16:00');
      expect(normalizeTo24Hour('05:30')).toBe('17:30');
    });

    it('should handle end times rolling over from morning start times', () => {
      expect(normalizeTo24Hour('01:00', '11:30')).toBe('13:00');
      expect(normalizeTo24Hour('02:30', '11:30')).toBe('14:30');
    });

    it('should respect explicit AM and PM markers', () => {
      expect(normalizeTo24Hour('11:30 AM')).toBe('11:30');
      expect(normalizeTo24Hour('01:00 PM')).toBe('13:00');
      expect(normalizeTo24Hour('01:00 AM')).toBe('01:00');
      expect(normalizeTo24Hour('12:00 PM')).toBe('12:00');
      expect(normalizeTo24Hour('12:00 AM')).toBe('00:00');
    });

    it('should handle already-24-hour time strings', () => {
      expect(normalizeTo24Hour('13:00')).toBe('13:00');
      expect(normalizeTo24Hour('14:30')).toBe('14:30');
      expect(normalizeTo24Hour('16:00')).toBe('16:00');
    });

    it('should handle empty or undefined strings gracefully', () => {
      expect(normalizeTo24Hour('')).toBe('');
      expect(normalizeTo24Hour(undefined)).toBe('');
    });
  });

  describe('splitTo12Hour', () => {
    it('should split 24-hour afternoon times into 12-hour PM', () => {
      const result = splitTo12Hour('13:00');
      expect(result).toEqual({ time: '01:00', period: 'PM' });
    });

    it('should split legacy 01:00 into 12-hour PM', () => {
      const result = splitTo12Hour('01:00');
      expect(result).toEqual({ time: '01:00', period: 'PM' });
    });

    it('should split morning times into 12-hour AM', () => {
      expect(splitTo12Hour('08:30')).toEqual({ time: '08:30', period: 'AM' });
      expect(splitTo12Hour('11:30')).toEqual({ time: '11:30', period: 'AM' });
    });

    it('should split 12:00 noon into 12-hour PM', () => {
      expect(splitTo12Hour('12:00')).toEqual({ time: '12:00', period: 'PM' });
    });
  });

  describe('combineTo24Hour', () => {
    it('should combine 12h PM times into 24h', () => {
      expect(combineTo24Hour('01:00', 'PM')).toBe('13:00');
      expect(combineTo24Hour('02:30', 'PM')).toBe('14:30');
      expect(combineTo24Hour('05:30', 'PM')).toBe('17:30');
      expect(combineTo24Hour('12:00', 'PM')).toBe('12:00');
    });

    it('should combine 12h AM times into 24h', () => {
      expect(combineTo24Hour('08:30', 'AM')).toBe('08:30');
      expect(combineTo24Hour('11:30', 'AM')).toBe('11:30');
      expect(combineTo24Hour('01:00', 'AM')).toBe('01:00');
      expect(combineTo24Hour('12:00', 'AM')).toBe('00:00');
    });
  });

  describe('areSlotsMatching', () => {
    it('should match legacy 01:00 with 13:00', () => {
      expect(areSlotsMatching('01:00', '13:00')).toBe(true);
      expect(areSlotsMatching('13:00', '01:00')).toBe(true);
    });

    it('should match identical times', () => {
      expect(areSlotsMatching('08:30', '08:30')).toBe(true);
      expect(areSlotsMatching('11:30', '11:30')).toBe(true);
    });

    it('should not match different times', () => {
      expect(areSlotsMatching('08:30', '10:00')).toBe(false);
      expect(areSlotsMatching('11:30', '13:00')).toBe(false);
    });
  });

  describe('formatTimeRange', () => {
    it('should format time ranges with AM/PM when includePeriod is true', () => {
      expect(formatTimeRange('11:30', '13:00', true)).toBe('11:30 AM – 01:00 PM');
      expect(formatTimeRange('11:30', '01:00', true)).toBe('11:30 AM – 01:00 PM');
      expect(formatTimeRange('13:00', '14:30', true)).toBe('01:00 PM – 02:30 PM');
      expect(formatTimeRange('08:30', '10:00', true)).toBe('08:30 AM – 10:00 AM');
    });

    it('should format time ranges cleanly without AM/PM for compact canvas headers', () => {
      expect(formatTimeRange('11:30', '13:00', false)).toBe('11:30 – 01:00');
      expect(formatTimeRange('13:00', '14:30', false)).toBe('01:00 – 02:30');
    });
  });

  describe('getCellRoutines', () => {
    const mockRoutines: Routine[] = [
      {
        id: 1,
        course_id: 101,
        c_id: 'CS-334',
        day_of_week: 'Monday',
        start_time: '01:00', // legacy database format
        end_time: '02:30',
        room_number: '712',
        section: 'A'
      }
    ];

    it('should find routine when slot is configured in 24h format', () => {
      const slot24: Slot = { start: '13:00', end: '14:30' };
      const matched = getCellRoutines(mockRoutines, slot24, 'Monday');
      expect(matched).toHaveLength(1);
      expect(matched[0].c_id).toBe('CS-334');
    });

    it('should find routine when slot is configured in 12h format', () => {
      const slot12: Slot = { start: '01:00', end: '02:30' };
      const matched = getCellRoutines(mockRoutines, slot12, 'Monday');
      expect(matched).toHaveLength(1);
      expect(matched[0].c_id).toBe('CS-334');
    });
  });

  describe('getSortedSlots', () => {
    it('should sort slots in chronological order even if 01:00 is used', () => {
      const slots: Slot[] = [
        { start: '11:30', end: '13:00' },
        { start: '08:30', end: '10:00' },
        { start: '01:00', end: '02:30' },
        { start: '10:00', end: '11:30' }
      ];
      const sorted = getSortedSlots([], slots);
      expect(sorted.map(s => s.start)).toEqual(['08:30', '10:00', '11:30', '13:00']);
    });
  });
});
