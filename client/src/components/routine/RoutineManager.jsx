import React, { useState, useEffect } from 'react';
import { routinesAPI, coursesAPI } from '../../services/api';
import { Plus, Trash2, Calendar, X, AlertCircle, Edit2, ChevronDown, Clock, Download } from 'lucide-react';
import { TimePicker } from '../ui/time-picker';
import { toPng } from 'html-to-image';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const RoutineManager = () => {
  const [routines, setRoutines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [section, setSection] = useState('');
  const [err, setErr] = useState('');
  const [editId, setEditId] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Routine Grid Headers
  const [semesterTitle, setSemesterTitle] = useState('Summer – 2026 (v3)');
  const [sectionGroup, setSectionGroup] = useState('CS – A & H');
  const [batchCode, setBatchCode] = useState('SWE 41');
  const [effectiveDate, setEffectiveDate] = useState('Effective from 6, June 2026');

  const STANDARD_SLOTS_24 = [
    { start: '08:30', end: '10:00' },
    { start: '10:00', end: '11:30' },
    { start: '11:30', end: '13:00' },
    { start: '13:00', end: '14:30' },
    { start: '14:30', end: '16:00' },
    { start: '16:00', end: '17:30' }
  ];

  const formatTimeRange = (start24, end24) => {
    const to12h = (timeStr) => {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const formattedHour = hour % 12 || 12;
      return `${String(formattedHour).padStart(2, '0')}:${m}`;
    };
    return `${to12h(start24)} – ${to12h(end24)}`;
  };

  const getSortedSlots = () => {
    const slotsMap = new Map();
    STANDARD_SLOTS_24.forEach(s => {
      slotsMap.set(s.start, s.end);
    });
    routines.forEach(r => {
      const start = r.start_time.substring(0, 5);
      const end = r.end_time.substring(0, 5);
      slotsMap.set(start, end);
    });
    const sortedStarts = Array.from(slotsMap.keys()).sort((a, b) => a.localeCompare(b));
    return sortedStarts.map(start => ({
      start,
      end: slotsMap.get(start)
    }));
  };

  const getActiveDays = () => {
    const baseDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Thursday'];
    const hasWednesday = routines.some(r => r.day_of_week.toLowerCase() === 'wednesday');
    const hasFriday = routines.some(r => r.day_of_week.toLowerCase() === 'friday');
    const activeDays = [];
    if (routines.some(r => r.day_of_week.toLowerCase() === 'saturday') || baseDays.includes('Saturday')) activeDays.push('Saturday');
    if (routines.some(r => r.day_of_week.toLowerCase() === 'sunday') || baseDays.includes('Sunday')) activeDays.push('Sunday');
    if (routines.some(r => r.day_of_week.toLowerCase() === 'monday') || baseDays.includes('Monday')) activeDays.push('Monday');
    if (routines.some(r => r.day_of_week.toLowerCase() === 'tuesday') || baseDays.includes('Tuesday')) activeDays.push('Tuesday');
    if (hasWednesday) activeDays.push('Wednesday');
    if (routines.some(r => r.day_of_week.toLowerCase() === 'thursday') || baseDays.includes('Thursday')) activeDays.push('Thursday');
    if (hasFriday) activeDays.push('Friday');
    return activeDays;
  };

  const getCellRoutines = (slot, day) => {
    return routines.filter(r => {
      const rStart = r.start_time.substring(0, 5);
      const rEnd = r.end_time.substring(0, 5);
      return rStart === slot.start && 
             rEnd === slot.end && 
             r.day_of_week.toLowerCase() === day.toLowerCase();
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routinesData, coursesData] = await Promise.all([
        routinesAPI.list(),
        coursesAPI.list()
      ]);
      setRoutines(routinesData);
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        setCourseId(coursesData[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    if (courses.length > 0) {
      setCourseId(courses[0].id.toString());
    } else {
      setCourseId('');
    }
    setDayOfWeek('Monday');
    setStartTime('');
    setEndTime('');
    setRoomNumber('');
    setSection('');
    setEditId(null);
    setShowForm(false);
    setErr('');
  };

  const handleEdit = (routine) => {
    setEditId(routine.id);
    setCourseId(routine.course_id.toString());
    setDayOfWeek(routine.day_of_week);
    setStartTime(routine.start_time.substring(0, 5));
    setEndTime(routine.end_time.substring(0, 5));
    setRoomNumber(routine.room_number);
    setSection(routine.section || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this routine entry?')) {
      return;
    }
    try {
      await routinesAPI.delete(id);
      fetchData();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId || !dayOfWeek || !startTime || !endTime || !roomNumber || !section) {
      setErr('Please fill in all fields');
      return;
    }

    setErr('');
    try {
      const payload = {
        course_id: parseInt(courseId),
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room_number: roomNumber,
        section: section
      };

      if (editId) {
        await routinesAPI.update(editId, payload);
      } else {
        await routinesAPI.create(payload);
      }
      resetForm();
      fetchData();
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to save routine entry.');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, routine) => {
    e.dataTransfer.setData('text/plain', routine.id.toString());
  };

  const handleDragOver = (e, day, slot) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, day, slot) => {
    e.preventDefault();
    setDragOverCell(`${day}-${slot.start}`);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverCell(null);
  };

  const handleDrop = async (e, day, slot) => {
    e.preventDefault();
    setDragOverCell(null);
    const routineIdStr = e.dataTransfer.getData('text/plain');
    if (!routineIdStr) return;
    const routineId = parseInt(routineIdStr);

    const draggedRoutine = routines.find(r => r.id === routineId);
    if (!draggedRoutine) return;

    const currentStart = draggedRoutine.start_time.substring(0, 5);
    if (draggedRoutine.day_of_week.toLowerCase() === day.toLowerCase() && currentStart === slot.start) {
      return;
    }

    try {
      await routinesAPI.update(routineId, {
        course_id: draggedRoutine.course_id,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        room_number: draggedRoutine.room_number,
        section: draggedRoutine.section || ''
      });
      fetchData();
    } catch (err) {
      alert('Failed to move class: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDownloadImage = () => {
    const node = document.getElementById('routine-table-container');
    if (!node) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    toPng(node, {
      filter: (el) => {
        return !el.classList?.contains('no-export');
      },
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      style: {
        borderRadius: '0px',
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const fileName = `routine-${semesterTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'schedule'}.png`;
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        alert('Failed to export routine as image. Please try again.');
      });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Routine & Schedules</h1>
          <p className="text-sm text-ink-mute mt-1.5">Map regular class times and room numbers to courses.</p>
        </div>
        {!showForm && courses.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors duration-150 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class Time
          </button>
        )}
      </div>

      {courses.length === 0 && !loading && (
        <div className="bg-accent-yellow/10 border border-accent-yellow/20 text-ink p-4 rounded-sm flex items-center text-sm">
          <AlertCircle className="w-5 h-5 mr-3 text-ink-secondary" />
          You need to register at least one course in the 'Courses' directory before configuring routine schedules.
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink text-sans">
              {editId ? 'Edit Class Schedule Entry' : 'Add Class Schedule Entry'}
            </h3>
            <button onClick={resetForm} className="text-ink-mute hover:text-ink cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {err && (
            <div className="bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Select Course *
              </label>
              <div className="custom-select-wrapper">
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-ink hover:border-hairline-strong transition-all duration-150"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_id} - {c.teacher_initials}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Day of Week *
              </label>
              <div className="custom-select-wrapper">
                <select
                  required
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-ink hover:border-hairline-strong transition-all duration-150"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Start Time *
              </label>
              <TimePicker
                value={startTime}
                onChange={(val) => setStartTime(val)}
                placeholder="Start Time"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                End Time *
              </label>
              <TimePicker
                value={endTime}
                onChange={(val) => setEndTime(val)}
                placeholder="End Time"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Room Number *
              </label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="Room 402"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                Section *
              </label>
              <input
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. H"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150"
              />
            </div>

            <div className="md:col-span-6 flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors cursor-pointer"
              >
                {editId ? 'Save Changes' : 'Save Class Time'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routine list as a visual calendar grid */}
      {loading ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading schedules...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 no-export">
            <button
              onClick={handleDownloadImage}
              className="flex items-center justify-center px-4.5 py-2 text-xs font-semibold text-ink border border-hairline rounded-sm hover:bg-canvas-soft transition-all duration-150 cursor-pointer shadow-sm bg-canvas"
            >
              <Download className="w-3.5 h-3.5 mr-2 text-primary" /> Download Routine (PNG)
            </button>
          </div>
          
          <div id="routine-table-container" className="bg-canvas border border-hairline rounded-lg shadow-sm p-6 space-y-6 overflow-hidden">
            {/* Printable/Display Routine Header */}
            <div className="text-center space-y-1 pb-5 border-b border-hairline-cool">
              <input
                type="text"
                value={semesterTitle}
                onChange={(e) => setSemesterTitle(e.target.value)}
                className="text-center font-bold text-2xl text-ink bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-full max-w-lg font-sans"
                placeholder="Semester Title (e.g. Summer – 2026 (v3))"
              />
              <div className="flex justify-center gap-2">
                <input
                  type="text"
                  value={sectionGroup}
                  onChange={(e) => setSectionGroup(e.target.value)}
                  className="text-center font-medium text-lg text-ink-secondary bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-48"
                  placeholder="Sections (e.g. CS – A & H)"
                />
              </div>
              <input
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                className="text-center text-sm text-ink-mute bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-48 block mx-auto font-semibold"
                placeholder="Batch Code (e.g. SWE 41)"
              />
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="text-center text-xs text-ink-mute bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-64 block mx-auto italic"
                placeholder="Effective Date (e.g. Effective from 6, June 2026)"
              />
            </div>

            {/* Calendar Grid Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-hairline">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="border border-hairline py-3 px-4 text-xs font-semibold text-center w-36 bg-primary text-on-primary font-sans uppercase">
                      ↓Time / Day →
                    </th>
                    {getActiveDays().map(day => (
                      <th key={day} className="border border-hairline py-3 px-4 text-sm font-semibold text-center font-sans bg-primary text-on-primary">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getSortedSlots().map((slot, sIdx) => (
                    <tr key={sIdx} className="h-28">
                      {/* Row Header (Time Slot) */}
                      <td className="border border-hairline bg-canvas-soft py-2 px-3 text-center text-xs font-bold text-ink-secondary w-36 font-mono">
                        {formatTimeRange(slot.start, slot.end)}
                      </td>
                      
                      {/* Day Cells */}
                      {getActiveDays().map((day, dIdx) => {
                        const cellRoutines = getCellRoutines(slot, day);
                        const isEmpty = cellRoutines.length === 0;
                        const isDraggedOver = dragOverCell === `${day}-${slot.start}`;
                        
                        return (
                          <td 
                            key={dIdx} 
                            onDragOver={(e) => handleDragOver(e, day, slot)}
                            onDragEnter={(e) => handleDragEnter(e, day, slot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, slot)}
                            className={`border border-hairline p-2 text-center text-xs align-middle transition-colors relative group min-w-[120px] ${
                              isEmpty ? 'bg-canvas' : 'bg-canvas-soft'
                            } ${
                              isDraggedOver ? 'bg-primary/20 border-dashed border-2 border-primary' : ''
                            }`}
                          >
                            {!isEmpty ? (
                              <div className="space-y-2">
                                {cellRoutines.map((r) => {
                                  // Find course code and teacher details
                                  const matchedCourse = courses.find(c => c.course_id === r.c_id);
                                  const initials = matchedCourse ? matchedCourse.teacher_initials : '';
                                  
                                  return (
                                    <div 
                                      key={r.id} 
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, r)}
                                      className="bg-canvas border border-hairline p-2 rounded shadow-sm relative pr-12 hover:bg-canvas-soft transition-colors cursor-grab active:cursor-grabbing text-left"
                                    >
                                      <div className="font-bold text-ink text-sm leading-tight">
                                        {r.c_id}{r.section ? ` ${r.section}` : ''} {initials ? `(${initials})` : ''}
                                      </div>
                                      <div className="text-xs text-ink-mute mt-1 font-medium">
                                        {r.room_number}
                                      </div>
                                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 no-export">
                                        <button
                                          onClick={() => handleEdit(r)}
                                          className="text-ink-mute hover:text-primary hover:bg-hairline-cool p-0.5 rounded cursor-pointer"
                                          title="Edit Entry"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(r.id)}
                                          className="text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 p-0.5 rounded cursor-pointer"
                                          title="Delete Entry"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineManager;
