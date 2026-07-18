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

  if (loading) {
    return (
      <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        Loading Canva Routine Designer...
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 lg:-mx-8 h-[calc(100vh-64px)] md:h-[calc(100vh-0px)] overflow-hidden">
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
