import { useState, useEffect, useCallback } from 'react';
import { routinesAPI, coursesAPI } from '../../services/api';
import { STANDARD_SLOTS_24 } from './routineUtils';
import ClassCanvaEditor from './ClassCanvaEditor';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
  teacher_name: string;
  teacher_initials: string;
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

interface Slot {
  start: string;
  end: string;
}

const RoutineManager = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Class routine header fields
  const [semesterTitle, setSemesterTitle] = useState('Summer – 2026 (v4)');
  const [sectionGroup, setSectionGroup] = useState('CS – A & H');
  const [batchCode, setBatchCode] = useState('SWE 41');
  const [effectiveDate, setEffectiveDate] = useState('Effective from 13, June 2026');

  // Load configured grid days and time slots
  const [customDays, setCustomDays] = useState<string[]>(() => {
    const saved = localStorage.getItem('routine_custom_days');
    return saved ? JSON.parse(saved) : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Thursday'];
  });

  const [customSlots, setCustomSlots] = useState<Slot[]>(() => {
    const saved = localStorage.getItem('routine_custom_slots');
    return saved ? JSON.parse(saved) : STANDARD_SLOTS_24;
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [routinesData, coursesData, settingsData] = await Promise.all([
        routinesAPI.list(),
        coursesAPI.list(),
        routinesAPI.getSettings().catch(() => null)
      ]);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      if (settingsData) {
        if (settingsData.semesterTitle) setSemesterTitle(settingsData.semesterTitle);
        if (settingsData.sectionGroup) setSectionGroup(settingsData.sectionGroup);
        if (settingsData.batchCode) setBatchCode(settingsData.batchCode);
        if (settingsData.effectiveDate) setEffectiveDate(settingsData.effectiveDate);
        if (Array.isArray(settingsData.customDays) && settingsData.customDays.length > 0) {
          setCustomDays(settingsData.customDays);
          localStorage.setItem('routine_custom_days', JSON.stringify(settingsData.customDays));
        }
        if (Array.isArray(settingsData.customSlots) && settingsData.customSlots.length > 0) {
          setCustomSlots(settingsData.customSlots);
          localStorage.setItem('routine_custom_slots', JSON.stringify(settingsData.customSlots));
        }
      }
    } catch (e) {
      console.error('Failed to fetch class routines:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveLayout = async (days: string[], slots: Slot[]) => {
    setCustomDays(days);
    setCustomSlots(slots);
    localStorage.setItem('routine_custom_days', JSON.stringify(days));
    localStorage.setItem('routine_custom_slots', JSON.stringify(slots));
    try {
      await routinesAPI.saveSettings({
        semesterTitle,
        sectionGroup,
        batchCode,
        effectiveDate,
        customDays: days,
        customSlots: slots
      });
    } catch (e) {
      console.error('Failed to persist layout to DB', e);
    }
  };

  if (loading && routines.length === 0 && courses.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center text-ink-mute text-sm border border-hairline shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        Loading Class Routine Designer...
      </div>
    );
  }

  return (
    <div className="w-full -my-2 sm:-my-4 min-h-[calc(100vh-120px)] lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden">
      <ClassCanvaEditor 
        routines={routines}
        courses={courses}
        customDays={customDays}
        customSlots={customSlots}
        semesterTitle={semesterTitle}
        sectionGroup={sectionGroup}
        batchCode={batchCode}
        effectiveDate={effectiveDate}
        setSemesterTitle={setSemesterTitle}
        setSectionGroup={setSectionGroup}
        setBatchCode={setBatchCode}
        setEffectiveDate={setEffectiveDate}
        onRefresh={fetchData}
        onSaveLayout={handleSaveLayout}
        onClose={() => {}}
      />
    </div>
  );
};

export default RoutineManager;
