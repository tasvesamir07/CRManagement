import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesAPI, platformsAPI, filesAPI, announcementsAPI, templatesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DatePicker } from '../ui/date-picker';
import { TimePicker } from '../ui/time-picker';
import {
  BookOpen,
  Clock,
  Paperclip,
  Check,
  Send,
  UploadCloud,
  X,
  Smartphone,
  Plus,
  ListPlus,
  StickyNote,
  Save,
  Clock as ClockIcon,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa6';

import MessageBuilder from './MessageBuilder';
import PlatformSelector from './PlatformSelector';
import SchedulePicker from './SchedulePicker';
import FileUploader from './FileUploader';

const PRESET_DEFS = {
  'Quiz - 1': { category: 'quiz', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: 'Quiz Topics:' },
  'Quiz - 2': { category: 'quiz', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: 'Quiz Topics:' },
  'Quiz - 3': { category: 'quiz', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: 'Quiz Topics:' },
  'Quiz - 4': { category: 'quiz', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: 'Quiz Topics:' },
  'Makeup quiz': { category: 'makeup_quiz', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: 'Quiz Topics:' },
  'Lab Final': { category: 'exam', closing: 'Be prepared accordingly.', topicLabel: 'Exam Topics:' },
  'Mid Term Syllabus': { category: 'syllabus', closing: 'Please follow the syllabus for your preparation. Good luck! 📚', topicLabel: 'Syllabus Details:' },
  'Final Term Syllabus': { category: 'syllabus', closing: 'Please follow the syllabus for your preparation. Good luck! 📚', topicLabel: 'Syllabus Details:' },
  'Mid Term Suggestion': { category: 'suggestion', closing: 'Please prepare according to the suggestions. Good luck! 💡', topicLabel: 'Suggestions:' },
  'Final Term Suggestion': { category: 'suggestion', closing: 'Please prepare according to the suggestions. Good luck! 💡', topicLabel: 'Suggestions:' },
  'Presentation': { category: 'presentation', closing: 'Every team must submit slides. Good luck!', topicLabel: 'Presentation Topics:' },
  'Assignment': { category: 'assignment', closing: 'Add a cover page at the beginning before submission.', topicLabel: '' },
  'Lab Report': { category: 'lab_report', closing: 'Add a cover page at the beginning before submission.', topicLabel: '' },
  'Lab Assignment': { category: 'assignment', closing: 'Submit within the deadline.', topicLabel: '' },
  'Lab Performance Notice': { category: 'lab_performance', closing: 'Keep up the good work!', topicLabel: '' },
  'Class Reminder': { category: 'notice', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: '' },
  'Routine Change': { category: 'notice', closing: 'Please adjust your schedule accordingly.', topicLabel: '' },
  'Class Cancelled': { category: 'class_cancel', closing: '', topicLabel: '' },
  'General Notice': { category: 'notice', closing: 'Please be prepared and attend on time. Good luck! 🍀📖', topicLabel: '' }
};

const TITLE_PRESETS = Object.entries(PRESET_DEFS).map(([value, def]) => {
  const emojis = {
    quiz: '📝', makeup_quiz: '🔄', exam: '🎯', syllabus: '📚',
    suggestion: '💡', presentation: '📢', assignment: '📁',
    lab_report: '📊', lab_performance: '💪', class_cancel: '❌', notice: '📣'
  };
  return { value, label: `${emojis[def.category] || '📢'} ${value}` };
});
TITLE_PRESETS.push({ value: 'Custom', label: '✏️ Custom (Type below)...' });

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const fileInputRef = useRef(null);
  const isEditMode = !!editId;

  const [courses, setCourses] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const getInitialValue = (key, defaultValue) => {
    try {
      const draftStr = sessionStorage.getItem('announcement_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft[key] !== undefined) return draft[key];
      }
    } catch (e) { console.error('Failed to parse draft', e); }
    return defaultValue;
  };

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [broadcastMode, setBroadcastMode] = useState(() => getInitialValue('broadcastMode', 'notice'));
  const [titlePreset, setTitlePreset] = useState(() => getInitialValue('titlePreset', 'Quiz - 1'));
  const [title, setTitle] = useState(() => getInitialValue('title', 'Quiz - 1'));
  const [category, setCategory] = useState(() => getInitialValue('category', 'quiz'));
  const [selectedCourseId, setSelectedCourseId] = useState(() => getInitialValue('selectedCourseId', ''));
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getInitialValue('selectedDate', ''));

  const [sections, setSections] = useState(() => getInitialValue('sections', [
    { name: '', startTime: '', endTime: '', room: '', mode: 'Offline' }
  ]));

  const [topics, setTopics] = useState(() => getInitialValue('topics', []));
  const [currentTopic, setCurrentTopic] = useState('');
  const [notes, setNotes] = useState(() => getInitialValue('notes', []));
  const [currentNote, setCurrentNote] = useState('');
  const [closingText, setClosingText] = useState(() => getInitialValue('closingText', 'Please be prepared and attend on time. Good luck! 🍀📖'));

  const [selectedPlatforms, setSelectedPlatforms] = useState(() => getInitialValue('selectedPlatforms', []));
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [uploadedFiles, setUploadedFiles] = useState(() => getInitialValue('uploadedFiles', []));
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ usedBytes: 0, limitBytes: 104857600, percentage: 0 });

  const [submitting, setSubmitting] = useState(false);
  const [announcementId, setAnnouncementId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [previewTab, setPreviewTab] = useState('whatsapp');
  const [makeupStatus, setMakeupStatus] = useState(() => getInitialValue('makeupStatus', 'later'));
  const [customMakeupText, setCustomMakeupText] = useState(() => getInitialValue('customMakeupText', ''));

  const showTopics = category !== 'class_cancel' && category !== 'notice' && !!selectedCourseId;
  const isDateRestored = useRef(false);
  const isSectionsRestored = useRef(false);

  const compiledMessage = (() => {
    if (broadcastMode === 'share_file') return '';
    const course = courses.find(c => c.id === parseInt(selectedCourseId));
    let msg = title.trim() ? `📢 *${title}*\n\n` : '📢 *Title*\n\n';

    if (category === 'class_cancel') {
      if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;
      const eventDate = selectedDate ? new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]) : new Date();
      const day = String(eventDate.getDate()).padStart(2, '0');
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const year = String(eventDate.getFullYear()).substring(2);
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
      msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n\n❌ *Status:* Class Cancelled\n\n`;
      if (makeupStatus === 'later') msg += '📝 *Note:* Make-up class time will be shared later.\n';
      else if (makeupStatus === 'rescheduled' || makeupStatus === 'online') {
        msg += `📝 *Note:* ${makeupStatus === 'online' ? 'Class will be held Online' : 'Rescheduled to new slot'}:\n`;
        sections.forEach(sec => {
          if (sec.name) msg += ` · Section ${sec.name}:\n`;
          if (sec.startTime && sec.endTime) {
            const [h1, m1] = sec.startTime.split(':');
            const [h2, m2] = sec.endTime.split(':');
            msg += `   ⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
          } else if (sec.startTime) {
            const [h, m] = sec.startTime.split(':');
            msg += `   ⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`;
          }
          if (makeupStatus === 'online' || sec.mode === 'Online') msg += '   🏫 *Room:* Online\n';
          else if (sec.room) msg += `   🏫 *Room:* ${sec.room}\n`;
        });
      } else if (makeupStatus === 'custom') msg += `📝 *Note:* ${customMakeupText || 'Custom make-up details'}\n`;
      else msg += '📝 *Note:* No make-up class scheduled.\n';
      notes.forEach(n => msg += ` · *${n}*\n`);
      if (closingText) msg += `\n_${closingText}_`;
      return msg;
    }

    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;
    if (selectedDate) {
      const eventDate = new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]);
      const day = String(eventDate.getDate()).padStart(2, '0');
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const year = String(eventDate.getFullYear()).substring(2);
      msg += `📅 *Date:* ${day}/${month}/${year} ${eventDate.toLocaleDateString('en-US', { weekday: 'long' })}\n`;
    }

    const hasSections = sections.some(sec => sec.name || sec.startTime || sec.endTime || sec.room);
    if (hasSections) {
      sections.forEach(sec => {
        if (sec.name) msg += `\n*Section ${sec.name}*\n`;
        if (sec.startTime && sec.endTime) {
          const [h1, m1] = sec.startTime.split(':');
          const [h2, m2] = sec.endTime.split(':');
          msg += `⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
        } else if (sec.startTime) {
          const [h, m] = sec.startTime.split(':');
          msg += `⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`;
        } else msg += '⏰ *Time:* Will announce later\n';
        if (sec.mode === 'Online') msg += '🏫 *Room:* Online\n';
        else if (sec.room) msg += `🏫 *Room:* ${sec.room}\n`;
      });
    }

    if (topics.length > 0) {
      const labels = { quiz: 'Quiz Topics:', makeup_quiz: 'Quiz Topics:', exam: 'Exam Topics:', syllabus: 'Syllabus Details:', suggestion: 'Suggestions:', presentation: 'Presentation Topics:' };
      msg += `\n📝 *${labels[category] || 'Topics:'}*\n`;
      topics.forEach(t => msg += ` · *${t}*\n`);
    }
    notes.forEach(n => msg += `\n*Note:*\n · *${n}*\n`);
    if (closingText) msg += `\n_${closingText}_`;
    return msg;
  })();

  const buildPayload = () => {
    const finalCategory = broadcastMode === 'share_file' ? 'share_file' : category;
    const finalTitle = broadcastMode === 'share_file'
      ? (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)')
      : (title.trim() || (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)'));
    return {
      title: finalTitle,
      content: broadcastMode === 'share_file' ? 'Shared File(s)' : compiledMessage,
      category: finalCategory,
      course_id: (broadcastMode === 'share_file' || !selectedCourseId) ? null : parseInt(selectedCourseId),
      custom_room: broadcastMode === 'share_file' ? null : (sections[0]?.room || null),
      custom_time: null,
      file_id: uploadedFiles[0] ? uploadedFiles[0].id : null,
      file_ids: uploadedFiles.map(f => f.id),
      platform_ids: selectedPlatforms
    };
  };

  const fetchStorageUsage = async () => {
    try { const usage = await filesAPI.getStorageUsage(); setStorageUsage(usage); } catch (e) { console.error(e); }
  };

  const handlePlatformToggle = (id) => {
    if (id === 'clear') { setSelectedPlatforms([]); return; }
    setSelectedPlatforms(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('preferred_platforms', JSON.stringify(next));
      return next;
    });
  };

  const processUploads = async (fileList) => {
    if (storageUsage.usedBytes >= storageUsage.limitBytes) {
      toast.error('Upload failed: Storage limit reached.'); return;
    }
    setUploading(true);
    for (const f of Array.from(fileList)) {
      if (f.size > 50 * 1024 * 1024) { toast.error(`"${f.name}" exceeds 50MB.`); continue; }
      try {
        setUploadProgress(0);
        const record = await filesAPI.upload(f, (pe) => setUploadProgress(Math.round((pe.loaded * 100) / pe.total)));
        setUploadedFiles(prev => [...prev, record]);
        toast.success('Attachment uploaded!');
        fetchStorageUsage();
      } catch (e) { toast.error(`Upload failed for "${f.name}": ${e.response?.data?.error || e.message}`); }
    }
    setUploading(false);
  };

  const removeAttachment = async (index) => {
    const file = uploadedFiles[index];
    if (!file) return;
    try {
      await filesAPI.delete(file.id);
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      toast.success('Attachment removed.');
      fetchStorageUsage();
    } catch (e) { toast.error('Delete failed: ' + (e.response?.data?.error || e.message)); }
  };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = async (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length > 0) await processUploads(e.dataTransfer.files); };
  const handleFileChange = async (e) => { if (e.target.files?.length > 0) await processUploads(e.target.files); };

  const handlePresetChange = (presetValue) => {
    setTitlePreset(presetValue);
    if (presetValue !== 'Custom') { setTitle(presetValue); const def = PRESET_DEFS[presetValue]; if (def) { setCategory(def.category); setClosingText(def.closing); if (def.category === 'class_cancel') setMakeupStatus('later'); } }
    else setTitle('');
  };

  const handleTemplateApply = (templateId) => {
    const tpl = templates.find(t => t.id === parseInt(templateId));
    if (!tpl) return;
    setTitle(tpl.title_template);
    setCategory(tpl.category || 'notice');
    if (tpl.content_template) {
      setNotes(prev => [...prev.filter(n => n !== tpl.content_template), tpl.content_template]);
    }
    toast.success(`Template "${tpl.name}" applied.`);
    setSelectedTemplate(templateId);
  };

  const addSectionField = () => setSections(prev => [...prev, { name: '', startTime: '', endTime: '', room: '', mode: makeupStatus === 'online' ? 'Online' : 'Offline' }]);
  const removeSectionField = (i) => { if (sections.length > 1) setSections(prev => prev.filter((_, idx) => idx !== i)); };
  const handleSectionChange = (i, field, val) => setSections(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });
  const addTopic = () => { if (currentTopic.trim()) { setTopics(prev => [...prev, currentTopic.trim()]); setCurrentTopic(''); } };
  const removeTopic = (i) => setTopics(prev => prev.filter((_, idx) => idx !== i));
  const addNote = () => { if (currentNote.trim()) { setNotes(prev => [...prev, currentNote.trim()]); setCurrentNote(''); } };
  const removeNote = (i) => setNotes(prev => prev.filter((_, idx) => idx !== i));

  const validateForm = () => {
    if (broadcastMode === 'share_file') { if (uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return false; } }
    else if (!title.trim() && uploadedFiles.length === 0) { toast.error('Please provide a title or upload a file.'); return false; }
    if (selectedPlatforms.length === 0) { toast.error('Please select at least one channel.'); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (broadcastMode !== 'share_file' && !title.trim() && uploadedFiles.length === 0) { toast.error('Please provide a title or upload a file.'); return; }
    if (broadcastMode === 'share_file' && uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (announcementId) { await announcementsAPI.update(announcementId, payload); toast.success('Draft updated!'); }
      else { const ann = await announcementsAPI.create(payload); setAnnouncementId(ann.id); toast.success('Draft saved!'); }
      sessionStorage.removeItem('announcement_draft');
    } catch (error) { toast.error(error.response?.data?.error || error.message || 'Failed to save draft'); }
    finally { setSubmitting(false); }
  };

  const handleScheduleBroadcast = async () => {
    if (!scheduleDateTime) { toast.error('Please select a date and time.'); return; }
    if (!announcementId) { toast.error('Please save the draft first.'); return; }
    setSubmitting(true);
    try {
      await announcementsAPI.schedule(announcementId, new Date(scheduleDateTime).toISOString());
      toast.success(`Scheduled for ${new Date(scheduleDateTime).toLocaleString()}`);
      sessionStorage.removeItem('announcement_draft');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) { toast.error(error.response?.data?.error || error.message || 'Scheduling failed'); }
    finally { setSubmitting(false); }
  };

  const handleConfirmBroadcast = () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const handleSendBroadcast = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let ann = announcementId ? await announcementsAPI.update(announcementId, payload) : await announcementsAPI.create(payload);
      if (!announcementId) setAnnouncementId(ann.id);
      try {
        const res = await announcementsAPI.send(ann.id, { confirmed: true });
        toast.success(`Broadcasted! (${res.successCount} success, ${res.failureCount} failed)`);
      } catch (sendErr) {
        toast.error(sendErr.response?.data?.error || sendErr.message || 'Broadcast failed');
      }
      sessionStorage.removeItem('announcement_draft');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) { toast.error(error.response?.data?.error || error.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // Effects
  useEffect(() => {
    if (broadcastMode === 'share_file') return;
    if (titlePreset === 'Custom') {
      const t = title.toLowerCase();
      if (t.includes('syllabus')) setCategory('syllabus');
      else if (t.includes('suggestion')) setCategory('suggestion');
      else if (t.includes('makeup quiz') || t.includes('make-up quiz')) setCategory('makeup_quiz');
      else if (t.includes('quiz')) setCategory('quiz');
      else if (t.includes('exam') || t.includes('final') || t.includes('mid')) setCategory('exam');
      else if (t.includes('assignment')) setCategory('assignment');
      else if (t.includes('report')) setCategory('lab_report');
      else if (t.includes('performance')) setCategory('lab_performance');
      else if (t.includes('presentation')) setCategory('presentation');
      else if (t.includes('cancel') || t.includes('no class')) setCategory('class_cancel');
      else setCategory('notice');
    }
  }, [title, titlePreset, broadcastMode]);

  useEffect(() => {
    const draft = { broadcastMode, titlePreset, title, category, selectedCourseId, selectedDate, sections, topics, notes, closingText, selectedPlatforms, uploadedFiles, makeupStatus, customMakeupText };
    sessionStorage.setItem('announcement_draft', JSON.stringify(draft));
  }, [broadcastMode, titlePreset, title, category, selectedCourseId, selectedDate, sections, topics, notes, closingText, selectedPlatforms, uploadedFiles, makeupStatus, customMakeupText]);

  useEffect(() => { if (!showTopics) setTopics([]); }, [showTopics]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingData(true);
        const [cData, pData, sData, waData, tplData] = await Promise.all([
          coursesAPI.list(), platformsAPI.list(), filesAPI.getStorageUsage(),
          platformsAPI.getWhatsAppStatus().catch(() => ({ status: 'DISCONNECTED' })),
          templatesAPI.list().catch(() => [])
        ]);
        setCourses(cData); setPlatforms(pData); setStorageUsage(sData || { usedBytes: 0, limitBytes: 104857600, percentage: 0 });
        setWaStatus(waData.status); setTemplates(tplData);
        if (isEditMode) return;
        const draftStr = sessionStorage.getItem('announcement_draft');
        if (!draftStr && pData.length > 0) {
          const prefStr = localStorage.getItem('preferred_platforms');
          if (prefStr) { try { const prefIds = JSON.parse(prefStr); setSelectedPlatforms(prefIds.filter(id => pData.some(p => p.id === id))); } catch (_) { setSelectedPlatforms(pData.map(p => p.id)); } }
          else setSelectedPlatforms(pData.map(p => p.id));
        }
      } catch (e) { console.error('Init failed:', e); }
      finally { setLoadingData(false); }
    };
    init();
    const pollInterval = setInterval(async () => { try { const res = await platformsAPI.getWhatsAppStatus(); setWaStatus(res.status); } catch (_) {} }, 7000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'whatsapp_status') setWaStatus(payload.data.status);
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  useEffect(() => {
    if (platforms.length > 0) {
      const unavailableIds = platforms.filter(p => p.service_available === false || p.is_active === false).map(p => p.id);
      if (unavailableIds.length > 0) setSelectedPlatforms(prev => { const filtered = prev.filter(id => !unavailableIds.includes(id)); return filtered.length !== prev.length ? filtered : prev; });
    }
  }, [platforms]);

  useEffect(() => {
    if (!isEditMode || !editId) return;
    const loadAnn = async () => {
      try {
        setLoadingData(true);
        const ann = await announcementsAPI.get(editId);
        if (ann.status !== 'draft' && ann.status !== 'scheduled') { toast.error('Cannot edit this notice.'); setLoadingData(false); navigate('/dashboard'); return; }
        setAnnouncementId(ann.id);
        if (ann.scheduled_at) { setScheduleDateTime(new Date(ann.scheduled_at).toISOString().slice(0, 16)); setShowSchedulePicker(true); }
        setTitle(ann.title); setCategory(ann.category); setBroadcastMode(ann.category === 'share_file' ? 'share_file' : 'notice');
        setSelectedCourseId(ann.course_id ? String(ann.course_id) : '');
        if (ann.file_ids?.length > 0 || ann.file_id) setUploadedFiles(ann.files || []);
        if (ann.delivery?.length > 0) setSelectedPlatforms(ann.delivery.map(d => d.platform_id));
        setLoadingData(false);
      } catch (err) { toast.error('Failed to load announcement'); setLoadingData(false); navigate('/dashboard'); }
    };
    loadAnn();
  }, [editId]);

  useEffect(() => { if (isEditMode) { isDateRestored.current = true; isSectionsRestored.current = true; } }, [isEditMode]);

  const [currentCourseRoutines, setCurrentCourseRoutines] = useState([]);
  useEffect(() => {
    if (!selectedCourseId) { setCurrentCourseRoutines([]); return; }
    coursesAPI.get(parseInt(selectedCourseId)).then(fc => setCurrentCourseRoutines(fc.routines || [])).catch(() => {});
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedDate) { const d = new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]); setSelectedDay(d.toLocaleDateString('en-US', { weekday: 'long' })); }
    else setSelectedDay('');
  }, [selectedDate]);

  const getNextOccurrence = (routineDays) => {
    if (!routineDays?.length) return '';
    const dayIndices = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const today = new Date();
    const todayIdx = today.getDay();
    let minDays = Infinity;
    routineDays.forEach(rDay => { const ti = dayIndices[rDay.toLowerCase()]; if (ti !== undefined) { const d = (ti - todayIdx + 7) % 7; if (d < minDays) minDays = d; } });
    if (minDays !== Infinity) { const r = new Date(today); r.setDate(today.getDate() + minDays); return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`; }
    return '';
  };

  useEffect(() => {
    const draftStr = sessionStorage.getItem('announcement_draft');
    if (draftStr && !isDateRestored.current) { isDateRestored.current = true; return; }
    if (currentCourseRoutines.length > 0) setSelectedDate(getNextOccurrence(currentCourseRoutines.map(r => r.day_of_week)));
    else setSelectedDate('');
  }, [currentCourseRoutines]);

  useEffect(() => {
    const draftStr = sessionStorage.getItem('announcement_draft');
    if (draftStr && !isSectionsRestored.current) { isSectionsRestored.current = true; return; }
    if (!selectedDay || currentCourseRoutines.length === 0) { setSections([{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline' }]); return; }
    const matched = currentCourseRoutines.filter(r => r.day_of_week.toLowerCase() === selectedDay.toLowerCase());
    if (matched.length > 0) setSections(matched.map(m => ({ name: m.section || '', startTime: m.start_time?.substring(0, 5) || '', endTime: m.end_time?.substring(0, 5) || '', room: m.room_number, mode: 'Offline' })));
    else setSections([{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline' }]);
  }, [selectedDay, currentCourseRoutines]);

  useEffect(() => {
    if (makeupStatus === 'online') setSections(prev => prev.map(sec => ({ ...sec, mode: 'Online', room: '' })));
  }, [makeupStatus]);

  if (loadingData) {
    return (<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-ink-mute hover:text-ink hover:bg-canvas-soft rounded-sm transition-colors cursor-pointer" title="Back to Dashboard"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-display-md tracking-tight font-sans text-ink">{isEditMode ? 'Edit Broadcast' : 'New Broadcast'}</h1>
            <p className="text-sm text-ink-mute mt-1.5 font-sans">{isEditMode ? 'Modify your draft and broadcast when ready.' : 'Formulate and dispatch course notices to all active channels simultaneously.'}</p>
          </div>
        </div>
        {announcementId && <span className="text-[10px] font-mono text-ink-mute bg-canvas-soft border border-hairline px-2 py-1 rounded-sm">ID: {announcementId}</span>}
      </div>

      {/* Template quick-fill */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent-violet/5 border border-accent-violet/20 rounded-sm">
          <span className="text-xs font-medium text-accent-violet">Quick-fill from template:</span>
          <select value={selectedTemplate} onChange={e => handleTemplateApply(e.target.value)} className="px-3 py-1.5 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary flex-1 max-w-[300px]">
            <option value="">Select a template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={(e) => { e.preventDefault(); handleConfirmBroadcast(); }} className="lg:col-span-7 bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex gap-4 p-1 bg-canvas-soft border border-hairline rounded-sm w-fit mb-6">
            <button type="button" onClick={() => setBroadcastMode('notice')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'notice' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📢 Announcement Notice</button>
            <button type="button" onClick={() => setBroadcastMode('share_file')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'share_file' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📎 Share File Only</button>
          </div>

          {broadcastMode === 'notice' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Notice Preset</label>
                  <div className="custom-select-wrapper">
                    <select value={titlePreset} onChange={(e) => handlePresetChange(e.target.value)} className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150">
                      {TITLE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">{uploadedFiles.length > 0 ? 'Title Text (Optional)' : 'Title Text *'}</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quiz - 4" className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150" />
                </div>
              </div>

              <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><BookOpen className="w-4 h-4 mr-1.5 text-primary" /> Course & Date Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={(category === 'syllabus' || category === 'suggestion') ? "md:col-span-2" : ""}>
                    <label className="block text-[11px] font-medium text-ink-mute mb-1">Target Course</label>
                    <div className="custom-select-wrapper">
                      <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150">
                        <option value="">General Notice (No Course)</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.course_id} - {c.course_name}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
                    </div>
                  </div>
                  {(category !== 'syllabus' && category !== 'suggestion') && (
                    <div><label className="block text-[11px] font-medium text-ink-mute mb-1">Event Date</label><DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} placeholder="Select Event Date" /></div>
                  )}
                </div>
              </div>

              {category === 'class_cancel' && (
                <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-3">
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1">Make-up / Rescheduling Option</label>
                  <div className="custom-select-wrapper">
                    <select value={makeupStatus} onChange={(e) => setMakeupStatus(e.target.value)} className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150">
                      <option value="later">⏰ Make-up time will be shared later</option>
                      <option value="rescheduled">📅 Rescheduled to new time/room slot</option>
                      <option value="online">📍 Held Online instead (at same/new time)</option>
                      <option value="none">❌ Just Cancelled (No make-up)</option>
                      <option value="custom">✏️ Custom Rescheduling Details...</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                  {makeupStatus === 'custom' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-semibold text-ink-mute mb-1">Custom Make-up / Rescheduling Text *</label>
                      <input type="text" required value={customMakeupText} onChange={(e) => setCustomMakeupText(e.target.value)} placeholder="e.g. Makeup class on Friday at 3:00 PM in Room 602." className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150" />
                    </div>
                  )}
                </div>
              )}

              {(category !== 'class_cancel' && category !== 'syllabus' && category !== 'suggestion' || (category === 'class_cancel' && (makeupStatus === 'rescheduled' || makeupStatus === 'online'))) && (
                <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline-cool pb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary" /> Timings & Class Rooms (Sections)</h4>
                    <button type="button" onClick={addSectionField} className="flex items-center text-xs font-semibold text-primary hover:text-primary-deep"><Plus className="w-3.5 h-3.5 mr-1" /> Add Section</button>
                  </div>
                  <div className="space-y-4">
                    {sections.map((sec, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row items-end gap-3 p-3 bg-canvas border border-hairline rounded-sm relative">
                        {sections.length > 1 && <button type="button" onClick={() => removeSectionField(idx)} className="absolute top-2 right-2 p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors"><X className="w-3.5 h-3.5" /></button>}
                        <div className="w-full md:w-[12%]">
                          <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Section *</label></div>
                          <input type="text" required value={sec.name} onChange={(e) => handleSectionChange(idx, 'name', e.target.value)} placeholder="e.g. A" className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                        </div>
                        <div className="w-full md:w-[22%]">
                          <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Time / Start Time</label></div>
                          <TimePicker value={sec.startTime || ''} onChange={(val) => handleSectionChange(idx, 'startTime', val)} placeholder="Start Time" className="text-xs" />
                        </div>
                        <div className="w-full md:w-[22%]">
                          <div className="h-5 flex items-end justify-between mb-1">
                            <label className="block text-[10px] font-semibold text-ink-mute leading-none">End Time</label>
                            <label className="inline-flex items-center text-[9px] font-semibold text-primary cursor-pointer select-none leading-none pb-0.5">
                              <input type="checkbox" checked={sec.hasEndTime !== false} onChange={(e) => { handleSectionChange(idx, 'hasEndTime', e.target.checked); if (!e.target.checked) handleSectionChange(idx, 'endTime', ''); }} className="mr-0.5 accent-primary w-2.5 h-2.5" /> Range
                            </label>
                          </div>
                          {sec.hasEndTime !== false ? (
                            <TimePicker value={sec.endTime || ''} onChange={(val) => handleSectionChange(idx, 'endTime', val)} placeholder="End Time" className="text-xs" />
                          ) : (
                            <div className="w-full px-2 py-1.5 border border-dashed border-hairline bg-canvas-soft rounded-sm text-[10px] text-ink-mute font-medium text-center h-9 flex items-center justify-center select-none">Singular Time</div>
                          )}
                        </div>
                        <div className="w-full md:w-[24%]">
                          <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Mode</label></div>
                          <div className="custom-select-wrapper">
                            <select value={sec.mode} disabled={makeupStatus === 'online'} onChange={(e) => handleSectionChange(idx, 'mode', e.target.value)} className="custom-select block w-full pl-3 pr-7 h-9 py-1.5 border border-hairline bg-canvas rounded-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink disabled:opacity-60 disabled:cursor-not-allowed hover:border-hairline-strong transition-all duration-150">
                              <option value="Offline">🏫 Offline Room</option>
                              <option value="Online">🏫 Room - Online</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute"><ChevronDown className="h-3.5 w-3.5" /></div>
                          </div>
                        </div>
                        {sec.mode === 'Offline' && (
                          <div className="w-full md:w-[20%]">
                            <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Room #</label></div>
                            <input type="text" value={sec.room} onChange={(e) => handleSectionChange(idx, 'room', e.target.value)} placeholder="e.g. 611" className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showTopics && (
                <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><ListPlus className="w-4 h-4 mr-1.5 text-primary" /> {category === 'syllabus' ? 'Syllabus Details' : category === 'suggestion' ? 'Suggestions' : 'Topics / Syllabus'}</h4>
                  <div className="flex gap-2">
                    <input type="text" value={currentTopic} onChange={(e) => setCurrentTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }} placeholder={category === 'syllabus' ? 'Type syllabus detail...' : category === 'suggestion' ? 'Type suggestion...' : 'Type topic and press Enter...'} className="w-full px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <button type="button" onClick={addTopic} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors">Add</button>
                  </div>
                  {topics.length > 0 && (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                      {topics.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-ink-secondary py-1 px-2 hover:bg-canvas-soft rounded-sm">
                          <span className="truncate"> • {t}</span>
                          <button type="button" onClick={() => removeTopic(i)} className="text-ink-mute hover:text-accent-tomato"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><StickyNote className="w-4 h-4 mr-1.5 text-primary" /> Instructions & Notes</h4>
                <div className="flex gap-2">
                  <input type="text" value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }} placeholder="Add cover page / submit slides link..." className="w-full px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={addNote} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors">Add</button>
                </div>
                {notes.length > 0 && (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                    {notes.map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-ink-secondary py-1 px-2 hover:bg-canvas-soft rounded-sm">
                        <span className="truncate"> • {n}</span>
                        <button type="button" onClick={() => removeNote(i)} className="text-ink-mute hover:text-accent-tomato"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Closing / Remarks Text</label>
                <input type="text" value={closingText} onChange={(e) => setClosingText(e.target.value)} placeholder="Please be prepared and attend on time. Good luck! 🍀📖" className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink font-sans" />
              </div>
            </>
          )}

          <FileUploader fileInputRef={fileInputRef} uploadedFiles={uploadedFiles} uploading={uploading} uploadProgress={uploadProgress} dragActive={dragActive} onDrag={handleDrag} onDrop={handleDrop} onFileChange={handleFileChange} onRemove={removeAttachment} />

          {uploadedFiles.length > 0 && (
            <div className="pt-2 bg-canvas/30 rounded-sm p-3 border border-hairline/60">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-mute mb-1">
                <span>Storage Space</span>
                <span>{(storageUsage.usedBytes / 1024 / 1024).toFixed(2)} MB / {(storageUsage.limitBytes / 1024 / 1024).toFixed(0)} MB ({storageUsage.percentage}%)</span>
              </div>
              <div className="w-full bg-hairline rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${storageUsage.percentage > 90 ? 'bg-accent-tomato' : storageUsage.percentage > 70 ? 'bg-accent-yellow' : 'bg-primary'}`} style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}></div>
              </div>
              {storageUsage.percentage >= 100 && <p className="text-[10px] text-accent-tomato font-semibold mt-1 flex items-center gap-1">⚠️ Storage limit reached. Remove files to upload more.</p>}
            </div>
          )}

          <PlatformSelector platforms={platforms} selectedPlatforms={selectedPlatforms} onToggle={handlePlatformToggle} waStatus={waStatus} />

          <div className="pt-4 border-t border-hairline-cool space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleSaveDraft} disabled={submitting || uploading} className="flex items-center justify-center py-2 px-4 border border-hairline rounded-sm shadow-sm text-sm font-medium text-ink bg-canvas hover:bg-canvas-soft focus:outline-none transition-colors duration-150 cursor-pointer disabled:opacity-50">
                  <Save className="w-4 h-4 mr-1.5" />{submitting ? 'Saving...' : announcementId ? 'Update Draft' : 'Save Draft'}
                </button>
                <SchedulePicker scheduleDateTime={scheduleDateTime} setScheduleDateTime={setScheduleDateTime} show={showSchedulePicker} onToggle={() => { if (!announcementId) { toast.error('Please save the draft first.'); return; } setShowSchedulePicker(!showSchedulePicker); }} />
                {showSchedulePicker && (
                  <button type="button" onClick={handleScheduleBroadcast} disabled={submitting} className="flex items-center px-3 py-1.5 rounded-sm text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors disabled:opacity-50 cursor-pointer">
                    <ClockIcon className="w-3.5 h-3.5 mr-1" /> Confirm Schedule
                  </button>
                )}
              </div>
              <button type="submit" disabled={submitting || uploading} className="flex items-center justify-center py-2 px-6 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors duration-150 cursor-pointer disabled:opacity-50">
                <Send className="w-4 h-4 mr-2" />{submitting ? 'Dispatching...' : 'Broadcast Notice'}
              </button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-2.5">
            <h3 className="text-md font-medium text-ink flex items-center gap-1.5 font-sans"><Smartphone className="w-5 h-5 text-ink-mute" /> Device Live Preview</h3>
            <div className="flex border border-hairline rounded bg-canvas-soft p-0.5">
              <button type="button" onClick={() => setPreviewTab('whatsapp')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 cursor-pointer ${previewTab === 'whatsapp' ? 'bg-canvas text-ink font-semibold shadow-sm' : 'text-ink-mute hover:text-ink'}`}>WhatsApp</button>
              <button type="button" onClick={() => setPreviewTab('telegram')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 cursor-pointer ${previewTab === 'telegram' ? 'bg-canvas text-ink font-semibold shadow-sm' : 'text-ink-mute hover:text-ink'}`}>Telegram</button>
            </div>
          </div>

          <div className="bg-[#1c1c1c] text-white rounded-[24px] p-4 border-[6px] border-[#252525] shadow-xl w-full flex flex-col justify-between overflow-hidden min-h-[500px]">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 px-2 pb-2"><span>9:41 AM</span><div className="flex gap-1"><span>📶</span><span>🔋</span></div></div>
            <div className={`flex-1 rounded-[16px] p-3 overflow-y-auto flex flex-col justify-end ${previewTab === 'whatsapp' ? 'bg-[#0b141a]' : 'bg-[#182533]'}`}>
              <div className={`rounded-lg p-3 max-w-[90%] text-xs font-sans text-ink ${previewTab === 'whatsapp' ? 'bg-[#005c4b] text-white self-end rounded-tr-none' : 'bg-[#182533] text-white self-start rounded-tl-none border border-slate-700'}`}>
                {uploadedFiles.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={file.id || idx} className="flex items-center gap-2 p-2 bg-black/20 rounded-md border border-white/10 text-white">
                        <Paperclip className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                        <div className="min-w-0 flex-1"><p className="text-[10px] font-medium truncate text-white" title={file.original_name}>{file.original_name}</p><p className="text-[9px] text-zinc-400">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p></div>
                      </div>
                    ))}
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed break-words">{compiledMessage || 'Your message preview will appear here...'}</pre>
              </div>
            </div>
            <div className="w-24 h-1 bg-zinc-600 rounded-full mx-auto mt-3.5"></div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Send className="w-5 h-5 text-primary" /></div>
              <div><h3 className="text-md font-semibold text-ink">Confirm Broadcast</h3><p className="text-sm text-ink-mute">This will immediately send to {selectedPlatforms.length} channel(s).</p></div>
            </div>
            <div className="bg-accent-yellow/5 border border-accent-yellow/20 rounded-sm p-3 text-xs text-ink-mute"><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-accent-yellow" /> This action cannot be undone. The notice will be broadcast to all selected platforms.</div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSendBroadcast} disabled={submitting} className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50 flex items-center"><Send className="w-4 h-4 mr-1.5" />{submitting ? 'Sending...' : 'Yes, Broadcast Now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;
