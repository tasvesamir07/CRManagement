import { compileMessage } from './compileMessage';
import { PRESET_DEFS, TITLE_PRESETS, CATEGORIES } from './messagePresets';
import DevicePreview from './DevicePreview';
import SectionEditor from './SectionEditor';
import TopicsEditor from './TopicsEditor';
import NotesEditor from './NotesEditor';
import type { Section, Course } from './types';

interface MessageBuilderProps {
  category: string;
  setCategory: (val: string) => void;
  titlePreset: string;
  setTitlePreset: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  selectedCourseId: string;
  courses: Course[];
  broadcastMode: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  topics: string[];
  setTopics: React.Dispatch<React.SetStateAction<string[]>>;
  currentTopic: string;
  setCurrentTopic: React.Dispatch<React.SetStateAction<string>>;
  notes: any[];
  setNotes: React.Dispatch<React.SetStateAction<any[]>>;
  currentNote: string;
  setCurrentNote: React.Dispatch<React.SetStateAction<string>>;
  closingText: string;
  setClosingText: (val: string) => void;
  selectedDate: string;
  makeupStatus: string;
  setMakeupStatus: (val: string) => void;
  customMakeupText: string;
  setCustomMakeupText: (val: string) => void;
  showTopics: boolean;
}

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
  selectedDate,
  makeupStatus, setMakeupStatus,
  customMakeupText, setCustomMakeupText,
  showTopics,
}: MessageBuilderProps) {
  const handlePresetChange = (presetValue: string) => {
    setTitlePreset(presetValue);
    if (presetValue !== 'Custom') {
      setTitle(presetValue);
      const def = (PRESET_DEFS as Record<string, { category: string }>)[presetValue];
      if (def) {
        setCategory(def.category);
        if (def.category === 'class_cancel') setMakeupStatus('later');
      }
    } else {
      setTitle('');
    }
  };

  const preview = compileMessage({
    broadcastMode, title, category, selectedCourseId, courses,
    sections, topics, selectedDate, makeupStatus, customMakeupText,
    notes, closingText
  });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notice Preset Type</label>
        <select value={titlePreset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePresetChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink focus:outline-none focus:border-primary">
          {TITLE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {titlePreset === 'Custom' && (
        <div>
          <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notice Title</label>
          <input type="text" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder="Type your notice title..."
            className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Category</label>
        <select value={category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink focus:outline-none focus:border-primary">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <SectionEditor sections={sections} setSections={setSections} />

      {showTopics && (
        <TopicsEditor
          topics={topics} setTopics={setTopics}
          currentTopic={currentTopic} setCurrentTopic={setCurrentTopic}
        />
      )}

      <NotesEditor
        notes={notes} setNotes={setNotes}
        currentNote={currentNote} setCurrentNote={setCurrentNote}
      />

      <div>
        <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Closing Text (Optional)</label>
        <input type="text" value={closingText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClosingText(e.target.value)}
          placeholder="e.g. Please be prepared and attend on time. Good luck! 🍀📖"
          className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
      </div>

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
            <input type="text" value={customMakeupText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomMakeupText(e.target.value)} placeholder="Enter custom make-up details..."
              className="mt-2 w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary" />
          )}
        </div>
      )}

      <DevicePreview preview={preview} />
    </div>
  );
}
