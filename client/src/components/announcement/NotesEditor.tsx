import { useState } from 'react';
import { Plus, X, GripVertical, BookOpen, StickyNote, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface NotesEditorProps {
  notes: any[];
  setNotes: React.Dispatch<React.SetStateAction<any[]>>;
  currentNote: string;
  setCurrentNote: React.Dispatch<React.SetStateAction<string>>;
}

export default function NotesEditor({ notes, setNotes, currentNote, setCurrentNote }: NotesEditorProps) {
  const [noteType, setNoteType] = useState<'note' | 'instruction' | 'important'>('note');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const addNote = () => { if (currentNote.trim()) { setNotes((prev: any[]) => [...prev, { text: currentNote.trim(), type: noteType }]); setCurrentNote(''); } };
  const removeNote = (i: number) => setNotes((prev: any[]) => prev.filter((_: any, idx: number) => idx !== i));

  const handleDragStart = (e: React.DragEvent<HTMLSpanElement>, idx: number) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent<HTMLSpanElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLSpanElement>, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const items = [...notes];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedItem);
    setNotes(items);
    setDraggedIdx(null);
  };

  const handleNoteTypeChange = (index: number, type: string) => {
    setNotes((prev: any[]) => prev.map((note: any, idx: number) => {
      if (idx === index) {
        const isObj = typeof note === 'object' && note !== null;
        const text = isObj ? note.text : note;
        return { text, type };
      }
      return note;
    }));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-2">Notes / Instructions</label>
      <div className="flex gap-2 mb-2">
        <select value={noteType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNoteType(e.target.value as 'note' | 'instruction' | 'important')} className="px-2 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="note">Note</option>
          <option value="instruction">Instruction</option>
          <option value="important">Important</option>
        </select>
        <input type="text" value={currentNote} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentNote(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
          placeholder="Add a note..."
          className="flex-1 px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary" />
        <button type="button" onClick={addNote} className="px-3 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep cursor-pointer"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {notes.map((n: any, i: number) => {
          const isObj = typeof n === 'object' && n !== null;
          const text = isObj ? n.text : n;
          const type = isObj ? n.type : 'note';
          const typeLabel = type === 'instruction' ? 'Instruction' : type === 'important' ? 'Important' : 'Note';
          const badgeColor = type === 'instruction' ? 'bg-primary/10 text-primary' : type === 'important' ? 'bg-accent-tomato/10 text-accent-tomato' : 'bg-accent-violet/10 text-accent-violet';
          const BadgeIcon = type === 'instruction' ? BookOpen : type === 'important' ? AlertTriangle : StickyNote;
          return (
            <span key={i}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${badgeColor} text-xs rounded-sm cursor-move select-none border border-transparent hover:brightness-95 transition-all`}>
              <GripVertical className="w-3 h-3 opacity-70 flex-shrink-0" />
              <BadgeIcon className="w-3 h-3 shrink-0" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" draggable={false}
                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                    className="bg-transparent border-none p-0 text-[10px] font-bold uppercase cursor-pointer focus:outline-none hover:underline mr-0.5 flex items-center gap-1">
                    {typeLabel}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-28 bg-canvas border border-hairline shadow-lg p-1 text-xs">
                  <DropdownMenuItem onSelect={() => handleNoteTypeChange(i, 'note')} onClick={() => handleNoteTypeChange(i, 'note')}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold">
                    <StickyNote className="w-3.5 h-3.5 text-accent-violet" /> Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleNoteTypeChange(i, 'instruction')} onClick={() => handleNoteTypeChange(i, 'instruction')}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-primary" /> Instruction
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleNoteTypeChange(i, 'important')} onClick={() => handleNoteTypeChange(i, 'important')}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-tomato" /> Important
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span>{text}</span>
              <button type="button" draggable={false}
                onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                onClick={() => removeNote(i)}
                className="text-ink-mute hover:text-accent-tomato cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
