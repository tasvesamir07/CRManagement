const formatTime12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

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

const groupNotes = (notes) => notes.reduce((acc, item) => {
  const isObject = typeof item === 'object' && item !== null;
  const text = isObject ? item.text : item;
  const type = isObject ? item.type : 'note';
  if (!acc[type]) acc[type] = [];
  acc[type].push(text);
  return acc;
}, {});

export const compileMessage = ({
  broadcastMode, title, category, selectedCourseId, courses,
  sections, topics, selectedDate, makeupStatus, customMakeupText,
  notes, closingText
}) => {
  const appendSectionTime = (result, sec) => {
    let r = result;
    if (sections.length > 1 && sec.name) r += ` · Section ${sec.name}:\n`;
    if (sec.timeOption === 'none') {
      // Omit time line
    } else if (sec.timeOption === 'custom') {
      if (sec.startTime) r += `   ⏰ *Time:* ${sec.startTime}\n`;
    } else if (sec.timeOption === 'tbd') {
      r += '   ⏰ *Time:* Will announce later\n';
    } else {
      if (sec.startTime && sec.endTime) r += `   ⏰ *Time:* ${formatTime12(sec.startTime)} – ${formatTime12(sec.endTime)}\n`;
      else if (sec.startTime) r += `   ⏰ *Time:* ${formatTime12(sec.startTime)}\n`;
      else r += '   ⏰ *Time:* Will announce later\n';
    }
    if (sec.mode === 'Online') r += '   🏫 *Room:* Online\n';
    else if (sec.room) r += `   🏫 *Room:* ${sec.room}\n`;
    return r;
  };

  const appendNotesGroup = (result, groupedNotes) => {
    let r = result;
    if (groupedNotes.instruction?.length > 0) {
      const label = groupedNotes.instruction.length > 1 ? '📋 *Instructions:*' : '📋 *Instruction:*';
      r += `\n${label}\n`;
      groupedNotes.instruction.forEach(text => { r += ` · *${text}*\n`; });
    }
    if (groupedNotes.important?.length > 0) {
      r += '\n⚠️ *Important:*\n';
      groupedNotes.important.forEach(text => { r += ` · *${text}*\n`; });
    }
    if (groupedNotes.note?.length > 0) {
      const label = groupedNotes.note.length > 1 ? '📝 *Notes:*' : '📝 *Note:*';
      r += `\n${label}\n`;
      groupedNotes.note.forEach(text => { r += ` · *${text}*\n`; });
    }
    return r;
  };

  if (broadcastMode === 'share_file') return '';
  const course = courses.find(c => c.id === parseInt(selectedCourseId));
  let msg = title.trim() ? `📢 *${title}*\n\n` : '📢 *Title*\n\n';

  if (category === 'class_cancel') {
    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}\n`;
    const sectionNames = sections.map(sec => sec.name).filter(Boolean);
    if (sectionNames.length > 0) msg += `👥 *Section ${sectionNames.join(', ')}*\n`;
    const eventDate = selectedDate
      ? new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2])
      : new Date();
    const day = String(eventDate.getDate()).padStart(2, '0');
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const year = String(eventDate.getFullYear()).substring(2);
    const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n\n❌ *Status:* Class Cancelled\n\n`;
    if (makeupStatus === 'later') msg += '📝 *Note:* Make-up class time will be shared later.\n';
    else if (makeupStatus === 'rescheduled') {
      msg += '📝 *Note:* Rescheduled to new slot:\n';
      sections.forEach(sec => { msg = appendSectionTime(msg, sec); });
    } else if (makeupStatus === 'online') {
      msg += '📝 *Note:* Class will be held Online:\n';
      sections.forEach(sec => {
        msg = appendSectionTime(msg, sec);
        msg += '   🏫 *Room:* Online\n';
      });
    } else if (makeupStatus === 'custom') {
      msg += `📝 *Note:* ${customMakeupText || 'Custom make-up details'}\n`;
    } else {
      msg += '📝 *Note:* No make-up class scheduled.\n';
    }
    msg = appendNotesGroup(msg, groupNotes(notes));
    if (closingText) msg += `\n_${closingText}_`;
    return msg;
  }

  if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}\n`;

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
    const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n`;
  }

  if (hasSections) {
    sections.forEach(sec => {
      if (!isSingleSection && sec.name) msg += `\n👥 *Section ${sec.name}*\n`;
      msg = appendSectionTime(msg, sec);
    });
  }

  if (topics.length > 0) {
    const labels = { quiz: 'Quiz Topics:', makeup_quiz: 'Quiz Topics:', exam: 'Exam Topics:', syllabus: 'Syllabus Details:', suggestion: 'Suggestions:', presentation: 'Presentation Topics:' };
    msg += `\n📝 *${labels[category] || 'Topics:'}*\n`;
    topics.forEach(t => msg += ` · *${t}*\n`);
  }

  msg = appendNotesGroup(msg, groupNotes(notes));
  if (closingText) msg += `\n_${closingText}_`;
  return msg;
};
