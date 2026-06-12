import React from 'react';
import { Plus, X } from 'lucide-react';

const PRESET_DEFS = {
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

const TITLE_PRESETS = Object.entries(PRESET_DEFS).map(([value, def]) => {
  const emojis = {
    quiz: '📝', makeup_quiz: '🔄', exam: '🎯', syllabus: '📚',
    suggestion: '💡', presentation: '📢', assignment: '📁',
    lab_report: '📊', lab_performance: '💪', class_cancel: '❌', notice: '📣'
  };
  return { value, label: `${emojis[def.category] || '📢'} ${value}` };
});
TITLE_PRESETS.push({ value: 'Custom', label: '✏️ Custom (Type below)...' });

const CATEGORIES = [
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MessageBuilder({
  category, setCategory,
  titlePreset, setTitlePreset,
  title, setTitle,
  selectedCourseId, courses,
  broadcastMode,
  sections, setSections,
  topics, setTopics, currentTopic, setCurrentTopic,
  notes, setNotes, currentNote, setCurrentNote,
  closingText, setClosingText,
  selectedDate, setSelectedDate,
  selectedDay, setSelectedDay,
  makeupStatus, setMakeupStatus,
  customMakeupText, setCustomMakeupText,
  showTopics, currentCourseRoutines,
}) {
  const [noteType, setNoteType] = React.useState('note');
  const handlePresetChange = (presetValue) => {
    setTitlePreset(presetValue);
    if (presetValue !== 'Custom') {
      setTitle(presetValue);
      const def = PRESET_DEFS[presetValue];
      if (def) {
        setCategory(def.category);
        if (def.category === 'class_cancel') setMakeupStatus('later');
      }
    } else {
      setTitle('');
    }
  };

  const addSection = () => setSections(prev => [...prev, { name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }]);
  const removeSection = (i) => { if (sections.length > 1) setSections(prev => prev.filter((_, idx) => idx !== i)); };
  const updateSection = (i, field, val) => setSections(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });

  const addTopic = () => { if (currentTopic.trim()) { setTopics(prev => [...prev, currentTopic.trim()]); setCurrentTopic(''); } };
  const removeTopic = (i) => setTopics(prev => prev.filter((_, idx) => idx !== i));
  const addNote = () => { if (currentNote.trim()) { setNotes(prev => [...prev, { text: currentNote.trim(), type: noteType }]); setCurrentNote(''); } };
  const removeNote = (i) => setNotes(prev => prev.filter((_, idx) => idx !== i));

  const formatTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const compileMessage = () => {
    if (broadcastMode === 'share_file') return '';
    const course = courses.find(c => c.id === parseInt(selectedCourseId));
    let msg = title.trim() ? `📢 *${title}*\n\n` : '📢 *Title*\n\n';

    if (category === 'class_cancel') {
      const sectionNames = sections.map(sec => sec.name).filter(Boolean);
      if (sectionNames.length > 0) {
        msg += `*Section ${sectionNames.join(', ')}*\n`;
      }
      if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}\n`;
      const eventDate = selectedDate ? new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]) : new Date();
      const day = String(eventDate.getDate()).padStart(2, '0');
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const year = String(eventDate.getFullYear()).substring(2);
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
      msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n\n`;
      msg += '❌ *Status:* Class Cancelled\n\n';
      if (makeupStatus === 'later') msg += '📝 *Note:* Make-up class time will be shared later.\n';
      else if (makeupStatus === 'rescheduled') {
        msg += '📝 *Note:* Rescheduled to new slot:\n';
        sections.forEach(sec => {
          if (sections.length > 1 && sec.name) msg += ` · Section ${sec.name}:\n`;
          if (sec.timeOption === 'none') {
            // Omit time line
          } else if (sec.timeOption === 'tbd') {
            msg += '   ⏰ *Time:* Will announce later\n';
          } else {
            if (sec.startTime && sec.endTime) msg += `   ⏰ *Time:* ${formatTime12(sec.startTime)} – ${formatTime12(sec.endTime)}\n`;
            else if (sec.startTime) msg += `   ⏰ *Time:* ${formatTime12(sec.startTime)}\n`;
            else msg += '   ⏰ *Time:* Will announce later\n';
          }
          if (sec.mode === 'Online') msg += '   🏫 *Room:* Online\n';
          else if (sec.room) msg += `   🏫 *Room:* ${sec.room}\n`;
        });
      } else if (makeupStatus === 'online') {
        msg += '📝 *Note:* Class will be held Online:\n';
        sections.forEach(sec => {
          if (sections.length > 1 && sec.name) msg += ` · Section ${sec.name}:\n`;
          if (sec.timeOption === 'none') {
            // Omit time line
          } else if (sec.timeOption === 'tbd') {
            msg += '   ⏰ *Time:* Will announce later\n';
          } else {
            if (sec.startTime && sec.endTime) msg += `   ⏰ *Time:* ${formatTime12(sec.startTime)} – ${formatTime12(sec.endTime)}\n`;
            else if (sec.startTime) msg += `   ⏰ *Time:* ${formatTime12(sec.startTime)}\n`;
            else msg += '   ⏰ *Time:* Will announce later\n';
          }
          msg += '   🏫 *Room:* Online\n';
        });
      } else if (makeupStatus === 'custom') {
        msg += `📝 *Note:* ${customMakeupText || 'Custom make-up details'}\n`;
      } else {
        msg += '📝 *Note:* No make-up class scheduled.\n';
      }
      notes.forEach(n => {
        const text = typeof n === 'object' && n !== null ? n.text : n;
        msg += ` · *${text}*\n`;
      });
      if (closingText) msg += `\n_${closingText}_`;
      return msg;
    }

    const sectionNames = sections.map(sec => sec.name).filter(Boolean);
    if (sectionNames.length > 0) {
      msg += `*Section ${sectionNames.join(', ')}*\n`;
    }
    if (course) msg += `📚 *Course:* ${course.course_id} ${course.course_name}\n`;
    if (selectedDate) {
      const eventDate = new Date(selectedDate.split('-')[0], selectedDate.split('-')[1] - 1, selectedDate.split('-')[2]);
      const day = String(eventDate.getDate()).padStart(2, '0');
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const year = String(eventDate.getFullYear()).substring(2);
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
      msg += `📅 *Date:* ${day}/${month}/${year} ${dayName}\n`;
    }

    const hasSections = sections.some(sec => sec.name || sec.room || sec.startTime || sec.endTime || sec.timeOption === 'tbd');
    if (hasSections) {
      sections.forEach(sec => {
        if (sections.length > 1 && sec.name) msg += `\n*Section ${sec.name}*\n`;
        if (sec.timeOption === 'none') {
          // Omit time line
        } else if (sec.timeOption === 'tbd') {
          msg += '⏰ *Time:* Will announce later\n';
        } else {
          if (sec.startTime && sec.endTime) msg += `⏰ *Time:* ${formatTime12(sec.startTime)} – ${formatTime12(sec.endTime)}\n`;
          else if (sec.startTime) msg += `⏰ *Time:* ${formatTime12(sec.startTime)}\n`;
          else msg += '⏰ *Time:* Will announce later\n';
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
      const label = groupedNotes.instruction.length > 1 ? '*Instructions:*' : '*Instruction:*';
      msg += `\n${label}\n`;
      groupedNotes.instruction.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (groupedNotes.important && groupedNotes.important.length > 0) {
      const label = '*Important:*';
      msg += `\n${label}\n`;
      groupedNotes.important.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (groupedNotes.note && groupedNotes.note.length > 0) {
      const label = groupedNotes.note.length > 1 ? '*Notes:*' : '*Note:*';
      msg += `\n${label}\n`;
      groupedNotes.note.forEach(text => {
        msg += ` · *${text}*\n`;
      });
    }
    if (closingText) msg += `\n_${closingText}_`;
    return msg;
  };

  const preview = compileMessage();

  return (
    <div className="space-y-6">
      {/* Preset selector */}
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notice Preset Type</label>
        <select value={titlePreset} onChange={e => handlePresetChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink focus:outline-none focus:border-primary">
          {TITLE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Custom title input */}
      {titlePreset === 'Custom' && (
        <div>
          <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notice Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Type your notice title..."
            className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink focus:outline-none focus:border-primary">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-ink-mute uppercase tracking-wider">Time & Room</label>
          <button type="button" onClick={addSection} className="text-xs text-primary hover:underline cursor-pointer">+ Add Section</button>
        </div>
        {sections.map((sec, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 p-3 border border-hairline rounded-sm">
            <input type="text" placeholder="Section" value={sec.name} onChange={e => updateSection(i, 'name', e.target.value)}
              className="flex-1 min-w-[80px] px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" />
            <select value={sec.timeOption || 'select'} onChange={(e) => {
              const opt = e.target.value;
              updateSection(i, 'timeOption', opt);
              if (opt !== 'select') {
                updateSection(i, 'startTime', '');
                updateSection(i, 'endTime', '');
              }
            }} className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary">
              <option value="select">⏱️ Set Time</option>
              <option value="tbd">⏳ Not Decided</option>
              <option value="none">❌ No Time</option>
            </select>
            {(!sec.timeOption || sec.timeOption === 'select') ? (
              <>
                <input type="time" value={sec.startTime} onChange={e => updateSection(i, 'startTime', e.target.value)}
                  className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary w-[100px]" />
                <span className="text-xs text-ink-mute">—</span>
                <input type="time" value={sec.endTime} onChange={e => updateSection(i, 'endTime', e.target.value)}
                  className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary w-[100px]" />
              </>
            ) : (
              <span className="px-2 py-1.5 text-xs text-ink-mute border border-dashed border-hairline bg-canvas-soft rounded-sm">
                {sec.timeOption === 'tbd' ? 'Will announce later' : 'No time needed'}
              </span>
            )}
            <input type="text" placeholder="Room" value={sec.room} onChange={e => updateSection(i, 'room', e.target.value)}
              className="flex-1 min-w-[80px] px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" />
            <select value={sec.mode} onChange={e => updateSection(i, 'mode', e.target.value)}
              className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary">
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
            </select>
            {sections.length > 1 && (
              <button type="button" onClick={() => removeSection(i)} className="p-1 text-ink-mute hover:text-accent-tomato cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ))}
      </div>

      {/* Topics */}
      {showTopics && (
        <div>
          <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Topics</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={currentTopic} onChange={e => setCurrentTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
              placeholder="Add a topic..."
              className="flex-1 px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
            <button type="button" onClick={addTopic} className="px-3 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep cursor-pointer"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-ink text-xs rounded-sm">
                {t}
                <button type="button" onClick={() => removeTopic(i)} className="text-ink-mute hover:text-accent-tomato cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notes / Instructions</label>
        <div className="flex gap-2 mb-2">
          <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="px-2 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="note">Note</option>
            <option value="instruction">Instruction</option>
            <option value="important">Important</option>
          </select>
          <input type="text" value={currentNote} onChange={e => setCurrentNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
            placeholder="Add a note..."
            className="flex-1 px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
          <button type="button" onClick={addNote} className="px-3 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep cursor-pointer"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {notes.map((n, i) => {
            const isObj = typeof n === 'object' && n !== null;
            const text = isObj ? n.text : n;
            const type = isObj ? n.type : 'note';
            const typeLabel = type === 'instruction' ? 'Instruction' : type === 'important' ? 'Important' : 'Note';
            const badgeColor = type === 'instruction' ? 'bg-primary/10 text-primary' : type === 'important' ? 'bg-accent-tomato/10 text-accent-tomato' : 'bg-accent-violet/10 text-accent-violet';
            return (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 ${badgeColor} text-xs rounded-sm`}>
                <span className="font-bold text-[10px] uppercase mr-0.5">{typeLabel}:</span>
                {text}
                <button type="button" onClick={() => removeNote(i)} className="text-ink-mute hover:text-accent-tomato cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Closing Text */}
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Closing Text (Optional)</label>
        <input type="text" value={closingText} onChange={e => setClosingText(e.target.value)}
          placeholder="e.g. Please be prepared and attend on time. Good luck! 🍀📖"
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
      </div>

      {/* Makeup status */}
      {category === 'class_cancel' && (
        <div>
          <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Make-up Class Status</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'later', label: 'TBD Later' },
              { value: 'rescheduled', label: 'Rescheduled' },
              { value: 'online', label: 'Online' },
              { value: 'custom', label: 'Custom' },
              { value: 'none', label: 'No Make-up' }
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => setMakeupStatus(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${makeupStatus === opt.value ? 'bg-primary text-on-primary border-primary' : 'border-hairline text-ink-mute hover:text-ink'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {makeupStatus === 'custom' && (
            <input type="text" value={customMakeupText} onChange={e => setCustomMakeupText(e.target.value)} placeholder="Enter custom make-up details..."
              className="mt-2 w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" />
          )}
        </div>
      )}

      {/* Preview */}
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Preview</label>
        <div className="bg-canvas-night text-on-dark rounded-lg p-4 font-sans text-sm leading-relaxed min-h-[100px] whitespace-pre-wrap">
          {preview || 'Your message preview will appear here...'}
        </div>
      </div>
    </div>
  );
}
