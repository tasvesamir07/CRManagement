import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';

export default function TopicsEditor({ topics, setTopics, currentTopic, setCurrentTopic }) {
  const [draggedIdx, setDraggedIdx] = useState(null);

  const addTopic = () => { if (currentTopic.trim()) { setTopics(prev => [...prev, currentTopic.trim()]); setCurrentTopic(''); } };
  const removeTopic = (i) => setTopics(prev => prev.filter((_, idx) => idx !== i));

  const handleDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const items = [...topics];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedItem);
    setTopics(items);
    setDraggedIdx(null);
  };

  return (
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
          <span key={i}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, i)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-ink text-xs rounded-sm cursor-move select-none hover:bg-primary/15 transition-colors border border-transparent hover:border-primary/20">
            <GripVertical className="w-3 h-3 text-primary/70 flex-shrink-0" />
            {t}
            <button type="button" onClick={() => removeTopic(i)} className="text-ink-mute hover:text-accent-tomato cursor-pointer"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}
