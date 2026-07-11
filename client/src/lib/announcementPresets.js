export const PRESET_DEFS = {
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

const CATEGORY_EMOJIS = {
  quiz: '📝', makeup_quiz: '🔄', exam: '🎯', syllabus: '📚',
  suggestion: '💡', presentation: '📢', assignment: '📁',
  lab_report: '📊', lab_performance: '💪', class_cancel: '❌', notice: '📣'
};

export const TITLE_PRESETS = Object.entries(PRESET_DEFS).map(([value, def]) => ({
  value,
  label: `${CATEGORY_EMOJIS[def.category] || '📢'} ${value}`
}));
TITLE_PRESETS.push({ value: 'Custom', label: '✏️ Custom (Type below)...' });

export const formatMessageToHtml = (text) => {
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

export const formatSize = (bytes) => {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const getFileIcon = (type) => {
  if (type?.startsWith('image/')) return 'image';
  if (type?.includes('pdf')) return 'pdf';
  if (type?.includes('zip') || type?.includes('rar') || type?.includes('tar') || type?.includes('7z')) return 'archive';
  return 'file';
};
