interface PresetDef {
  category: string;
  topicLabel: string;
}

interface PresetEntry {
  value: string;
  label: string;
}

interface CategoryEntry {
  value: string;
  label: string;
}

export const PRESET_DEFS: Record<string, PresetDef> = {
  'Quiz - 1': { category: 'quiz', topicLabel: 'Quiz Topics:' },
  'Quiz - 2': { category: 'quiz', topicLabel: 'Quiz Topics:' },
  'Quiz - 3': { category: 'quiz', topicLabel: 'Quiz Topics:' },
  'Quiz - 4': { category: 'quiz', topicLabel: 'Quiz Topics:' },
  'Makeup quiz': { category: 'makeup_quiz', topicLabel: 'Quiz Topics:' },
  'Lab Final': { category: 'exam', topicLabel: 'Exam Topics:' },
  'Mid Term Syllabus': { category: 'syllabus', topicLabel: 'Syllabus Details:' },
  'Final Term Syllabus': { category: 'syllabus', topicLabel: 'Syllabus Details:' },
  'Mid Term Suggestion': { category: 'suggestion', topicLabel: 'Suggestions:' },
  'Final Term Suggestion': { category: 'suggestion', topicLabel: 'Suggestions:' },
  'Presentation': { category: 'presentation', topicLabel: 'Presentation Topics:' },
  'Assignment': { category: 'assignment', topicLabel: '' },
  'Lab Report': { category: 'lab_report', topicLabel: '' },
  'Lab Assignment': { category: 'assignment', topicLabel: '' },
  'Lab Performance Notice': { category: 'lab_performance', topicLabel: '' },
  'Class Reminder': { category: 'notice', topicLabel: '' },
  'Routine Change': { category: 'notice', topicLabel: '' },
  'Class Cancelled': { category: 'class_cancel', topicLabel: '' },
  'General Notice': { category: 'notice', topicLabel: '' }
};

const CATEGORY_EMOJIS: Record<string, string> = {
  quiz: '📝', makeup_quiz: '🔄', exam: '🎯', syllabus: '📚',
  suggestion: '💡', presentation: '📢', assignment: '📁',
  lab_report: '📊', lab_performance: '💪', class_cancel: '❌', notice: '📣'
};

export const TITLE_PRESETS: PresetEntry[] = [
  ...Object.entries(PRESET_DEFS).map(([value, def]) => ({
    value, label: `${CATEGORY_EMOJIS[def.category] || '📢'} ${value}`
  })),
  { value: 'Custom', label: '✏️ Custom (Type below)...' }
];

export const CATEGORIES: CategoryEntry[] = [
  { value: 'quiz', label: '📝 Quiz' },
  { value: 'makeup_quiz', label: '🔄 Makeup Quiz' },
  { value: 'exam', label: '🎯 Exam / Lab Final' },
  { value: 'syllabus', label: '📚 Syllabus' },
  { value: 'suggestion', label: '💡 Suggestion' },
  { value: 'presentation', label: '📢 Presentation' },
  { value: 'assignment', label: '📁 Assignment' },
  { value: 'lab_report', label: '📊 Lab Report' },
  { value: 'lab_performance', label: '💻 Lab Performance' },
  { value: 'class_cancel', label: '❌ Class Cancellation' },
  { value: 'notice', label: '📣 General Notice' }
];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
