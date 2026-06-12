import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  Calendar,
  Clipboard,
  GripVertical,
  FolderClosed,
  Eye,
  File,
  Download,
  Sparkles
} from 'lucide-react';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa6';

import MessageBuilder from './MessageBuilder';
import PlatformSelector from './PlatformSelector';
import SchedulePicker from './SchedulePicker';
import FileUploader from './FileUploader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

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

const formatMessageToHtml = (text) => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  escaped = escaped.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
  escaped = escaped.replace(/~([^~]+)~/g, '<del>$1</del>');
  escaped = escaped.replace(/\n/g, '<br/>');
  return escaped;
};

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
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
  const [fileCaption, setFileCaption] = useState(() => getInitialValue('fileCaption', ''));
  const [customText, setCustomText] = useState(() => getInitialValue('customText', ''));

  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');

  // Lightbox Preview states
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [previewTextError, setPreviewTextError] = useState(false);

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const data = await filesAPI.getDownloadUrl(file.id);
      setPreviewUrl(data.url);
    } catch (err) {
      toast.error('Failed to load file preview');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!previewFile || !previewUrl) {
      setPreviewTextContent('');
      setPreviewTextError(false);
      return;
    }
    const isText = (previewFile.file_type && previewFile.file_type.startsWith('text/')) ||
                   previewFile.original_name.toLowerCase().endsWith('.csv') ||
                   previewFile.original_name.toLowerCase().endsWith('.txt');
    if (isText) {
      setPreviewTextContent('');
      setPreviewTextError(false);
      fetch(previewUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch text content');
          return res.text();
        })
        .then(text => {
          setPreviewTextContent(text);
        })
        .catch(err => {
          console.error('[Preview] Text fetch failed:', err);
          setPreviewTextError(true);
        });
    }
  }, [previewFile, previewUrl]);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const [libFiles, setLibFiles] = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libPage, setLibPage] = useState(1);
  const [libSelectedIds, setLibSelectedIds] = useState([]);
  const [libCurrentFolderId, setLibCurrentFolderId] = useState(null);
  const [libCurrentFolderName, setLibCurrentFolderName] = useState('');
  const [libFolders, setLibFolders] = useState([]);
  const [libFoldersLoading, setLibFoldersLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getInitialValue('selectedDate', ''));

  const [sections, setSections] = useState(() => {
    const raw = getInitialValue('sections', [
      { name: '', startTime: '', endTime: '', room: '', mode: 'Offline' }
    ]);
    return raw.map(sec => ({
      ...sec,
      timeOption: sec.timeOption || (sec.startTime ? 'select' : 'tbd')
    }));
  });

  const [topics, setTopics] = useState(() => getInitialValue('topics', []));
  const [currentTopic, setCurrentTopic] = useState('');
  const [notes, setNotes] = useState(() => {
    const raw = getInitialValue('notes', []);
    return raw.map(n => {
      if (typeof n === 'string') return { text: n, type: 'note' };
      return n;
    });
  });
  const [currentNote, setCurrentNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [draggedTopicIdx, setDraggedTopicIdx] = useState(null);
  const [draggedNoteIdx, setDraggedNoteIdx] = useState(null);

  const handleTopicDragStart = (e, idx) => {
    setDraggedTopicIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleTopicDragOver = (e) => {
    e.preventDefault();
  };
  const handleTopicDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedTopicIdx === null || draggedTopicIdx === targetIdx) return;
    const items = [...topics];
    const draggedItem = items[draggedTopicIdx];
    items.splice(draggedTopicIdx, 1);
    items.splice(targetIdx, 0, draggedItem);
    setTopics(items);
    setDraggedTopicIdx(null);
  };

  const handleNoteDragStart = (e, idx) => {
    setDraggedNoteIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleNoteDragOver = (e) => {
    e.preventDefault();
  };
  const handleNoteDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedNoteIdx === null || draggedNoteIdx === targetIdx) return;
    const items = [...notes];
    const draggedItem = items[draggedNoteIdx];
    items.splice(draggedNoteIdx, 1);
    items.splice(targetIdx, 0, draggedItem);
    setNotes(items);
    setDraggedNoteIdx(null);
  };

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

  useEffect(() => {
    const fileIdsParam = searchParams.get('file_ids');
    if (fileIdsParam) {
      const ids = fileIdsParam.split(',').map(id => parseInt(id, 10)).filter(Boolean);
      if (ids.length > 0) {
        const fetchFilesMetadata = async () => {
          try {
            const loadedFiles = [];
            for (const id of ids) {
              const res = await filesAPI.getDownloadUrl(id);
              if (res && res.file) {
                loadedFiles.push(res.file);
              }
            }
            if (loadedFiles.length > 0) {
              setUploadedFiles(prev => {
                const existingIds = new Set(prev.map(f => f.id));
                const uniqueNew = loadedFiles.filter(f => !existingIds.has(f.id));
                return [...prev, ...uniqueNew];
              });
              toast.success(`${loadedFiles.length} file(s) attached from library!`);
            }
          } catch (e) {
            console.error('Failed to load preselected files from URL:', e);
            toast.error('Failed to load preselected files from library');
          }
        };
        fetchFilesMetadata();
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.state) {
      let stateChanged = false;
      if (location.state.preFillTitle) {
        setTitle(location.state.preFillTitle);
        setTitlePreset('Custom');
        stateChanged = true;
      }
      if (location.state.preFillBody) {
        setCustomText(location.state.preFillBody);
        setBroadcastMode('custom');
        stateChanged = true;
      }
      if (location.state.preFillCategory) {
        setCategory(location.state.preFillCategory);
        stateChanged = true;
      }
      if (location.state.preAttachedFiles) {
        setUploadedFiles(prev => {
          const existingIds = new Set(prev.map(f => f.id));
          const uniqueNew = location.state.preAttachedFiles.filter(f => !existingIds.has(f.id));
          return [...prev, ...uniqueNew];
        });
        toast.success(`${location.state.preAttachedFiles.length} file(s) attached!`);
        stateChanged = true;
      }
      if (location.state.selectedFiles) {
        setUploadedFiles(prev => {
          const existingIds = new Set(prev.map(f => f.id));
          const uniqueNew = location.state.selectedFiles.filter(f => !existingIds.has(f.id));
          return [...prev, ...uniqueNew];
        });
        toast.success(`${location.state.selectedFiles.length} file(s) attached!`);
        stateChanged = true;
      }
      if (stateChanged) {
        // Clear location state to prevent re-adding on refresh/back-navigation
        window.history.replaceState({}, document.title);
      }
    }
  }, [location]);

  const showTopics = category !== 'class_cancel' && category !== 'notice' && !!selectedCourseId;
  const isDateRestored = useRef(false);
  const isSectionsRestored = useRef(false);

  const compiledMessage = (() => {
    if (broadcastMode === 'custom') return customText;
    if (broadcastMode === 'share_file') return fileCaption;
    const course = courses.find(c => c.id === parseInt(selectedCourseId));
    let msg = title.trim() ? `📢 *${title}*\n\n` : '📢 *Title*\n\n';

    if (category === 'class_cancel') {
      if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;
      
      const sectionNames = sections.map(sec => sec.name).filter(Boolean);
      if (sectionNames.length > 0) {
        msg += `👥 *Section ${sectionNames.join(', ')}*\n`;
      }
      
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
          if (sec.timeOption === 'none') {
            // Omit time line
          } else if (sec.timeOption === 'custom') {
            if (sec.startTime) msg += `   ⏰ *Time:* ${sec.startTime}\n`;
          } else if (sec.timeOption === 'tbd') {
            msg += '   ⏰ *Time:* Will announce later\n';
          } else {
            if (sec.startTime && sec.endTime) {
              const [h1, m1] = sec.startTime.split(':');
              const [h2, m2] = sec.endTime.split(':');
              msg += `   ⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
            } else if (sec.startTime) {
              const [h, m] = sec.startTime.split(':');
              msg += `   ⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`;
            } else {
              msg += '   ⏰ *Time:* Will announce later\n';
            }
          }
          if (makeupStatus === 'online' || sec.mode === 'Online') msg += '   🏫 *Room:* Online\n';
          else if (sec.room) msg += `   🏫 *Room:* ${sec.room}\n`;
        });
      } else if (makeupStatus === 'custom') msg += `📝 *Note:* ${customMakeupText || 'Custom make-up details'}\n`;
      else msg += '📝 *Note:* No make-up class scheduled.\n';
      const groupedNotes = notes.reduce((acc, item) => {
        const isObject = typeof item === 'object' && item !== null;
        const text = isObject ? item.text : item;
        const type = isObject ? item.type : 'note';
        if (!acc[type]) acc[type] = [];
        acc[type].push(text);
        return acc;
      }, {});

      if (groupedNotes.instruction && groupedNotes.instruction.length > 0) {
        const label = groupedNotes.instruction.length > 1 ? '📋 *Instructions:*' : '📋 *Instruction:*';
        msg += `\n${label}\n`;
        groupedNotes.instruction.forEach(text => {
          msg += ` · *${text}*\n`;
        });
      }
      if (groupedNotes.important && groupedNotes.important.length > 0) {
        const label = '⚠️ *Important:*';
        msg += `\n${label}\n`;
        groupedNotes.important.forEach(text => {
          msg += ` · *${text}*\n`;
        });
      }
      if (groupedNotes.note && groupedNotes.note.length > 0) {
        const label = groupedNotes.note.length > 1 ? '📝 *Notes:*' : '📝 *Note:*';
        msg += `\n${label}\n`;
        groupedNotes.note.forEach(text => {
          msg += ` · *${text}*\n`;
        });
      }
      if (closingText) msg += `\n_${closingText}_`;
      return msg;
    }

    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;

    const hasSections = sections.some(sec => sec.name || sec.room || sec.startTime || sec.endTime || sec.timeOption === 'tbd' || sec.timeOption === 'custom');
    const firstSection = sections[0];
    const isSingleSection = sections.length === 1 && hasSections;

    if (isSingleSection && firstSection.name) {
      msg += `👥 *Section ${firstSection.name}*\n`;
    }

    if (selectedDate) {
      const eventDate = new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]);
      const day = String(eventDate.getDate()).padStart(2, '0');
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const year = String(eventDate.getFullYear()).substring(2);
      msg += `📅 *Date:* ${day}/${month}/${year} ${eventDate.toLocaleDateString('en-US', { weekday: 'long' })}\n`;
    }

    if (hasSections) {
      sections.forEach(sec => {
        if (!isSingleSection && sec.name) msg += `\n👥 *Section ${sec.name}*\n`;
        if (sec.timeOption === 'none') {
          // Omit time line
        } else if (sec.timeOption === 'custom') {
          if (sec.startTime) msg += `⏰ *Time:* ${sec.startTime}\n`;
        } else if (sec.timeOption === 'tbd') {
          msg += '⏰ *Time:* Will announce later\n';
        } else {
          if (sec.startTime && sec.endTime) {
            const [h1, m1] = sec.startTime.split(':');
            const [h2, m2] = sec.endTime.split(':');
            msg += `⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
          } else if (sec.startTime) {
            const [h, m] = sec.startTime.split(':');
            msg += `⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`;
          } else {
            msg += '⏰ *Time:* Will announce later\n';
          }
        }
        if (sec.mode === 'Online') msg += '🏫 *Room:* Online\n';
        else if (sec.room) msg += `🏫 *Room:* ${sec.room}\n`;
      });
    }

    if (topics.length > 0) {
      const labels = { quiz: 'Quiz Topics:', makeup_quiz: 'Quiz Topics:', exam: 'Exam Topics:', syllabus: 'Syllabus Details:', suggestion: 'Suggestions:', presentation: 'Presentation Topics:' };
      msg += `\n📝 *${labels[category] || 'Topics:'}*\n`;
      topics.forEach(t => msg += ` · *${t}*\n`);
    }

    // Group notes/instructions by type
    const groupedNotes = notes.reduce((acc, item) => {
      const isObject = typeof item === 'object' && item !== null;
      const text = isObject ? item.text : item;
      const type = isObject ? item.type : 'note';
      if (!acc[type]) acc[type] = [];
      acc[type].push(text);
      return acc;
    }, {});

    if (groupedNotes.instruction && groupedNotes.instruction.length > 0) {
      const label = groupedNotes.instruction.length > 1 ? '📋 *Instructions:*' : '📋 *Instruction:*';
      msg += `\n${label}\n`;
      groupedNotes.instruction.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (groupedNotes.important && groupedNotes.important.length > 0) {
      const label = '⚠️ *Important:*';
      msg += `\n${label}\n`;
      groupedNotes.important.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (groupedNotes.note && groupedNotes.note.length > 0) {
      const label = groupedNotes.note.length > 1 ? '📝 *Notes:*' : '📝 *Note:*';
      msg += `\n${label}\n`;
      groupedNotes.note.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (closingText) msg += `\n_${closingText}_`;
    return msg;
  })();

  const buildPayload = () => {
    const finalCategory = broadcastMode === 'share_file' ? 'share_file' : (broadcastMode === 'custom' ? 'custom' : category);
    const finalTitle = broadcastMode === 'share_file'
      ? (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)')
      : (title.trim() || (uploadedFiles[0] ? uploadedFiles[0].original_name : 'Shared File(s)'));
    return {
      title: finalTitle,
      content: broadcastMode === 'share_file' ? (fileCaption.trim() || 'Shared File(s)') : compiledMessage,
      category: finalCategory,
      course_id: (broadcastMode === 'share_file' || !selectedCourseId) ? null : parseInt(selectedCourseId),
      custom_room: (broadcastMode === 'share_file' || broadcastMode === 'custom') ? null : (sections[0]?.room || null),
      custom_time: null,
      file_id: uploadedFiles[0] ? uploadedFiles[0].id : null,
      file_ids: uploadedFiles.map(f => f.id),
      platform_ids: selectedPlatforms
    };
  };

  const fetchStorageUsage = async () => {
    try { const usage = await filesAPI.getStorageUsage(); setStorageUsage(usage); } catch (e) { console.error(e); }
  };

  const handleOpenLibrary = () => {
    setLibSelectedIds([]);
    setLibSearch('');
    setLibPage(1);
    setLibCurrentFolderId(null);
    setLibCurrentFolderName('');
    setShowLibraryModal(true);
  };

  const handleAttachFromLibrary = () => {
    const selectedFiles = libFiles.filter(f => libSelectedIds.includes(f.id));
    const newFiles = selectedFiles.filter(sf => !uploadedFiles.some(uf => uf.id === sf.id));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setShowLibraryModal(false);
    setLibSelectedIds([]);
    toast.success(`${newFiles.length} file(s) attached!`);
  };

  const fetchLibFolders = useCallback(async () => {
    setLibFoldersLoading(true);
    try {
      const folders = await filesAPI.listFolders();
      setLibFolders(folders);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load folders');
    } finally {
      setLibFoldersLoading(false);
    }
  }, []);

  const fetchLibFiles = useCallback(async () => {
    setLibLoading(true);
    try {
      const res = await filesAPI.list({
        page: libPage,
        limit: 30,
        search: libSearch || undefined,
        folderId: libCurrentFolderId || undefined
      });
      setLibFiles(res.files || []);
    } catch (err) {
      toast.error('Failed to load library files');
    } finally {
      setLibLoading(false);
    }
  }, [libPage, libSearch, libCurrentFolderId]);

  useEffect(() => {
    if (!showLibraryModal) return;
    fetchLibFiles();
  }, [showLibraryModal, fetchLibFiles]);

  useEffect(() => {
    if (showLibraryModal && libCurrentFolderId === null) {
      fetchLibFolders();
    }
  }, [showLibraryModal, libCurrentFolderId, fetchLibFolders]);

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
        const dupCheck = await filesAPI.checkDuplicate(f.name);
        let overwrite = false;
        if (dupCheck.duplicate) {
          overwrite = window.confirm(`"${f.name}" already exists. Overwrite?`);
          if (!overwrite) continue;
        }
        const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
        const record = await uploadFn(f, (pe) => setUploadProgress(Math.round((pe.loaded * 100) / pe.total)));
        setUploadedFiles(prev => [...prev, record]);
        toast.success(overwrite ? 'File overwritten!' : 'Attachment uploaded!');
        fetchStorageUsage();
      } catch (e) { toast.error(`Upload failed for "${f.name}": ${e.response?.data?.error || e.message}`); }
    }
    setUploading(false);
  };

  const removeAttachment = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('Attachment detached.');
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
      setNotes(prev => [
        ...prev.filter(n => (typeof n === 'object' ? n.text : n) !== tpl.content_template),
        { text: tpl.content_template, type: 'note' }
      ]);
    }
    toast.success(`Template "${tpl.name}" applied.`);
    setSelectedTemplate(templateId);
  };

  const handleGenerateAIDraft = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter what you want to announce.');
      return;
    }
    setAiDrafting(true);
    setGeneratedDraft('');
    try {
      const res = await announcementsAPI.draftAI(aiPrompt.trim(), category);
      setGeneratedDraft(res.draft);
      toast.success('Notice draft generated!');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Generation failed');
    } finally {
      setAiDrafting(false);
    }
  };

  const addSectionField = () => setSections(prev => [...prev, { name: '', startTime: '', endTime: '', room: '', mode: makeupStatus === 'online' ? 'Online' : 'Offline', timeOption: 'select' }]);
  const removeSectionField = (i) => { if (sections.length > 1) setSections(prev => prev.filter((_, idx) => idx !== i)); };
  const handleSectionChange = (i, field, val) => setSections(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });
  const addTopic = () => { if (currentTopic.trim()) { setTopics(prev => [...prev, currentTopic.trim()]); setCurrentTopic(''); } };
  const removeTopic = (i) => setTopics(prev => prev.filter((_, idx) => idx !== i));
  const addNote = () => { if (currentNote.trim()) { setNotes(prev => [...prev, { text: currentNote.trim(), type: noteType }]); setCurrentNote(''); } };
  const removeNote = (i) => setNotes(prev => prev.filter((_, idx) => idx !== i));
  const handleNoteTypeChange = (index, type) => {
    setNotes(prev => prev.map((note, idx) => {
      if (idx === index) {
        const isObj = typeof note === 'object' && note !== null;
        const text = isObj ? note.text : note;
        return { text, type };
      }
      return note;
    }));
  };

  const validateForm = () => {
    if (broadcastMode === 'share_file') {
      if (uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return false; }
    } else if (broadcastMode === 'custom') {
      if (!title.trim()) { toast.error('Please provide a notice title.'); return false; }
      if (!customText.trim()) { toast.error('Please write the notice body.'); return false; }
    } else {
      if (!title.trim() && uploadedFiles.length === 0) { toast.error('Please provide a title or upload a file.'); return false; }
    }
    if (selectedPlatforms.length === 0) { toast.error('Please select at least one channel.'); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (broadcastMode === 'share_file') {
      if (uploadedFiles.length === 0) { toast.error('Please upload at least one file.'); return; }
    } else if (broadcastMode === 'custom') {
      if (!title.trim()) { toast.error('Please provide a notice title.'); return; }
      if (!customText.trim()) { toast.error('Please write the notice body.'); return; }
    } else {
      if (!title.trim() && uploadedFiles.length === 0) { toast.error('Please provide a title or upload a file.'); return; }
    }
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
    const draft = { broadcastMode, titlePreset, title, category, selectedCourseId, selectedDate, sections, topics, notes, closingText, selectedPlatforms, uploadedFiles, makeupStatus, customMakeupText, fileCaption, customText };
    sessionStorage.setItem('announcement_draft', JSON.stringify(draft));
  }, [broadcastMode, titlePreset, title, category, selectedCourseId, selectedDate, sections, topics, notes, closingText, selectedPlatforms, uploadedFiles, makeupStatus, customMakeupText, fileCaption, customText]);

  useEffect(() => {
    if (!isEditMode && location.state) {
      if (location.state.preFillTitle) {
        setTitle(location.state.preFillTitle);
      }
      if (location.state.preFillBody) {
        setCustomText(location.state.preFillBody);
        setBroadcastMode('custom');
      }
      if (location.state.preFillCategory) {
        setCategory(location.state.preFillCategory);
      }
      if (location.state.preAttachedFiles) {
        setUploadedFiles(location.state.preAttachedFiles);
      }
    }
  }, [location.state, isEditMode]);

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
      const unavailableIds = platforms.filter(p => {
        const engineUnavailable = p.service_available === false || p.is_active === false;
        const needsPairing = !engineUnavailable && p.platform_type === 'whatsapp' && waStatus !== 'CONNECTED';
        return engineUnavailable || needsPairing;
      }).map(p => p.id);
      if (unavailableIds.length > 0) {
        setSelectedPlatforms(prev => {
          const filtered = prev.filter(id => !unavailableIds.includes(id));
          return filtered.length !== prev.length ? filtered : prev;
        });
      }
    }
  }, [platforms, waStatus]);

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
        if (ann.category === 'share_file') {
          setFileCaption(ann.content === 'Shared File(s)' ? '' : (ann.content || ''));
        } else {
          setFileCaption('');
        }
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

  // Auto-fill platforms from course defaults when course is selected
  useEffect(() => {
    if (!selectedCourseId || isEditMode) return;
    coursesAPI.get(parseInt(selectedCourseId)).then(fc => {
      if (fc.default_platform_ids && fc.default_platform_ids.length > 0) {
        // Filter to only include platforms that are currently available
        const availableDefaults = fc.default_platform_ids.filter(id => platforms.some(p => p.id === id));
        if (availableDefaults.length > 0) {
          setSelectedPlatforms(availableDefaults);
        }
      }
    }).catch(() => {});
  }, [selectedCourseId, platforms, isEditMode]);

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
    if (!selectedDay || currentCourseRoutines.length === 0) { setSections([{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }]); return; }
    const matched = currentCourseRoutines.filter(r => r.day_of_week.toLowerCase() === selectedDay.toLowerCase());
    if (matched.length > 0) setSections(matched.map(m => ({ name: m.section || '', startTime: m.start_time?.substring(0, 5) || '', endTime: m.end_time?.substring(0, 5) || '', room: m.room_number, mode: 'Offline', timeOption: m.start_time ? 'select' : 'tbd' })));
    else setSections([{ name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }]);
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
          <div className="flex gap-2 p-1 bg-canvas-soft border border-hairline rounded-sm w-fit mb-6">
            <button type="button" onClick={() => setBroadcastMode('notice')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'notice' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📢 Structured Notice</button>
            <button type="button" onClick={() => setBroadcastMode('custom')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'custom' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>✍️ Custom Text Notice</button>
            <button type="button" onClick={() => setBroadcastMode('share_file')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'share_file' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📎 Share File Only</button>
          </div>

          {broadcastMode === 'share_file' && (
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Message / Caption (Optional)</label>
              <textarea
                value={fileCaption}
                onChange={(e) => setFileCaption(e.target.value)}
                placeholder="Type an optional message to accompany the file(s)..."
                rows={4}
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150 resize-y min-h-[80px]"
              />
            </div>
          )}

          {broadcastMode === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Notice Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Makeup Class Announcement"
                    className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Target Course (Optional)</label>
                  <div className="custom-select-wrapper">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150"
                    >
                      <option value="">General Notice (No Course)</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_id} - {c.course_name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Notice Body *</span>
                  <button
                    type="button"
                    onClick={() => setShowAIModal(true)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-primary hover:text-primary-deep bg-primary/10 rounded-sm transition-all cursor-pointer border-none"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Draft with AI
                  </button>
                </label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Write your notice text here... Use *bold* for emphasis."
                  rows={8}
                  className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150 resize-y min-h-[150px] font-sans leading-relaxed"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-medium text-ink-mute flex items-center mr-1">Presets:</span>
                  {[
                    { label: '📝 Quiz Alert', title: 'Quiz Alert', body: `📝 *Quiz Alert*\n\n📚 *Course:* [Course Name]\n📅 *Date:* [Date]\n⏰ *Time:* [Time]\n📝 *Topics:* [Topics]\n\nPlease be prepared and attend on time. Good luck! 🍀📖` },
                    { label: '📁 Assignment Deadline', title: 'Assignment Deadline', body: `📁 *Assignment Deadline*\n\n📚 *Course:* [Course Name]\n📅 *Deadline:* [Date & Time]\n📋 *Instructions:* [Details]\n\nPlease submit on time.` },
                    { label: '📅 Class Rescheduled', title: 'Class Rescheduled', body: `📅 *Class Rescheduled Notice*\n\n📚 *Course:* [Course Name]\n⏰ *New Slot:* [Date, Time & Room]\n\nPlease adjust your schedule accordingly.` },
                    { label: '❌ Class Cancelled', title: 'Class Cancelled', body: `❌ *Class Cancellation Notice*\n\n📚 *Course:* [Course Name]\n📅 *Date:* [Date]\n\nClass is cancelled for today. Make-up schedule will be shared later.` }
                  ].map(preset => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        setTitle(preset.title);
                        setCustomText(preset.body);
                        toast.success(`Preset "${preset.title}" loaded`);
                      }}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-hairline bg-canvas hover:bg-canvas-soft text-ink-mute hover:text-ink transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { value: 'Quiz - 1', label: '📝 Quiz' },
                      { value: 'Class Cancelled', label: '❌ Cancel' },
                      { value: 'Assignment', label: '📁 Assignment' },
                      { value: 'Routine Change', label: '📅 Routine' },
                      { value: 'General Notice', label: '📣 General' }
                    ].map(btn => (
                      <button
                        key={btn.value}
                        type="button"
                        onClick={() => handlePresetChange(btn.value)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-all cursor-pointer ${
                          titlePreset === btn.value
                            ? 'bg-primary border-primary text-on-primary shadow-sm scale-102 font-semibold'
                            : 'bg-canvas hover:bg-canvas-soft border-hairline text-ink-mute hover:text-ink'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
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
                        <div className="w-full md:w-[10%]">
                          <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Section *</label></div>
                          <input type="text" required value={sec.name} onChange={(e) => handleSectionChange(idx, 'name', e.target.value)} placeholder="e.g. A" className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                        </div>
                        <div className="w-full md:w-[16%]">
                          <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Time Option</label></div>
                          <div className="custom-select-wrapper">
                            <select value={sec.timeOption || 'select'} onChange={(e) => {
                              const opt = e.target.value;
                              handleSectionChange(idx, 'timeOption', opt);
                              if (opt !== 'select' && opt !== 'custom') {
                                handleSectionChange(idx, 'startTime', '');
                                handleSectionChange(idx, 'endTime', '');
                              }
                            }} className="custom-select block w-full pl-2 pr-7 h-9 py-1.5 border border-hairline bg-canvas rounded-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink hover:border-hairline-strong transition-all duration-150">
                              <option value="select">⏱️ Set Time</option>
                              <option value="custom">✏️ Custom Text</option>
                              <option value="tbd">⏳ Not Decided</option>
                              <option value="none">❌ No Time</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute"><ChevronDown className="h-3.5 w-3.5" /></div>
                          </div>
                        </div>
                        {sec.timeOption === 'custom' ? (
                          <div className="w-full md:w-[36%]">
                            <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Custom Time Text</label></div>
                            <input type="text" value={sec.startTime || ''} onChange={(e) => handleSectionChange(idx, 'startTime', e.target.value)} placeholder="e.g. 11:30 AM (Tentative)" className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                          </div>
                        ) : (!sec.timeOption || sec.timeOption === 'select') ? (
                          <>
                            <div className="w-full md:w-[18%]">
                              <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Start Time</label></div>
                              <TimePicker value={sec.startTime || ''} onChange={(val) => handleSectionChange(idx, 'startTime', val)} placeholder="Start Time" className="text-xs" />
                            </div>
                            <div className="w-full md:w-[18%]">
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
                          </>
                        ) : (
                          <div className="w-full md:w-[36%]">
                            <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Timing Status</label></div>
                            <div className="w-full px-3 py-1.5 border border-dashed border-hairline bg-canvas-soft rounded-sm text-xs text-ink-mute h-9 flex items-center justify-center select-none font-medium">
                              {sec.timeOption === 'tbd' ? '⏳ Will announce later' : '❌ No time needed'}
                            </div>
                          </div>
                        )}
                        <div className="w-full md:w-[20%]">
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
                          <div className="w-full md:w-[18%]">
                            <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Room #</label></div>
                            <input type="text" value={sec.room} onChange={(e) => handleSectionChange(idx, 'room', e.target.value)} placeholder="e.g. 611" className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              {showTopics && (
                <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><ListPlus className="w-4 h-4 mr-1.5 text-primary" /> {category === 'syllabus' ? 'Syllabus Details' : category === 'suggestion' ? 'Suggestions' : 'Topics / Syllabus'}</h4>
                  <div className="flex gap-2">
                    <input type="text" value={currentTopic} onChange={(e) => setCurrentTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }} placeholder={category === 'syllabus' ? 'Type syllabus detail...' : category === 'suggestion' ? 'Type suggestion...' : 'Type topic and press Enter...'} className="w-full px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <button type="button" onClick={addTopic} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors">Add</button>
                  </div>
                  {topics.length > 0 && (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                      {topics.map((t, i) => (
                        <div key={i}
                          draggable
                          onDragStart={(e) => handleTopicDragStart(e, i)}
                          onDragOver={handleTopicDragOver}
                          onDrop={(e) => handleTopicDrop(e, i)}
                          className="flex items-center justify-between text-xs text-ink-secondary py-1.5 px-2 hover:bg-canvas-soft rounded-sm border border-transparent hover:border-hairline transition-all duration-150 cursor-move select-none">
                          <span className="truncate flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-ink-mute cursor-grab active:cursor-grabbing flex-shrink-0" />
                            <span className="truncate">• {t}</span>
                          </span>
                          <button type="button" onClick={() => removeTopic(i)} className="text-ink-mute hover:text-accent-tomato cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><StickyNote className="w-4 h-4 mr-1.5 text-primary" /> Instructions & Notes</h4>
                <div className="flex gap-2">
                  <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="px-2 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150">
                    <option value="note">Note</option>
                    <option value="instruction">Instruction</option>
                    <option value="important">Important</option>
                  </select>
                  <input type="text" value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }} placeholder="Add cover page / submit slides link..." className="flex-1 px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={addNote} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors">Add</button>
                </div>
                {notes.length > 0 && (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                    {notes.map((n, i) => {
                      const isObj = typeof n === 'object' && n !== null;
                      const text = isObj ? n.text : n;
                      const type = isObj ? n.type : 'note';
                      const typeLabel = type === 'instruction' ? 'Instruction' : type === 'important' ? 'Important' : 'Note';
                      const badgeColor = type === 'instruction' ? 'bg-primary/10 text-primary' : type === 'important' ? 'bg-accent-tomato/10 text-accent-tomato' : 'bg-accent-violet/10 text-accent-violet';
                      const BadgeIcon = type === 'instruction' ? BookOpen : type === 'important' ? AlertTriangle : StickyNote;
                      return (
                        <div key={i}
                          draggable
                          onDragStart={(e) => handleNoteDragStart(e, i)}
                          onDragOver={handleNoteDragOver}
                          onDrop={(e) => handleNoteDrop(e, i)}
                          className="flex items-center justify-between text-xs text-ink-secondary py-1.5 px-2 hover:bg-canvas-soft rounded-sm border border-transparent hover:border-hairline transition-all duration-150 cursor-move select-none">
                          <span className="truncate flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-ink-mute cursor-grab active:cursor-grabbing flex-shrink-0" />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  draggable={false}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase ${badgeColor} flex items-center gap-1 hover:brightness-95 cursor-pointer transition-all border-none focus:outline-none`}
                                >
                                  <BadgeIcon className="w-2.5 h-2.5" />
                                  {typeLabel}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-28 bg-canvas border border-hairline shadow-lg p-1 text-xs">
                                <DropdownMenuItem
                                  onSelect={() => handleNoteTypeChange(i, 'note')}
                                  onClick={() => handleNoteTypeChange(i, 'note')}
                                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"
                                >
                                  <StickyNote className="w-3.5 h-3.5 text-accent-violet" /> Note
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleNoteTypeChange(i, 'instruction')}
                                  onClick={() => handleNoteTypeChange(i, 'instruction')}
                                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Instruction
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleNoteTypeChange(i, 'important')}
                                  onClick={() => handleNoteTypeChange(i, 'important')}
                                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-accent-tomato" /> Important
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <span className="truncate">{text}</span>
                          </span>
                          <button
                            type="button"
                            draggable={false}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => removeNote(i)}
                            className="text-ink-mute hover:text-accent-tomato cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Closing / Remarks Text</label>
                <input type="text" value={closingText} onChange={(e) => setClosingText(e.target.value)} placeholder="Please be prepared and attend on time. Good luck! 🍀📖" className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink font-sans" />
              </div>
            </>
          )}

          <FileUploader fileInputRef={fileInputRef} uploadedFiles={uploadedFiles} uploading={uploading} uploadProgress={uploadProgress} dragActive={dragActive} onDrag={handleDrag} onDrop={handleDrop} onFileChange={handleFileChange} onRemove={removeAttachment} onChooseFromLibrary={handleOpenLibrary} />



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
              <div className={`rounded-lg p-3 max-w-[85%] text-xs font-sans relative flex flex-col ${previewTab === 'whatsapp' ? 'bg-[#005c4b] text-white self-end rounded-tr-none shadow-sm' : 'bg-[#182533] text-white self-start rounded-tl-none border border-slate-700 shadow-sm'}`}>
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
                {previewTab === 'telegram' && (
                  <div className="text-[10px] font-semibold text-[#5288c1] mb-1 select-none">CR Announcements</div>
                )}
                <div className="pb-4 leading-relaxed break-words text-[11px] font-sans" dangerouslySetInnerHTML={{ __html: formatMessageToHtml(compiledMessage || 'Your message preview will appear here...') }} />
                <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] text-zinc-300/80 select-none">
                  <span>9:41 AM</span>
                  {previewTab === 'whatsapp' ? (
                    <span className="text-[#53bdeb] font-bold">✓✓</span>
                  ) : (
                    <span className="text-[#5288c1] font-bold">✓</span>
                  )}
                </div>
              </div>
            </div>
            <div className="w-24 h-1 bg-zinc-600 rounded-full mx-auto mt-3.5"></div>
          </div>
          <button type="button" onClick={() => { navigator.clipboard.writeText(compiledMessage || ''); toast.success('Message copied!'); }} className="w-full flex items-center justify-center py-2.5 px-4 border-2 border-dashed border-primary/40 hover:border-primary rounded-sm text-sm font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer mt-4">
            <Clipboard className="w-4 h-4 mr-2" />Copy Message to Clipboard
          </button>
        </div>
      </div>

      {showConfirmModal && createPortal(
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
        </div>,
        document.body
      )}

      {showLibraryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-md font-semibold text-ink font-sans">Choose from Uploaded Files</h3>
              <button type="button" onClick={() => setShowLibraryModal(false)} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 border-b border-hairline">
              <input
                type="text"
                placeholder="Search uploaded files..."
                value={libSearch}
                onChange={(e) => { setLibSearch(e.target.value); setLibPage(1); }}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder-ink-mute/60 focus:outline-none focus:border-primary"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 min-h-[250px] space-y-2">
              {/* Breadcrumbs for navigated folder in modal */}
              {libCurrentFolderId !== null && (
                <div className="flex items-center gap-1.5 text-xs text-ink-mute font-sans bg-canvas-soft border border-hairline rounded px-2.5 py-1 mb-2.5 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setLibCurrentFolderId(null);
                      setLibCurrentFolderName('');
                      setLibPage(1);
                    }}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Root
                  </button>
                  <span>/</span>
                  <span className="font-semibold text-ink">{libCurrentFolderName}</span>
                </div>
              )}

              {/* Folders grid in modal when at Root */}
              {libCurrentFolderId === null && !libSearch && libFolders.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-[10px] font-semibold text-ink-mute uppercase tracking-wider font-sans">Folders</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {libFolders.map(folder => (
                      <div
                        key={folder.id}
                        onClick={() => {
                          setLibCurrentFolderId(folder.id);
                          setLibCurrentFolderName(folder.name);
                          setLibPage(1);
                        }}
                        className="flex items-center gap-2.5 p-2 bg-canvas border border-hairline hover:border-primary/40 hover:bg-canvas-soft rounded-sm cursor-pointer transition-all duration-150"
                      >
                        <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                          <FolderClosed className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink truncate block font-sans">{folder.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {libCurrentFolderId === null && !libSearch && libFolders.length > 0 && <h4 className="text-[10px] font-semibold text-ink-mute uppercase tracking-wider font-sans mt-4 mb-2">Files</h4>}

              {libLoading ? (
                <div className="flex justify-center items-center h-full py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
              ) : libFiles.length === 0 ? (
                <div className="text-center py-12 text-ink-mute text-sm">No files found.</div>
              ) : (
                <div className="space-y-2">
                  {libFiles.map(file => {
                    const isSelected = libSelectedIds.includes(file.id);
                    const isAlreadyAttached = uploadedFiles.some(f => f.id === file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isAlreadyAttached) return;
                          setLibSelectedIds(prev =>
                            prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                          );
                        }}
                        className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-colors ${
                          isAlreadyAttached 
                            ? 'bg-canvas-soft border-hairline opacity-60 cursor-not-allowed'
                            : isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-hairline hover:bg-canvas-soft'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            disabled={isAlreadyAttached}
                            checked={isAlreadyAttached || isSelected}
                            onChange={() => {}} 
                            className="accent-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink truncate">{file.original_name}</p>
                            <p className="text-xs text-ink-mute">
                              {(file.file_size / 1024).toFixed(1)} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handlePreview(file)}
                            className="p-1.5 text-ink-mute hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-sm transition-colors cursor-pointer"
                            title="Quick Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAlreadyAttached && (
                            <span className="text-[10px] font-bold text-ink-mute bg-hairline px-2 py-0.5 rounded-full shrink-0">Already Attached</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-hairline flex items-center justify-between bg-canvas-soft">
              <span className="text-xs text-ink-mute">{libSelectedIds.length} file(s) selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLibraryModal(false)} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft cursor-pointer">Cancel</button>
                <button
                  type="button"
                  onClick={handleAttachFromLibrary}
                  disabled={libSelectedIds.length === 0}
                  className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer disabled:opacity-50"
                >
                  Attach Selected
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Preview Modal */}
      {previewFile && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-canvas border border-hairline w-full max-w-4xl h-[85vh] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-hairline flex items-center justify-between bg-canvas">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-ink truncate font-sans">{previewFile.original_name}</h3>
                <p className="text-xs text-ink-mute font-sans">
                  {formatSize(previewFile.file_size)} • {previewFile.file_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewUrl(null);
                }}
                className="text-ink-mute hover:text-ink transition-colors p-1.5 hover:bg-canvas-soft rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 bg-canvas-soft flex items-center justify-center overflow-auto p-4">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-xs text-ink-mute font-sans">Loading preview...</p>
                </div>
              ) : previewUrl ? (
                <>
                  {previewFile.file_type?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={previewFile.original_name}
                      className="max-w-full max-h-full object-contain rounded shadow-md"
                    />
                  ) : previewFile.file_type === 'application/pdf' ? (
                    <iframe
                      src={`${previewUrl}#toolbar=0`}
                      title={previewFile.original_name}
                      className="w-full h-full border-0 rounded"
                    />
                  ) : (
                    previewFile.file_type?.includes('officedocument') ||
                    previewFile.file_type?.includes('ms-excel') ||
                    previewFile.file_type?.includes('ms-powerpoint') ||
                    previewFile.file_type?.includes('msword') ||
                    previewFile.original_name.endsWith('.docx') ||
                    previewFile.original_name.endsWith('.doc') ||
                    previewFile.original_name.endsWith('.xlsx') ||
                    previewFile.original_name.endsWith('.xls') ||
                    previewFile.original_name.endsWith('.pptx') ||
                    previewFile.original_name.endsWith('.ppt')
                  ) ? (
                    (previewUrl.includes('localhost') || previewUrl.includes('127.0.0.1')) ? (
                      <div className="text-center p-8 max-w-sm">
                        <File className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-ink font-sans mb-1">Local Preview Limitation</p>
                        <p className="text-xs text-ink-mute font-sans mb-4">Office documents (.docx, .xlsx, .pptx) cannot be previewed when running on localhost. Please download the file to view it.</p>
                        <a
                          href={previewUrl}
                          download={previewFile.original_name}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download to View
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                        title={previewFile.original_name}
                        className="w-full h-full border-0 rounded bg-canvas"
                      />
                    )
                  ) : (
                    previewFile.file_type?.startsWith('text/') ||
                    previewFile.original_name.toLowerCase().endsWith('.csv') ||
                    previewFile.original_name.toLowerCase().endsWith('.txt')
                  ) ? (
                    previewTextError ? (
                      <div className="text-center p-8 max-w-sm">
                        <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                        <p className="text-xs text-ink-mute font-sans mb-4">Could not load file content. Please download to view.</p>
                        <a
                          href={previewUrl}
                          download={previewFile.original_name}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download to View
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col bg-canvas border border-hairline rounded overflow-hidden shadow-inner">
                        <div className="overflow-auto flex-1 font-mono text-[11px] text-ink p-4 bg-canvas-soft select-text whitespace-pre-wrap leading-relaxed max-w-full text-left">
                          {previewTextContent || 'Loading content...'}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center p-8 max-w-sm">
                      <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                      <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                      <p className="text-xs text-ink-mute font-sans mb-4">This file type ({previewFile.file_type}) cannot be previewed directly in the browser.</p>
                      <a
                        href={previewUrl}
                        download={previewFile.original_name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download to View
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-mute font-sans">Failed to load preview.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAIModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-md font-semibold text-ink flex items-center gap-2 font-sans">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                Draft Notice with Gemini AI
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                  setAiPrompt('');
                  setGeneratedDraft('');
                }}
                className="text-ink-mute hover:text-ink cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  What would you like to announce?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Announce a quiz on Wednesday, June 17th, on chapter 4 of Database Management Systems. It will start at 10 AM in Room 602. Topics are SQL queries."
                  rows={4}
                  className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas hover:border-hairline-strong transition-all duration-150 resize-none"
                />
              </div>

              {generatedDraft && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider">
                    Generated Draft Preview
                  </label>
                  <div className="p-3 bg-canvas-soft border border-hairline rounded-sm text-sm text-ink font-sans whitespace-pre-wrap leading-relaxed select-text shadow-inner max-h-[220px] overflow-y-auto">
                    {generatedDraft}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-hairline flex items-center justify-between bg-canvas-soft">
              <span className="text-xs text-ink-mute">Powered by Gemini 1.5 Flash</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAIModal(false);
                    setAiPrompt('');
                    setGeneratedDraft('');
                  }}
                  className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft cursor-pointer bg-canvas"
                >
                  Cancel
                </button>
                {generatedDraft ? (
                  <>
                    <button
                      type="button"
                      onClick={handleGenerateAIDraft}
                      disabled={aiDrafting}
                      className="px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-sm text-sm font-medium transition-colors cursor-pointer bg-canvas"
                    >
                      {aiDrafting ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomText(generatedDraft);
                        const firstLine = generatedDraft.split('\n')[0];
                        if (firstLine.startsWith('📢')) {
                          const cleanTitle = firstLine.replace(/📢\s*\**\s*/, '').replace(/\**$/, '').trim();
                          if (cleanTitle) {
                            setTitle(cleanTitle);
                          }
                        }
                        setShowAIModal(false);
                        setAiPrompt('');
                        setGeneratedDraft('');
                        toast.success('Draft loaded into editor!');
                      }}
                      className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer"
                    >
                      Use Draft
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateAIDraft}
                    disabled={aiDrafting || !aiPrompt.trim()}
                    className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border-none"
                  >
                    {aiDrafting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-on-primary"></div>
                        Generating Notice...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Notice
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AnnouncementForm;
