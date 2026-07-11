import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { routinesAPI, coursesAPI, filesAPI } from '../../services/api';
import { Plus, Trash2, Calendar, X, AlertCircle, Edit2, ChevronDown, Download } from 'lucide-react';
import { TimePicker } from '../ui/time-picker';
import { toCanvas } from 'html-to-image';
import { DAYS_OF_WEEK, formatTimeRange, getSortedSlots, getActiveDays, getCellRoutines } from './routineUtils';
import CancelRescheduleModal from './CancelRescheduleModal';

const RoutineManager = () => {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharingRoutine, setSharingRoutine] = useState(false);

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
  const [announceTarget, setAnnounceTarget] = useState(null);

  const [semesterTitle, setSemesterTitle] = useState('Summer – 2026 (v3)');
  const [sectionGroup, setSectionGroup] = useState('CS – A & H');
  const [batchCode, setBatchCode] = useState('SWE 41');
  const [effectiveDate, setEffectiveDate] = useState('Effective from 6, June 2026');

  const sortedSlots = getSortedSlots(routines);
  const activeDays = getActiveDays(routines);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [routinesData, coursesData] = await Promise.all([
        routinesAPI.list(),
        coursesAPI.list()
      ]);
      setRoutines(routinesData);
      setCourses(coursesData);
      if (coursesData.length > 0 && !courseId) {
        setCourseId(coursesData[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    if (courses.length > 0) setCourseId(courses[0].id.toString());
    else setCourseId('');
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
    if (!window.confirm('Are you sure you want to delete this routine entry?')) return;
    try {
      setRoutines(prev => prev.filter(r => r.id !== id));
      await routinesAPI.delete(id);
      fetchData(true);
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
      fetchData();
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
      if (editId) await routinesAPI.update(editId, payload);
      else await routinesAPI.create(payload);
      resetForm();
      fetchData();
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to save routine entry.');
    }
  };

  const handleDragStart = (e, routine) => {
    e.dataTransfer.setData('text/plain', routine.id.toString());
  };

  const handleDragOver = (e) => e.preventDefault();

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
    if (draggedRoutine.day_of_week.toLowerCase() === day.toLowerCase() && currentStart === slot.start) return;
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

  const captureRoutineCanvas = async () => {
    const node = document.getElementById('routine-table-container');
    if (!node) return null;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const origOverflow = node.style.overflow;
    node.style.overflow = 'visible';
    try {
      const canvas = await toCanvas(node, {
        filter: (el) => !el.classList?.contains('no-export'),
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        style: { borderRadius: '0px' },
      });
      return { canvas, node, origOverflow };
    } catch (err) {
      node.style.overflow = origOverflow;
      throw err;
    }
  };

  const handleDownloadImage = async () => {
    const result = await captureRoutineCanvas();
    if (!result) return;
    const { canvas, node, origOverflow } = result;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas toBlob failed');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `routine-${semesterTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'schedule'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Failed to export routine as image. Please try again.');
    } finally {
      node.style.overflow = origOverflow;
    }
  };

  const handleShareToNotice = async () => {
    const result = await captureRoutineCanvas();
    if (!result) return;
    const { canvas, node, origOverflow } = result;
    setSharingRoutine(true);
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas toBlob failed');
      const fileName = `routine-${semesterTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'schedule'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const uploadedFileRecord = await filesAPI.upload(file);
      navigate('/announcement/new', {
        state: {
          preFillTitle: `Updated Class Routine - ${semesterTitle}`,
          preFillBody: `📢 *Updated Class Routine Notice*\n\nClass routine for *${semesterTitle}* (${sectionGroup}) Swe ${batchCode} has been updated. Please check the attached routine schedule image for details.\n\n_Effective from: ${effectiveDate}_\n\nAdjust your plans accordingly. Thank you! 📅`,
          preFillCategory: 'notice',
          preAttachedFiles: [uploadedFileRecord]
        }
      });
    } catch (err) {
      console.error('Failed to share routine notice:', err);
      alert('Failed to generate or upload routine image. ' + (err.response?.data?.error || err.message));
    } finally {
      node.style.overflow = origOverflow;
      setSharingRoutine(false);
    }
  };

  const handleAnnounceAction = (action, state) => {
    if (action !== 'dismiss') {
      navigate('/announcement/new', { state });
    }
    setAnnounceTarget(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Routine & Schedules</h1>
          <p className="text-sm text-ink-mute mt-1.5">Map regular class times and room numbers to courses.</p>
        </div>
        {!showForm && courses.length > 0 && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors duration-150 cursor-pointer shadow-sm self-start sm:self-auto">
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

      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink text-sans">
              {editId ? 'Edit Class Schedule Entry' : 'Add Class Schedule Entry'}
            </h3>
            <button onClick={resetForm} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {err && (
            <div className="bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {err}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Select Course *</label>
              <div className="custom-select-wrapper">
                <select required value={courseId} onChange={(e) => setCourseId(e.target.value)}
                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-ink hover:border-hairline-strong transition-all duration-150">
                  {courses.map((c) => (<option key={c.id} value={c.id}>{c.course_id} - {c.teacher_initials}</option>))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Day of Week *</label>
              <div className="custom-select-wrapper">
                <select required value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}
                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-ink hover:border-hairline-strong transition-all duration-150">
                  {DAYS_OF_WEEK.map((day) => (<option key={day} value={day}>{day}</option>))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Start Time *</label>
              <TimePicker value={startTime} onChange={(val) => setStartTime(val)} placeholder="Start Time" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">End Time *</label>
              <TimePicker value={endTime} onChange={(val) => setEndTime(val)} placeholder="End Time" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Room Number *</label>
              <input type="text" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Room 402"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Section *</label>
              <input type="text" required value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. H"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150" />
            </div>
            <div className="md:col-span-6 flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors cursor-pointer">{editId ? 'Save Changes' : 'Save Class Time'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading schedules...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 no-export">
            <button disabled={sharingRoutine} onClick={handleShareToNotice}
              className="flex items-center justify-center px-4.5 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50 border-none">
              {sharingRoutine ? (<><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-on-primary mr-2"></div>Sharing Routine...</>) : (<><Calendar className="w-3.5 h-3.5 mr-2" /> Share to Notice</>)}
            </button>
            <button onClick={handleDownloadImage}
              className="flex items-center justify-center px-4.5 py-2 text-xs font-semibold text-ink border border-hairline rounded-sm hover:bg-canvas-soft transition-all duration-150 cursor-pointer shadow-sm bg-canvas">
              <Download className="w-3.5 h-3.5 mr-2 text-primary" /> Download Routine (PNG)
            </button>
          </div>

          <div id="routine-table-container" className="bg-canvas border border-hairline rounded-lg shadow-sm p-6 space-y-6 overflow-hidden">
            <div className="text-center space-y-1 pb-5 border-b border-hairline-cool">
              <input type="text" value={semesterTitle} onChange={(e) => setSemesterTitle(e.target.value)}
                className="text-center font-bold text-2xl text-ink bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-full max-w-lg font-sans" placeholder="Semester Title" />
              <div className="flex justify-center gap-2">
                <input type="text" value={sectionGroup} onChange={(e) => setSectionGroup(e.target.value)}
                  className="text-center font-medium text-lg text-ink-secondary bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-48" placeholder="Sections" />
              </div>
              <input type="text" value={batchCode} onChange={(e) => setBatchCode(e.target.value)}
                className="text-center text-sm text-ink-mute bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-48 block mx-auto font-semibold" placeholder="Batch Code" />
              <input type="text" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                className="text-center text-xs text-ink-mute bg-transparent border-b border-transparent hover:border-hairline focus:border-primary focus:outline-none w-64 block mx-auto italic" placeholder="Effective Date" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-hairline">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="border border-hairline py-3 px-4 text-xs font-semibold text-center w-36 bg-primary text-on-primary font-sans uppercase">↓Time / Day →</th>
                    {activeDays.map(day => (
                      <th key={day} className="border border-hairline py-3 px-4 text-sm font-semibold text-center font-sans bg-primary text-on-primary">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedSlots.map((slot, sIdx) => (
                    <tr key={sIdx} className="h-28">
                      <td className="border border-hairline bg-canvas-soft py-2 px-3 text-center text-xs font-bold text-ink-secondary w-36 font-mono">{formatTimeRange(slot.start, slot.end)}</td>
                      {activeDays.map((day, dIdx) => {
                        const cellRoutines = getCellRoutines(routines, slot, day);
                        const isEmpty = cellRoutines.length === 0;
                        const isDraggedOver = dragOverCell === `${day}-${slot.start}`;
                        return (
                          <td key={dIdx}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, day, slot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, slot)}
                            className={`border border-hairline p-2 text-center text-xs align-middle transition-colors relative group min-w-[120px] ${isEmpty ? 'bg-canvas' : 'bg-canvas-soft'} ${isDraggedOver ? 'bg-primary/20 border-dashed border-2 border-primary' : ''}`}>
                            {!isEmpty ? (
                              <div className="space-y-2">
                                {cellRoutines.map((r) => {
                                  const matchedCourse = courses.find(c => c.course_id === r.c_id);
                                  const initials = matchedCourse ? matchedCourse.teacher_initials : '';
                                  return (
                                    <div key={r.id} draggable={true}
                                      onDragStart={(e) => handleDragStart(e, r)}
                                      className="bg-canvas border border-hairline p-2 rounded shadow-sm relative pr-12 hover:bg-canvas-soft transition-colors cursor-grab active:cursor-grabbing text-left">
                                      <div className="font-bold text-ink text-sm leading-tight">{r.c_id}{r.section ? ` ${r.section}` : ''} {initials ? `(${initials})` : ''}</div>
                                      <div className="text-xs text-ink-mute mt-1 font-medium">{r.room_number}</div>
                                      <div className="absolute top-1 right-1 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150 no-export">
                                        <button onClick={() => setAnnounceTarget({ routine: r, slot, matchedCourse })}
                                          className="text-ink-mute hover:text-accent-yellow hover:bg-accent-yellow/10 p-0.5 rounded cursor-pointer" title="Announce Cancel/Reschedule">
                                          <AlertCircle className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleEdit(r)}
                                          className="text-ink-mute hover:text-primary hover:bg-hairline-cool p-0.5 rounded cursor-pointer" title="Edit Entry">
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(r.id)}
                                          className="text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 p-0.5 rounded cursor-pointer" title="Delete Entry">
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

      <CancelRescheduleModal
        announceTarget={announceTarget}
        onClose={handleAnnounceAction}
      />
    </div>
  );
};

export default RoutineManager;
