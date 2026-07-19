interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

interface Section {
  name?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  timeOption?: string;
  mode?: string;
}

interface NoticeNote {
  text: string;
  type: string;
}

interface Notice {
  title?: string;
  category: string;
  selectedCourseId?: string;
  selectedDate?: string;
  sections: Section[];
  topics: string[];
  notes: (NoticeNote | string)[];
  makeupStatus?: string;
  customMakeupText?: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  quiz: '📝',
  makeup_quiz: '🔄',
  exam: '🎯',
  syllabus: '📚',
  suggestion: '💡',
  presentation: '📢',
  assignment: '📁',
  lab_report: '📊',
  lab_performance: '💪',
  class_cancel: '❌',
  notice: '📣'
};

export function compileSingleNotice(notice: Notice, courses: Course[]): string {
  const course = courses.find(c => c.id === parseInt(notice.selectedCourseId || '0'));
  const emoji = CATEGORY_EMOJIS[notice.category] || '📢';
  const cleanTitle = notice.title?.trim() || 'Title';
  let msg = `${emoji} *${cleanTitle}*\n\n`;
  if (notice.category === 'class_cancel') {
    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;
    const sectionNames = notice.sections.map(sec => sec.name).filter(Boolean);
    if (sectionNames.length > 0) msg += `👥 *Section ${sectionNames.join(', ')}*\n`;
    const [yearStr, monthStr, dayStr] = (notice.selectedDate || '').split('-');
    const eventDate = yearStr ? new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr)) : new Date();
    const day = String(eventDate.getDate()).padStart(2, '0');
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const year = String(eventDate.getFullYear()).substring(2);
    const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n\n❌ *Status:* Class Cancelled\n\n`;
    if (notice.makeupStatus === 'later') msg += '📝 *Note:* Make-up class time will be shared later.\n';
    else if (notice.makeupStatus === 'rescheduled' || notice.makeupStatus === 'online') {
      msg += `📝 *Note:* ${notice.makeupStatus === 'online' ? 'Class will be held Online' : 'Rescheduled to new slot'}:\n`;
      notice.sections.forEach(sec => {
        if (sec.name) msg += ` · Section ${sec.name}:\n`;
        if (sec.timeOption === 'none') { /* no time info */ }
        else if (sec.timeOption === 'custom') { if (sec.startTime) msg += `   ⏰ *Time:* ${sec.startTime}\n`; }
        else if (sec.timeOption === 'tbd') { msg += '   ⏰ *Time:* Will announce later\n'; }
        else {
          if (sec.startTime && sec.endTime) {
            const [h1, m1] = sec.startTime.split(':'); const [h2, m2] = sec.endTime.split(':');
            msg += `   ⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
          } else if (sec.startTime) { const [h, m] = sec.startTime.split(':'); msg += `   ⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`; }
          else { msg += '   ⏰ *Time:* Will announce later\n'; }
        }
        if (notice.makeupStatus === 'online' || sec.mode === 'Online') msg += '   🏫 *Room:* Online\n';
        else if (sec.room) msg += `   🏫 *Room:* ${sec.room}\n`;
      });
    } else if (notice.makeupStatus === 'custom') msg += `📝 *Note:* ${notice.customMakeupText || 'Custom make-up details'}\n`;
    else msg += '📝 *Note:* No make-up class scheduled.\n';
    const groupedNotes = notice.notes.reduce((acc: Record<string, string[]>, item) => {
      const isObject = typeof item === 'object' && item !== null;
      const text = isObject ? (item as NoticeNote).text : (item as string);
      const type = isObject ? (item as NoticeNote).type : 'note';
      if (!acc[type]) acc[type] = []; acc[type].push(text); return acc;
    }, {} as Record<string, string[]>);
    if (groupedNotes.instruction && groupedNotes.instruction.length > 0) { const label = groupedNotes.instruction.length > 1 ? '📋 *Instructions:*' : '📋 *Instruction:*'; msg += `\n${label}\n`; groupedNotes.instruction.forEach(text => { msg += ` · *${text}*\n`; }); }
    if (groupedNotes.important && groupedNotes.important.length > 0) { msg += '\n⚠️ *Important:*\n'; groupedNotes.important.forEach(text => { msg += ` · *${text}*\n`; }); }
    if (groupedNotes.note && groupedNotes.note.length > 0) { const label = groupedNotes.note.length > 1 ? '📝 *Notes:*' : '📝 *Note:*'; msg += `\n${label}\n`; groupedNotes.note.forEach(text => { msg += ` · *${text}*\n`; }); }
    return msg;
  }
  if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n`;
  const hasSections = notice.sections.some(sec => sec.name || sec.room || sec.startTime || sec.endTime || sec.timeOption === 'tbd' || sec.timeOption === 'custom');
  const firstSection = notice.sections[0];
  const isSingleSection = notice.sections.length === 1 && hasSections;
  if (isSingleSection && firstSection?.name) msg += `👥 *Section ${firstSection.name}*\n`;
  const isAssignment = notice.category === 'assignment' || notice.category === 'lab_report';
  const dateLabel = isAssignment ? 'Deadline' : 'Date';
  if (notice.selectedDate) {
    const [yearStr, monthStr, dayStr] = notice.selectedDate.split('-');
    const eventDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    msg += `📅 *${dateLabel}:* ${String(eventDate.getDate()).padStart(2, '0')}/${String(eventDate.getMonth() + 1).padStart(2, '0')}/${String(eventDate.getFullYear()).substring(2)} ${eventDate.toLocaleDateString('en-US', { weekday: 'long' })}\n`;
  }
  if (hasSections) {
    notice.sections.forEach(sec => {
      if (!isSingleSection && sec.name) msg += `\n👥 *Section ${sec.name}*\n`;
      if (sec.timeOption === 'none') { /* no time info */ }
      else if (sec.timeOption === 'custom') { if (sec.startTime) msg += `⏰ *Time:* ${sec.startTime}\n`; }
      else if (sec.timeOption === 'tbd') { msg += '⏰ *Time:* Will announce later\n'; }
      else {
        if (sec.startTime && sec.endTime) {
          const [h1, m1] = sec.startTime.split(':'); const [h2, m2] = sec.endTime.split(':');
          msg += `⏰ *Time:* ${parseInt(h1) % 12 || 12}:${m1} ${parseInt(h1) >= 12 ? 'PM' : 'AM'} – ${parseInt(h2) % 12 || 12}:${m2} ${parseInt(h2) >= 12 ? 'PM' : 'AM'}\n`;
        } else if (sec.startTime) { const [h, m] = sec.startTime.split(':'); msg += `⏰ *Time:* ${parseInt(h) % 12 || 12}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}\n`; }
        else { msg += '⏰ *Time:* Will announce later\n'; }
      }
      if (sec.mode === 'Online') msg += '🏫 *Room:* Online\n';
      else if (sec.room) msg += `🏫 *Room:* ${sec.room}\n`;
    });
  }
  if (notice.topics.length > 0) {
    const labels: Record<string, string> = { 
      quiz: 'Quiz Topics:', 
      makeup_quiz: 'Quiz Topics:', 
      exam: 'Exam Topics:', 
      syllabus: 'Syllabus Details:', 
      suggestion: 'Suggestions:', 
      presentation: 'Presentation Topics:',
      assignment: 'Assignment Topic(s):',
      lab_report: 'Report Topic(s):'
    };
    msg += `\n📝 *${labels[notice.category] || 'Topics:'}*\n`;
    notice.topics.forEach(t => msg += ` · *${t}*\n`);
  }
  const groupedNotes = notice.notes.reduce((acc: Record<string, string[]>, item) => {
    const isObject = typeof item === 'object' && item !== null;
    const text = isObject ? (item as NoticeNote).text : (item as string);
    const type = isObject ? (item as NoticeNote).type : 'note';
    if (!acc[type]) acc[type] = []; acc[type].push(text); return acc;
  }, {} as Record<string, string[]>);
  if (groupedNotes.instruction && groupedNotes.instruction.length > 0) { const label = groupedNotes.instruction.length > 1 ? '📋 *Instructions:*' : '📋 *Instruction:*'; msg += `\n${label}\n`; groupedNotes.instruction.forEach(text => { msg += ` · *${text}*\n`; }); }
  if (groupedNotes.important && groupedNotes.important.length > 0) { msg += '\n⚠️ *Important:*\n'; groupedNotes.important.forEach(text => { msg += ` · *${text}*\n`; }); }
  if (groupedNotes.note && groupedNotes.note.length > 0) { const label = groupedNotes.note.length > 1 ? '📝 *Notes:*' : '📝 *Note:*'; msg += `\n${label}\n`; groupedNotes.note.forEach(text => { msg += ` · *${text}*\n`; }); }
  return msg;
}

interface CompileMessageInput {
  notices: Notice[];
  broadcastMode: string;
  customText: string;
  fileCaption: string;
  closingText: string;
  courses: Course[];
}

export function getCompiledMessage({ notices, broadcastMode, customText, fileCaption, closingText, courses }: CompileMessageInput): string {
  if (broadcastMode === 'custom') {
    let msg = '';
    const titleVal = notices[0]?.title?.trim();
    if (titleVal) msg += `📢 *${titleVal}*\n\n`;
    const course = courses.find(c => c.id === parseInt(notices[0]?.selectedCourseId || '0'));
    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}${course.course_id.toLowerCase().includes('lab') && !course.course_name.toLowerCase().includes('lab') ? ' Lab' : ''}\n\n`;
    msg += customText;
    return msg;
  }
  if (broadcastMode === 'share_file') return fileCaption;
  let lastCourseId: string | null = null;
  let parts: string[] = [];
  for (const n of notices) {
    let compiled = compileSingleNotice(n, courses);
    const currentCourseId = n.selectedCourseId || null;
    if (currentCourseId && currentCourseId === lastCourseId) {
      compiled = compiled.replace(/^📚 \*Course:\* .+\n/m, '');
    }
    lastCourseId = currentCourseId;
    parts.push(compiled);
  }
  let msg = parts.join('\n━━━━━━━━━━━━━━━━━━━━\n\n');
  if (closingText) msg += `\n_${closingText}_`;
  return msg;
}
