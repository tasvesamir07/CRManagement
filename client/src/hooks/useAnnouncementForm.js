import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { coursesAPI, platformsAPI, filesAPI, announcementsAPI, templatesAPI } from '../services/api';
import { useWebSocket } from './useWebSocket';
import { useOnlineStatus } from './useOnlineStatus';
import { OfflineCache, OfflineDrafts } from '../services/offline';
import toast from 'react-hot-toast';
import { PRESET_DEFS } from '../lib/announcementPresets';
import { getCompiledMessage as getCompiledMsg } from '../lib/compileMessage';

function getInitialValue(key, defaultValue) {
  try {
    const draftStr = sessionStorage.getItem('announcement_draft');
    if (draftStr) {
      const draft = JSON.parse(draftStr);
      if (draft[key] !== undefined) return draft[key];
    }
  } catch (e) { console.error('Failed to parse draft', e); }
  return defaultValue;
}

export function createNewNoticeObj(index = 0) {
  return {
    id: Date.now() + index,
    titlePreset: 'Quiz - 1',
    title: 'Quiz - 1',
    category: 'quiz',
    selectedCourseId: '',
    selectedDate: '',
    sections: [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }],
    topics: [],
    notes: [],
    makeupStatus: 'later',
    customMakeupText: '',
    currentTopic: '',
    currentNote: '',
    noteType: 'note',
    isExpanded: true
  };
}

