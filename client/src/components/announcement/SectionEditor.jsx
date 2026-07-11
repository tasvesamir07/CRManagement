import { X } from 'lucide-react';

export default function SectionEditor({ sections, setSections }) {
  const addSection = () => setSections(prev => [...prev, { name: '', startTime: '', endTime: '', room: '', mode: 'Offline', timeOption: 'select' }]);
  const removeSection = (i) => { if (sections.length > 1) setSections(prev => prev.filter((_, idx) => idx !== i)); };
  const updateSection = (i, field, val) => setSections(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: val }; return u; });

  return (
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
            if (opt !== 'select' && opt !== 'custom') {
              updateSection(i, 'startTime', '');
              updateSection(i, 'endTime', '');
            }
          }} className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary">
            <option value="select">⏱️ Set Time</option>
            <option value="custom">✏️ Custom Text</option>
            <option value="tbd">⏳ Not Decided</option>
            <option value="none">❌ No Time</option>
          </select>
          {sec.timeOption === 'custom' ? (
            <input type="text" placeholder="Custom time text" value={sec.startTime} onChange={e => updateSection(i, 'startTime', e.target.value)}
              className="px-2 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary w-[200px]" />
          ) : (!sec.timeOption || sec.timeOption === 'select') ? (
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
  );
}
