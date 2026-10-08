import { useState, useEffect, useCallback } from 'react';
import { examRoutinesAPI, coursesAPI } from '../../services/api';
import ExamCanvaEditor from './ExamCanvaEditor';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

interface ExamRoutine {
  id: number;
  course_id: number;
  c_id: string;
  course_name: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section: string;
  instructions: string;
}

const ExamRoutineManager = () => {
  const [routines, setRoutines] = useState<ExamRoutine[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [routinesData, coursesData] = await Promise.all([
        examRoutinesAPI.list(),
        coursesAPI.list()
      ]);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (e) {
      console.error('Failed to load routine data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && routines.length === 0 && courses.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center text-ink-mute text-sm border border-hairline shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        Loading Canva Routine Designer...
      </div>
    );
  }

  return (
    <div className="w-full -my-3 sm:-my-6 lg:-my-8 h-[calc(100vh-130px)] md:h-[calc(100vh-110px)] lg:h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <ExamCanvaEditor 
        routines={routines} 
        courses={courses} 
        onClose={() => {}} 
        onRefresh={fetchData} 
      />
    </div>
  );
};

export default ExamRoutineManager;