function getNextOccurrence(routineDays) {
  if (!routineDays?.length) return '';
  const dayIndices = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const today = new Date();
  const todayIdx = today.getDay();
  let minDays = Infinity;
  routineDays.forEach(rDay => {
    const ti = dayIndices[rDay.toLowerCase()];
    if (ti !== undefined) { const d = (ti - todayIdx + 7) % 7; if (d < minDays) minDays = d; }
  });
  if (minDays !== Infinity) {
    const r = new Date(today);
    r.setDate(today.getDate() + minDays);
    return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`;
  }
  return '';
}

export default function useAnnouncementForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const isEditMode = !!editId;
  const isOnline = useOnlineStatus();

  const [courses, setCourses] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [broadcastMode, setBroadcastMode] = useState(() => getInitialValue('broadcastMode', 'notice'));
  const [fileCaption, setFileCaption] = useState(() => getInitialValue('fileCaption', ''));
  const [customText, setCustomText] = useState(() => getInitialValue('customText', ''));

  const [notices, setNotices] = useState(() => {
    try {
      const draftStr = sessionStorage.getItem('announcement_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.notices && Array.isArray(draft.notices)) return draft.notices;
        if (draft.title !== undefined || draft.sections !== undefined) {
          return [{
            id: Date.now(), titlePreset: draft.titlePreset || 'Quiz - 1',
            title: draft.title || 'Quiz - 1', category: draft.category || 'quiz',
            selectedCourseId: draft.selectedCourseId || '', selectedDate: draft.selectedDate || '',
            sections: draft.sections || [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }],
            topics: draft.topics || [], notes: draft.notes || [],
            makeupStatus: draft.makeupStatus || 'later', customMakeupText: draft.customMakeupText || '',
            currentTopic: '', currentNote: '', noteType: 'note', isExpanded: true
          }];
        }
      }
    } catch (e) { console.error('Failed to parse draft', e); }
    return [createNewNoticeObj()];
  });

  const courseRoutinesCache = useRef({});

  const getCourseRoutines = async (courseId) => {
    if (!courseId) return [];
    if (courseRoutinesCache.current[courseId]) return courseRoutinesCache.current[courseId];
    try {
      const fc = await coursesAPI.get(parseInt(courseId));
      const routines = fc.routines || [];
      courseRoutinesCache.current[courseId] = routines;
      return routines;
    } catch (e) {
      console.error('Failed to fetch routines for course', courseId, e);
      return [];
    }
  };

  const [closingText, setClosingText] = useState(() => getInitialValue('closingText', 'Please be prepared and attend on time. Good luck! 🍀📖'));
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => getInitialValue('selectedPlatforms', []));
  const [alreadySentPlatforms, setAlreadySentPlatforms] = useState([]);
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
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [previewTextError, setPreviewTextError] = useState(false);
  const [draggedTopicIdx, setDraggedTopicIdx] = useState(null);
  const [draggedNoteIdx, setDraggedNoteIdx] = useState(null);
  const [currentCourseRoutines, setCurrentCourseRoutines] = useState([]);
  const isDateRestored = useRef(false);
  const isSectionsRestored = useRef(false);

  const handleNoticeFieldChange = (index, field, val) => {
    setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: val }; return u; });
  };

  const handlePresetChange = (index, presetValue) => {
    setNotices(prev => {
      const u = [...prev];
      const notice = u[index];
      notice.titlePreset = presetValue;
      if (presetValue !== 'Custom') {
        notice.title = presetValue;
        const def = PRESET_DEFS[presetValue];
        if (def) {
          notice.category = def.category;
          if (def.closing) setClosingText(def.closing);
          if (def.category === 'class_cancel') notice.makeupStatus = 'later';
        }
      } else {
        notice.title = '';
      }
      return u;
    });
  };

  const handleTitleChange = (index, titleValue) => {
    setNotices(prev => {
      const u = [...prev];
      const notice = u[index];
      notice.title = titleValue;
      if (notice.titlePreset === 'Custom') {
        const t = titleValue.toLowerCase();
        if (t.includes('syllabus')) notice.category = 'syllabus';
        else if (t.includes('suggestion')) notice.category = 'suggestion';
        else if (t.includes('makeup quiz') || t.includes('make-up quiz')) notice.category = 'makeup_quiz';
        else if (t.includes('quiz')) notice.category = 'quiz';
        else if (t.includes('exam') || t.includes('final') || t.includes('mid')) notice.category = 'exam';
        else if (t.includes('assignment')) notice.category = 'assignment';
        else if (t.includes('report')) notice.category = 'lab_report';
        else if (t.includes('performance')) notice.category = 'lab_performance';
        else if (t.includes('presentation')) notice.category = 'presentation';
        else if (t.includes('cancel') || t.includes('no class')) notice.category = 'class_cancel';
        else notice.category = 'notice';
      }
      return u;
    });
  };

  const handleCourseChange = async (index, courseId) => {
    setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], selectedCourseId: courseId }; return u; });
    if (isEditMode) return;
    if (!courseId) {
      setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], selectedDate: '', sections: [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }] }; return u; });
      return;
    }
    const routines = await getCourseRoutines(courseId);
    const nextOcc = getNextOccurrence(routines.map(r => r.day_of_week));
    let sectionsToSet = [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }];
    if (nextOcc) {
      const d = new Date(nextOcc.split('-')[0], nextOcc.split('-')[1] - 1, nextOcc.split('-')[2]);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const matched = routines.filter(r => r.day_of_week.toLowerCase() === dayName.toLowerCase());
      if (matched.length > 0) {
        sectionsToSet = matched.map(m => ({
          name: m.section || '', startTime: m.start_time?.substring(0, 5) || '',
          endTime: m.end_time?.substring(0, 5) || '', room: m.room_number || '',
          mode: 'Offline', timeOption: m.start_time ? 'select' : 'tbd'
        }));
      }
    }
    setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], selectedDate: nextOcc, sections: sectionsToSet }; return u; });
    coursesAPI.get(parseInt(courseId)).then(fc => {
      if (fc.default_platform_ids && fc.default_platform_ids.length > 0) {
        const availableDefaults = fc.default_platform_ids.filter(id => platforms.some(p => p.id === id));
        if (availableDefaults.length > 0) setSelectedPlatforms(availableDefaults);
      }
    }).catch(() => {});
  };

  const handleDateChange = async (index, dateStr) => {
    setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], selectedDate: dateStr }; return u; });
    if (isEditMode) return;
    const notice = notices[index];
    if (!dateStr || !notice.selectedCourseId) return;
    const d = new Date(dateStr.split('-')[0], dateStr.split('-')[1] - 1, dateStr.split('-')[2]);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const routines = await getCourseRoutines(notice.selectedCourseId);
    const matched = routines.filter(r => r.day_of_week.toLowerCase() === dayName.toLowerCase());
    const sectionsToSet = matched.length > 0
      ? matched.map(m => ({ name: m.section || '', startTime: m.start_time?.substring(0, 5) || '', endTime: m.end_time?.substring(0, 5) || '', room: m.room_number || '', mode: 'Offline', timeOption: m.start_time ? 'select' : 'tbd' }))
      : [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }];
    setNotices(prev => { const u = [...prev]; u[index] = { ...u[index], sections: sectionsToSet }; return u; });
  };

  const addSectionField = (index) => {
    setNotices(prev => { const u = [...prev]; const n = u[index]; n.sections = [...n.sections, { name: '', startTime: '', endTime: '', room: '', mode: n.makeupStatus === 'online' ? 'Online' : 'Offline', timeOption: 'select' }]; return u; });
  };

  const removeSectionField = (noticeIndex, sectionIndex) => {
    setNotices(prev => { const u = [...prev]; const n = u[noticeIndex]; if (n.sections.length > 1) n.sections = n.sections.filter((_, idx) => idx !== sectionIndex); return u; });
  };

  const handleSectionChange = (noticeIndex, sectionIndex, field, val) => {
    setNotices(prev => { const u = [...prev]; const sec = u[noticeIndex].sections[sectionIndex]; u[noticeIndex].sections[sectionIndex] = { ...sec, [field]: val }; return u; });
  };

  const addTopic = (index) => {
    setNotices(prev => { const u = [...prev]; const n = u[index]; if (n.currentTopic && n.currentTopic.trim()) { n.topics = [...n.topics, n.currentTopic.trim()]; n.currentTopic = ''; } return u; });
  };

  const removeTopic = (noticeIndex, topicIndex) => {
    setNotices(prev => { const u = [...prev]; u[noticeIndex].topics = u[noticeIndex].topics.filter((_, idx) => idx !== topicIndex); return u; });
  };

  const handleTopicDragStart = (e, noticeIndex, topicIndex) => { setDraggedTopicIdx({ noticeIndex, topicIndex }); e.dataTransfer.effectAllowed = 'move'; };

  const handleTopicDrop = (e, noticeIndex, targetTopicIndex) => {
    e.preventDefault();
    if (!draggedTopicIdx || draggedTopicIdx.noticeIndex !== noticeIndex || draggedTopicIdx.topicIndex === targetTopicIndex) return;
    setNotices(prev => { const u = [...prev]; const items = [...u[noticeIndex].topics]; const draggedItem = items[draggedTopicIdx.topicIndex]; items.splice(draggedTopicIdx.topicIndex, 1); items.splice(targetTopicIndex, 0, draggedItem); u[noticeIndex].topics = items; return u; });
    setDraggedTopicIdx(null);
  };

  const addNote = (index) => {
    setNotices(prev => { const u = [...prev]; const n = u[index]; if (n.currentNote && n.currentNote.trim()) { n.notes = [...n.notes, { text: n.currentNote.trim(), type: n.noteType }]; n.currentNote = ''; } return u; });
  };

  const removeNote = (noticeIndex, noteIndex) => {
    setNotices(prev => { const u = [...prev]; u[noticeIndex].notes = u[noticeIndex].notes.filter((_, idx) => idx !== noteIndex); return u; });
  };

  const handleNoteTypeChange = (noticeIndex, noteIndex, type) => {
    setNotices(prev => { const u = [...prev]; u[noticeIndex].notes = u[noticeIndex].notes.map((note, idx) => { if (idx === noteIndex) { const isObj = typeof note === 'object' && note !== null; const text = isObj ? note.text : note; return { text, type }; } return note; }); return u; });
  };

  const handleNoteDragStart = (e, noticeIndex, noteIndex) => { setDraggedNoteIdx({ noticeIndex, noteIndex }); e.dataTransfer.effectAllowed = 'move'; };

  const handleNoteDrop = (e, noticeIndex, targetNoteIndex) => {
    e.preventDefault();
    if (!draggedNoteIdx || draggedNoteIdx.noticeIndex !== noticeIndex || draggedNoteIdx.noteIndex === targetNoteIndex) return;
    setNotices(prev => { const u = [...prev]; const items = [...u[noticeIndex].notes]; const draggedItem = items[draggedNoteIdx.noteIndex]; items.splice(draggedNoteIdx.noteIndex, 1); items.splice(targetNoteIndex, 0, draggedItem); u[noticeIndex].notes = items; return u; });
    setDraggedNoteIdx(null);
  };

  const getShowTopics = (notice) => notice.category !== 'class_cancel' && notice.category !== 'notice' && !!notice.selectedCourseId;

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const data = await filesAPI.getDownloadUrl(file.id);
      setPreviewUrl(data.url);
    } catch {
      toast.error('Failed to load file preview');
      setPreviewFile(null);
    } finally { setPreviewLoading(false); }
  };

  useEffect(() => {
    if (!previewFile || !previewUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewTextContent('');
      setPreviewTextError(false);
      return;
    }
    const isText = (previewFile.file_type && previewFile.file_type.startsWith('text/')) ||
      previewFile.original_name.toLowerCase().endsWith('.csv') ||
      previewFile.original_name.toLowerCase().endsWith('.txt');
    if (isText) {
      setPreviewTextContent(''); setPreviewTextError(false);
      fetch(previewUrl).then(res => { if (!res.ok) throw new Error('Failed to fetch text content'); return res.text(); })
        .then(text => setPreviewTextContent(text))
        .catch(err => { console.error('[Preview] Text fetch failed:', err); setPreviewTextError(true); });
    }
  }, [previewFile, previewUrl]);

  const getCompiledMessage = () => getCompiledMsg({ notices, broadcastMode, customText, fileCaption, closingText, courses });

  const buildPayload = () => {
    const finalCategory = broadcastMode === 'share_file' ? 'share_file' : (broadcastMode === 'custom' ? 'custom' : notices[0]?.category || 'notice');
    const finalTitle = broadcastMode === 'share_file'
      ? (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)')
      : (notices.map(n => n.title).filter(Boolean).join(' & ') || (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)'));
    return {
      title: finalTitle,
      content: broadcastMode === 'share_file' ? (fileCaption.trim() || 'Shared File(s)') : getCompiledMessage(),
      category: finalCategory,
      course_id: (broadcastMode === 'share_file' || !notices[0]?.selectedCourseId) ? null : parseInt(notices[0].selectedCourseId),
      custom_room: (broadcastMode === 'share_file' || broadcastMode === 'custom') ? null : (notices[0]?.sections[0]?.room || null),
      custom_time: null,
      file_id: uploadedFiles[0] ? uploadedFiles[0].id : null,
      file_ids: uploadedFiles.map(f => f.id),
      platform_ids: selectedPlatforms,
      metadata: { notices, broadcastMode, customText, fileCaption, closingText }
    };
  };

  const fetchStorageUsage = async () => {
    try { const usage = await filesAPI.getStorageUsage(); setStorageUsage(usage); } catch (e) { console.error(e); }
  };

  const handleOpenLibrary = () => setShowLibraryModal(true);

  const handleAttachFromLibrary = (files) => { setUploadedFiles(prev => [...prev, files]); setShowLibraryModal(false); };

  const handlePlatformToggle = (id) => {
    if (id === 'clear') { setSelectedPlatforms([]); return; }
    setSelectedPlatforms(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('preferred_platforms', JSON.stringify(next));
      return next;
    });
  };

  const processUploads = async (fileList) => {
    if (storageUsage.usedBytes >= storageUsage.limitBytes) { toast.error('Upload failed: Storage limit reached.'); return; }
    setUploading(true);
    for (const f of Array.from(fileList)) {
      if (f.size > 50 * 1024 * 1024) { toast.error(`"${f.name}" exceeds 50MB.`); continue; }
      try {
        setUploadProgress(0);
        const dupCheck = await filesAPI.checkDuplicate(f.name);
        let overwrite = false;
        if (dupCheck.duplicate) { overwrite = window.confirm(`"${f.name}" already exists. Overwrite?`); if (!overwrite) continue; }
        const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
        const record = await uploadFn(f, (pe) => setUploadProgress(Math.round((pe.loaded * 100) / pe.total)));
        setUploadedFiles(prev => [...prev, record]);
        toast.success(overwrite ? 'File overwritten!' : 'Attachment uploaded!');
        fetchStorageUsage();
      } catch (e) { toast.error(`Upload failed for "${f.name}": ${e.response?.data?.error || e.message}`); }
    }
    setUploading(false);
  };

  const removeAttachment = (index) => { setUploadedFiles(prev => prev.filter((_, i) => i !== index)); toast.success('Attachment detached.'); };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = async (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length > 0) await processUploads(e.dataTransfer.files); };
  const handleFileChange = async (e) => { if (e.target.files?.length > 0) await processUploads(e.target.files); };

  const handleTemplateApply = (templateId) => {
    const tpl = templates.find(t => t.id === parseInt(templateId));
    if (!tpl) return;
    setNotices(prev => {
      const u = [...prev];
      if (u.length === 0) u.push(createNewNoticeObj());
      u[0].title = tpl.title_template; u[0].titlePreset = 'Custom'; u[0].category = tpl.category || 'notice';
      if (tpl.content_template) u[0].notes = [...u[0].notes.filter(n => (typeof n === 'object' ? n.text : n) !== tpl.content_template), { text: tpl.content_template, type: 'note' }];
      return u;
    });
    toast.success(`Template "${tpl.name}" applied to first notice.`);
    setSelectedTemplate(templateId);
  };

  const handleGenerateAIDraft = async () => {
    if (!aiPrompt.trim()) { toast.error('Please enter what you want to announce.'); return; }
    setAiDrafting(true); setGeneratedDraft('');
    try {
      const res = await announcementsAPI.draftAI(aiPrompt.trim(), notices[0]?.category || 'notice');
      setGeneratedDraft(res.draft);
      toast.success('Notice draft generated!');
    } catch (e) { toast.error(e.response?.data?.error || e.message || 'Generation failed'); }
    finally { setAiDrafting(false); }
  };

  const validateForm = () => {
    if (broadcastMode === 'share_file') { if (uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return false; } }
    else if (broadcastMode === 'custom') { if (!customText.trim()) { toast.error('Please write the notice body.'); return false; } }
    else {
      if (notices.length === 0) { toast.error('Please add at least one notice.'); return false; }
      for (let i = 0; i < notices.length; i++) { const n = notices[i]; if (!n.title.trim()) { toast.error(`Please provide a title for Notice #${i + 1}.`); return false; } }
    }
    if (selectedPlatforms.length === 0) { toast.error('Please select at least one channel.'); return false; }
    return true;
  };

  const saveDraftLocally = async (payload) => {
    const draftId = announcementId || `local_${Date.now()}`;
    await OfflineDrafts.save(draftId, {
      title: payload.title, content: payload.content, category: payload.category,
      course_id: payload.course_id, sections: notices[0]?.sections || [],
      platform_ids: payload.platform_ids, scheduled_at: payload.scheduled_at || null,
      status: 'draft', files: uploadedFiles, broadcastMode, customText, fileCaption, closingText, notices
    });
    if (!announcementId) setAnnouncementId(draftId);
  };

  const handleSaveDraft = async () => {
    if (broadcastMode === 'share_file') { if (uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return; } }
    else if (broadcastMode === 'custom') { if (!customText.trim()) { toast.error('Please write the notice body.'); return; } }
    else {
      if (notices.length === 0) { toast.error('Please add at least one notice.'); return; }
      for (let i = 0; i < notices.length; i++) { const n = notices[i]; if (!n.title.trim()) { toast.error(`Please provide a title for Notice #${i + 1}.`); return; } }
    }
    setSubmitting(true);
    const payload = buildPayload();
    if (isOnline) {
      try {
        if (announcementId && !String(announcementId).startsWith('local_')) { await announcementsAPI.update(announcementId, payload); toast.success('Draft updated!'); }
        else { const ann = await announcementsAPI.create(payload); setAnnouncementId(ann.id); if (announcementId && String(announcementId).startsWith('local_')) await OfflineDrafts.delete(announcementId); toast.success('Draft saved!'); }
        sessionStorage.removeItem('announcement_draft');
      } catch { toast.error('Network save failed. Saving locally...'); await saveDraftLocally(payload); }
      finally { setSubmitting(false); }
    } else { await saveDraftLocally(payload); toast.success('Draft saved offline (will sync when online)'); setSubmitting(false); }
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
    if (!isOnline) { toast.error('Cannot broadcast while offline. Saving notice as a local draft...'); handleSaveDraft(); return; }
    setShowConfirmModal(true);
  };

  const handleSendBroadcast = async () => {
    setShowConfirmModal(false); setSubmitting(true);
    try {
      const payload = buildPayload();
      let ann = announcementId ? await announcementsAPI.update(announcementId, payload) : await announcementsAPI.create(payload);
      if (!announcementId) setAnnouncementId(ann.id);
      try {
        const res = await announcementsAPI.send(ann.id, { confirmed: true });
        toast.success(`Broadcasted! (${res.successCount} success, ${res.failureCount} failed)`);
      } catch (sendErr) { toast.error(sendErr.response?.data?.error || sendErr.message || 'Broadcast failed'); }
      sessionStorage.removeItem('announcement_draft');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) { toast.error(error.response?.data?.error || error.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // Effects
  useEffect(() => {
    const draft = { broadcastMode, notices, closingText, selectedPlatforms, uploadedFiles, fileCaption, customText };
    sessionStorage.setItem('announcement_draft', JSON.stringify(draft));
  }, [broadcastMode, notices, closingText, selectedPlatforms, uploadedFiles, fileCaption, customText]);

  useEffect(() => {
    const fileIdsParam = searchParams.get('file_ids');
    if (fileIdsParam) {
      const ids = fileIdsParam.split(',').map(id => parseInt(id, 10)).filter(Boolean);
      if (ids.length > 0) {
        (async () => {
          try {
            const loadedFiles = [];
            for (const id of ids) {
              const res = await filesAPI.getDownloadUrl(id);
              if (res && res.file) loadedFiles.push(res.file);
            }
            if (loadedFiles.length > 0) {
              setUploadedFiles(prev => { const existingIds = new Set(prev.map(f => f.id)); const uniqueNew = loadedFiles.filter(f => !existingIds.has(f.id)); return [...prev, ...uniqueNew]; });
              toast.success(`${loadedFiles.length} file(s) attached from library!`);
            }
          } catch (e) { console.error('Failed to load preselected files from URL:', e); toast.error('Failed to load preselected files from library'); }
        })();
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isEditMode && location.state) {
      let stateChanged = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotices(prev => { const u = [...prev]; if (u.length === 0) u.push(createNewNoticeObj()); if (location.state.preFillTitle) { u[0].title = location.state.preFillTitle; u[0].titlePreset = 'Custom'; stateChanged = true; } if (location.state.preFillCategory) { u[0].category = location.state.preFillCategory; stateChanged = true; } return u; });
      if (location.state.preFillBody) { setCustomText(location.state.preFillBody); setBroadcastMode('custom'); stateChanged = true; }
      if (location.state.preAttachedFiles) { setUploadedFiles(prev => { const existingIds = new Set(prev.map(f => f.id)); const uniqueNew = location.state.preAttachedFiles.filter(f => !existingIds.has(f.id)); return [...prev, ...uniqueNew]; }); stateChanged = true; }
      if (location.state.selectedFiles) { setUploadedFiles(prev => { const existingIds = new Set(prev.map(f => f.id)); const uniqueNew = location.state.selectedFiles.filter(f => !existingIds.has(f.id)); return [...prev, ...uniqueNew]; }); toast.success(`${location.state.selectedFiles.length} file(s) attached!`); stateChanged = true; }
      if (location.state.preAttachedFiles) toast.success(`${location.state.preAttachedFiles.length} file(s) attached!`);
      if (stateChanged) window.history.replaceState({}, document.title);
    }
  }, [location, isEditMode]);

  useEffect(() => {
    const init = async () => {
      setLoadingData(true);
      let cData, pData;
      try {
        if (isOnline) { [cData, pData] = await Promise.all([coursesAPI.list(), platformsAPI.list()]); OfflineCache.set('/courses', cData); OfflineCache.set('/platforms', pData); }
        else { cData = await OfflineCache.get('/courses') || []; pData = await OfflineCache.get('/platforms') || []; }
      } catch { cData = await OfflineCache.get('/courses') || []; pData = await OfflineCache.get('/platforms') || []; }
      setCourses(cData);
      setPlatforms(pData);
      if (isOnline) { filesAPI.getStorageUsage().then(setStorageUsage).catch(() => {}); platformsAPI.getWhatsAppStatus().then(r => setWaStatus(r.status)).catch(() => {}); templatesAPI.list().then(setTemplates).catch(() => {}); }
      else { setWaStatus('DISCONNECTED'); }
      if (isEditMode) { setLoadingData(false); return; }
      const draftStr = sessionStorage.getItem('announcement_draft');
      if (!draftStr && pData.length > 0) {
        const prefStr = localStorage.getItem('preferred_platforms');
        if (prefStr) { try { const prefIds = JSON.parse(prefStr); setSelectedPlatforms(prefIds.filter(id => pData.some(p => p.id === id))); } catch { setSelectedPlatforms(pData.map(p => p.id)); } }
        else setSelectedPlatforms(pData.map(p => p.id));
      }
      setLoadingData(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'whatsapp_status') setWaStatus(payload.data.status);
  }, []);

  const { isConnected } = useWebSocket({ onMessage: handleWsMessage });

  useEffect(() => {
    if (!isOnline || isConnected) return;
    const pollInterval = setInterval(async () => { try { const res = await platformsAPI.getWhatsAppStatus(); setWaStatus(res.status); } catch { /* poll error */ } }, 20000);
    return () => clearInterval(pollInterval);
  }, [isOnline, isConnected]);

  useEffect(() => {
    if (platforms.length > 0) {
      const unavailableIds = platforms.filter(p => {
        const engineUnavailable = p.service_available === false || p.is_active === false;
        const needsPairing = !engineUnavailable && p.platform_type === 'whatsapp' && waStatus !== 'CONNECTED';
        return engineUnavailable || needsPairing;
      }).map(p => p.id);
      if (unavailableIds.length > 0) // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedPlatforms(prev => { const filtered = prev.filter(id => !unavailableIds.includes(id)); return filtered.length !== prev.length ? filtered : prev; });
    }
  }, [platforms, waStatus]);

  useEffect(() => {
    if (!isEditMode || !editId) return;
    (async () => {
      try {
        setLoadingData(true);
        let ann;
        if (String(editId).startsWith('local_')) ann = await OfflineDrafts.get(editId);
        else ann = await announcementsAPI.get(editId);
        if (!ann) { toast.error('Notice draft not found.'); setLoadingData(false); navigate('/dashboard'); return; }
        if (ann.status !== 'draft' && ann.status !== 'scheduled' && ann.status !== 'partial' && ann.status !== 'failed') { toast.error('Cannot edit this notice.'); setLoadingData(false); navigate('/dashboard'); return; }
        setAnnouncementId(ann.id || editId);
        if (ann.scheduled_at) { setScheduleDateTime(new Date(ann.scheduled_at).toISOString().slice(0, 16)); setShowSchedulePicker(true); }
        if (ann.metadata && typeof ann.metadata === 'object') {
          const meta = ann.metadata;
          if (meta.broadcastMode) setBroadcastMode(meta.broadcastMode);
          if (meta.customText !== undefined) setCustomText(meta.customText);
          if (meta.fileCaption !== undefined) setFileCaption(meta.fileCaption);
          if (meta.closingText !== undefined) setClosingText(meta.closingText);
          if (meta.notices && Array.isArray(meta.notices)) setNotices(meta.notices);
        } else {
          setBroadcastMode(ann.category === 'share_file' ? 'share_file' : (ann.category === 'custom' ? 'custom' : 'notice'));
          if (ann.category === 'share_file') setFileCaption(ann.content === 'Shared File(s)' ? '' : (ann.content || ''));
          else if (ann.category === 'custom') {
            setCustomText(ann.content || '');
            setNotices([{ id: Date.now(), titlePreset: 'Custom', title: ann.title || '', category: 'custom', selectedCourseId: ann.course_id ? String(ann.course_id) : '', selectedDate: '', sections: [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }], topics: [], notes: [], makeupStatus: 'later', customMakeupText: '', currentTopic: '', currentNote: '', noteType: 'note', isExpanded: true }]);
          } else {
            setNotices([{ id: Date.now(), titlePreset: 'Custom', title: ann.title || '', category: ann.category || 'notice', selectedCourseId: ann.course_id ? String(ann.course_id) : '', selectedDate: '', sections: [{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }], topics: [], notes: [], makeupStatus: 'later', customMakeupText: '', currentTopic: '', currentNote: '', noteType: 'note', isExpanded: true }]);
          }
        }
        if (ann.file_ids?.length > 0 || ann.file_id) setUploadedFiles(ann.files || []);
        if (ann.delivery?.length > 0) { setSelectedPlatforms(ann.delivery.filter(d => d.platform_status !== 'sent').map(d => d.platform_id)); setAlreadySentPlatforms(ann.delivery.filter(d => d.platform_status === 'sent').map(d => d.platform_id)); }
        setLoadingData(false);
      } catch { toast.error('Failed to load announcement'); setLoadingData(false); navigate('/dashboard'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  useEffect(() => { if (isEditMode) { isDateRestored.current = true; isSectionsRestored.current = true; } }, [isEditMode]);

  useEffect(() => {
    const firstCourseId = notices[0]?.selectedCourseId;
    if (!firstCourseId) { // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentCourseRoutines([]); return; }
    coursesAPI.get(parseInt(firstCourseId)).then(fc => setCurrentCourseRoutines(fc.routines || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices[0]?.selectedCourseId]);

  return {
    courses, platforms, loadingData, templates, selectedTemplate,
    broadcastMode, setBroadcastMode, fileCaption, setFileCaption, customText, setCustomText,
    notices, setNotices, closingText, setClosingText,
    selectedPlatforms, alreadySentPlatforms, waStatus,
    uploadedFiles, uploadProgress, uploading, dragActive,
    submitting, announcementId, showConfirmModal, scheduleDateTime, showSchedulePicker,
    previewTab, setPreviewTab, showLibraryModal, showAIModal,
    aiPrompt, setAiPrompt, aiDrafting, generatedDraft,
    previewFile, previewUrl, previewLoading, previewTextContent, previewTextError,
    fileInputRef, isEditMode, isOnline,
    handleNoticeFieldChange, handlePresetChange, handleTitleChange,
    handleCourseChange, handleDateChange,
    addSectionField, removeSectionField, handleSectionChange,
    addTopic, removeTopic, handleTopicDragStart, handleTopicDrop,
    addNote, removeNote, handleNoteTypeChange, handleNoteDragStart, handleNoteDrop,
    getShowTopics,
    handlePreview, handleOpenLibrary, handleAttachFromLibrary,
    handlePlatformToggle, processUploads, removeAttachment,
    handleDrag, handleDrop, handleFileChange,
    handleTemplateApply, setSelectedTemplate,
    handleGenerateAIDraft,
    getCompiledMessage, buildPayload,
    handleSaveDraft, handleConfirmBroadcast, handleSendBroadcast,
    handleScheduleBroadcast, setScheduleDateTime, setShowSchedulePicker,
    setShowConfirmModal, setShowAIModal, setShowLibraryModal,
    setPreviewFile, setPreviewUrl, setGeneratedDraft,
    currentCourseRoutines
  };
}
