import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI } from '../../services/api';
import { 
  Palette, Download, Share2, Plus, Trash2, Copy, 
  MoveUp, MoveDown, Lock, Unlock, X, RefreshCw, 
  ZoomIn, ZoomOut, Check, Sparkles, Sliders, Type, Grid3X3
} from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

interface ExamRoutine {
  id: number;
  course_id: number;
  c_id: string;
  course_name: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section: string;
  instructions: string;
}

interface CanvasItem {
  id: string;
  courseCode: string;
  courseName: string;
  examDate: string;
  examTime: string;
  rooms: string;
  accentColor: string;
}

interface ExamCanvaEditorProps {
  routines: ExamRoutine[];
  courses: Course[];
  onClose: () => void;
  onRefresh?: () => void;
}

// Accent color presets for the colored bar next to date/time
const ACCENT_COLORS = [
  { name: 'Lavender', value: '#D7BDE2' },
  { name: 'Amber', value: '#F9E79F' },
  { name: 'Purple', value: '#BB8FCE' },
  { name: 'Peach', value: '#F5CBA7' },
  { name: 'Mint', value: '#A9DFBF' },
  { name: 'Sky', value: '#AED6F1' },
  { name: 'Rose', value: '#FADBD8' },
  { name: 'Tomato', value: '#F1948A' }
];

// Canvas background presets
const CANVAS_BG_PRESETS = [
  { name: 'Classic Canva Blue-Gray', value: '#E4ECF0', gradient: '' },
  { name: 'Soft Cream', value: '#F9F6F0', gradient: '' },
  { name: 'Lavender Mist', value: '#F4F0F8', gradient: '' },
  { name: 'Mint Cream', value: '#F1F9F6', gradient: '' },
  { name: 'Sunset Glow', value: '', gradient: 'linear-gradient(135deg, #FFE4E6 0%, #FFEDD5 100%)' },
  { name: 'Ocean Breeze', value: '', gradient: 'linear-gradient(135deg, #E0F2FE 0%, #DBEAFE 100%)' },
  { name: 'Forest Fog', value: '', gradient: 'linear-gradient(135deg, #ECFDF5 0%, #E0F2FE 100%)' },
  { name: 'Pure White', value: '#FFFFFF', gradient: '' },
  { name: 'Dark Slate', value: '#1E293B', gradient: '' }
];

// Custom Inline Input Component for direct in-canvas editing
interface InlineInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  isTextArea?: boolean;
  disabled?: boolean;
}

const InlineInput: React.FC<InlineInputProps> = ({ value, onChange, className = '', isTextArea = false, disabled = false }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    setEditing(false);
    onChange(localVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextArea) {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalVal(value);
      setEditing(false);
    }
  };

  if (editing && !disabled) {
    return isTextArea ? (
      <textarea
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className="w-full bg-white border border-primary text-black focus:outline-none p-1 rounded font-sans text-xs resize-none text-center shadow-inner"
        rows={3}
      />
    ) : (
      <input
        type="text"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full bg-white border border-primary text-black focus:outline-none p-0.5 rounded font-sans text-sm text-center shadow-inner"
      />
    );
  }

  return (
    <div
      onClick={() => !disabled && setEditing(true)}
      className={`group/inline relative rounded px-1 -mx-1 border border-transparent transition-all ${
        disabled ? '' : 'cursor-pointer hover:bg-primary/10 hover:border-primary/20'
      } ${className}`}
      title={disabled ? undefined : 'Click to edit'}
    >
      {value || <span className="text-ink-mute-2 italic font-normal text-xs">(Click to edit)</span>}
      {!disabled && (
        <span className="opacity-0 group-hover/inline:opacity-100 absolute -top-4 right-0 bg-primary text-on-primary text-[9px] px-1 rounded shadow-sm pointer-events-none transition-opacity">
          Edit
        </span>
      )}
    </div>
  );
};

const ExamCanvaEditor: React.FC<ExamCanvaEditorProps> = ({ routines, courses, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Editor states
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Canvas customizer states
  const [headerTitle, setHeaderTitle] = useState('MID - EXAM');
  const [headerSubtitle, setHeaderSubtitle] = useState('SUMMER - 2026');
  const [footerLeft, setFooterLeft] = useState('SECTION - CS-(A & H)');
  const [footerRight, setFooterRight] = useState('ROUTINE - SWE - 41');
  
  const [bgColor, setBgColor] = useState('#E4ECF0');
  const [bgGradient, setBgGradient] = useState('');
  
  const [cardBg, setCardBg] = useState('#ffffff');
  const [cardTextColor, setCardTextColor] = useState('#171717');
  const [cardBorderColor, setCardBorderColor] = useState('#dfdfdf');
  const [cardBorderType, setCardBorderType] = useState<'none' | 'hairline' | 'accent'>('none');
  const [cardRoundedness, setCardRoundedness] = useState('8px');
  const [cardShadow, setCardShadow] = useState('shadow-sm');
  
  const [showVerticalLines, setShowVerticalLines] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Convert Date from YYYY-MM-DD to DD-MM-YY
  const formatDateToShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0].slice(2)}`;
      }
    } catch {}
    return dateStr;
  };

  // Convert time to 12-hour AM/PM format
  const formatTimeTo12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const [hoursStr, minutesStr] = timeStr.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = minutesStr || '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {}
    return timeStr;
  };

  // Initialize Canvas items from prop routines
  useEffect(() => {
    const formattedItems = routines.map((r, index) => {
      // Parse rooms list: DB may have "814A - 9, 814B - 12" -> join with \n
      const rooms = r.room_number 
        ? r.room_number.split(',').map(s => s.trim()).join('\n') 
        : '';
      
      // Preset color cycle
      const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length].value;

      return {
        id: `routine-${r.id || Math.random().toString(36).substr(2, 9)}`,
        courseCode: r.c_id || '',
        courseName: r.course_name || '',
        examDate: formatDateToShort(r.exam_date),
        examTime: formatTimeTo12Hour(r.start_time),
        rooms: rooms,
        accentColor: accentColor
      };
    });

    setItems(formattedItems);

    // Try to pre-fill header/footer from active routine details if possible
    if (routines.length > 0) {
      const type = routines[0].exam_type || 'MID';
      setHeaderTitle(`${type.toUpperCase()} - EXAM`);
      
      // If we find any section in routine
      const sections = Array.from(new Set(routines.map(r => r.section).filter(Boolean)));
      if (sections.length > 0) {
        setFooterLeft(`SECTION - ${sections.join(' & ')}`);
      }
    }
  }, [routines]);

  // Handle re-ordering items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedItems = [...items];
    const temp = updatedItems[index];
    updatedItems[index] = updatedItems[newIndex];
    updatedItems[newIndex] = temp;
    setItems(updatedItems);
  };

  // Add card
  const handleAddItem = () => {
    const newItem: CanvasItem = {
      id: `local-${Math.random().toString(36).substr(2, 9)}`,
      courseCode: 'CS-000',
      courseName: 'NEW COURSE SUBJECT',
      examDate: '01-01-26',
      examTime: '10:00 AM',
      rooms: 'ROOM - 00',
      accentColor: ACCENT_COLORS[items.length % ACCENT_COLORS.length].value
    };
    setItems([...items, newItem]);
    setSelectedItemId(newItem.id);
    toast.success('Added new routine card');
  };

  // Duplicate card
  const handleDuplicateItem = (index: number) => {
    const original = items[index];
    const duplicate: CanvasItem = {
      ...original,
      id: `local-${Math.random().toString(36).substr(2, 9)}`,
      courseCode: `${original.courseCode} (Copy)`
    };
    const updated = [...items];
    updated.splice(index + 1, 0, duplicate);
    setItems(updated);
    setSelectedItemId(duplicate.id);
    toast.success('Card duplicated');
  };

  // Delete card
  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    toast.success('Card removed from canvas');
  };

  // Edit item details
  const updateItemField = (id: string, field: keyof CanvasItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Get active item
  const selectedItem = items.find(item => item.id === selectedItemId);

  // Capture Canvas Node for exporting
  const captureCanvasBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    
    // Temporarily hide border outline and editor-specific widgets on cards during capture
    const origTransform = canvasRef.current.style.transform;
    const origWidth = canvasRef.current.style.width;
    
    // Render at 100% zoom scale for export
    canvasRef.current.style.transform = 'none';
    canvasRef.current.style.width = '550px';
    
    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2, // High resolution output
        style: {
          transform: 'none',
          width: '550px',
        }
      });
      
      canvasRef.current.style.transform = origTransform;
      canvasRef.current.style.width = origWidth;

      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      canvasRef.current.style.transform = origTransform;
      canvasRef.current.style.width = origWidth;
      console.error(err);
      return null;
    }
  };

  // Export to PNG
  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await captureCanvasBlob();
      if (!blob) throw new Error('Canvas render failed');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `exam-routine-${headerSubtitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'design'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('Downloaded PNG routine successfully!');
    } catch (err) {
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Share to notice board directly
  const handleShareToNotice = async () => {
    setSharing(true);
    try {
      const blob = await captureCanvasBlob();
      if (!blob) throw new Error('Canvas render failed');
      
      const fileName = `exam-routine-${headerSubtitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'design'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Upload to file server
      const uploadedFileRecord = await filesAPI.upload(file, null);
      
      // Navigate to broadcasting notice compose page with prefilled parameters
      navigate('/announcement/new', {
        state: {
          preFillTitle: `${headerTitle} - ${headerSubtitle}`,
          preFillBody: `📢 *Exam Routine Notice*\n\nThe exam routine for *${headerSubtitle}* (${footerLeft}) has been published. Please review the attached custom routine schedule card for details on dates, rooms, and sessions.\n\nGood luck with your preparations! 📝🎓`,
          preFillCategory: 'notice',
          preAttachedFiles: [uploadedFileRecord]
        }
      });
      toast.success('Exported and attached to new notice broadcast!');
    } catch (err: any) {
      toast.error('Failed to export and share routine. ' + (err.response?.data?.error || err.message));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[750px] animate-in fade-in duration-200">
      
      {/* 1. SIDEBAR: Controls & Settings (Left 4 cols) */}
      <div className="lg:col-span-4 border-r border-hairline bg-canvas-soft flex flex-col h-full overflow-y-auto max-h-[780px]">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-hairline flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-ink">Routine Canva Editor</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-ink-mute hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Sections */}
        <div className="p-4 space-y-6 flex-1">

          {/* Section: Templates & Colors */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Canvas & Card Theme
            </h3>
            
            {/* Background Presets */}
            <div>
              <label className="block text-xs text-ink-mute mb-1 font-medium">Canvas Background</label>
              <div className="grid grid-cols-5 gap-1.5">
                {CANVAS_BG_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBgColor(preset.value);
                      setBgGradient(preset.gradient);
                    }}
                    style={{ background: preset.gradient || preset.value }}
                    className={`h-7 rounded border shadow-sm hover:scale-105 transition-transform cursor-pointer ${
                      (preset.gradient && bgGradient === preset.gradient) || (!preset.gradient && bgColor === preset.value && !bgGradient)
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-hairline'
                    }`}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-ink-mute mb-1 font-medium">Custom Card Bg</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={cardBg} 
                    onChange={e => setCardBg(e.target.value)} 
                    className="w-8 h-8 rounded border border-hairline p-0.5 bg-canvas cursor-pointer"
                  />
                  <span className="text-xs font-mono">{cardBg}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-mute mb-1 font-medium">Card Text Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={cardTextColor} 
                    onChange={e => setCardTextColor(e.target.value)} 
                    className="w-8 h-8 rounded border border-hairline p-0.5 bg-canvas cursor-pointer"
                  />
                  <span className="text-xs font-mono">{cardTextColor}</span>
                </div>
              </div>
            </div>

            {/* Card Layout Customizations */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-ink-mute mb-1 font-medium">Corner Roundedness</label>
                <select 
                  value={cardRoundedness} 
                  onChange={e => setCardRoundedness(e.target.value)}
                  className="w-full h-8 px-2 border border-hairline bg-canvas text-xs rounded"
                >
                  <option value="0px">Sharp (0px)</option>
                  <option value="4px">Small (4px)</option>
                  <option value="8px">Medium (8px)</option>
                  <option value="12px">Large (12px)</option>
                  <option value="20px">Extra Rounded (20px)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-mute mb-1 font-medium">Card Shadow</label>
                <select 
                  value={cardShadow} 
                  onChange={e => setCardShadow(e.target.value)}
                  className="w-full h-8 px-2 border border-hairline bg-canvas text-xs rounded"
                >
                  <option value="shadow-none">None</option>
                  <option value="shadow-sm">Soft / Subtle</option>
                  <option value="shadow-md">Medium</option>
                  <option value="shadow-lg">Large</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-ink-mute mb-1 font-medium">Card Border Style</label>
                <select 
                  value={cardBorderType} 
                  onChange={e => setCardBorderType(e.target.value as any)}
                  className="w-full h-8 px-2 border border-hairline bg-canvas text-xs rounded"
                >
                  <option value="none">No Border</option>
                  <option value="hairline">Light Border</option>
                  <option value="accent">Match Accent Bar Color</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input 
                  type="checkbox" 
                  id="v-lines"
                  checked={showVerticalLines}
                  onChange={e => setShowVerticalLines(e.target.checked)}
                  className="rounded border-hairline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="v-lines" className="text-xs text-ink select-none cursor-pointer font-medium">Vertical Dividers</label>
              </div>
            </div>
          </div>

          {/* Section: Text Customizer */}
          <div className="space-y-3 pt-2 border-t border-hairline">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Header & Footer Texts
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-mute mb-1">Header Title</label>
                <input 
                  type="text" 
                  value={headerTitle} 
                  onChange={e => setHeaderTitle(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-hairline bg-canvas rounded focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-mute mb-1">Header Subtitle</label>
                <input 
                  type="text" 
                  value={headerSubtitle} 
                  onChange={e => setHeaderSubtitle(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-hairline bg-canvas rounded focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-mute mb-1">Footer Left</label>
                <input 
                  type="text" 
                  value={footerLeft} 
                  onChange={e => setFooterLeft(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-hairline bg-canvas rounded focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-mute mb-1">Footer Right</label>
                <input 
                  type="text" 
                  value={footerRight} 
                  onChange={e => setFooterRight(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-hairline bg-canvas rounded focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Selected Exam Card Options */}
          <div className="space-y-3 pt-2 border-t border-hairline">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute flex items-center gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5" /> Selected Item Editor
            </h3>
            {selectedItem ? (
              <div className="bg-canvas border border-hairline rounded-md p-3 space-y-3 shadow-sm">
                
                {/* Course Details */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-ink-mute">Course Code</label>
                    <input 
                      type="text" 
                      value={selectedItem.courseCode} 
                      onChange={e => updateItemField(selectedItem.id, 'courseCode', e.target.value)}
                      className="w-full h-7 px-1.5 text-xs border border-hairline bg-canvas rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-ink-mute">Exam Date</label>
                    <input 
                      type="text" 
                      value={selectedItem.examDate} 
                      onChange={e => updateItemField(selectedItem.id, 'examDate', e.target.value)}
                      className="w-full h-7 px-1.5 text-xs border border-hairline bg-canvas rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-ink-mute mb-0.5">Course Name</label>
                  <input 
                    type="text" 
                    value={selectedItem.courseName} 
                    onChange={e => updateItemField(selectedItem.id, 'courseName', e.target.value)}
                    className="w-full h-7 px-1.5 text-xs border border-hairline bg-canvas rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-ink-mute">Time</label>
                    <input 
                      type="text" 
                      value={selectedItem.examTime} 
                      onChange={e => updateItemField(selectedItem.id, 'examTime', e.target.value)}
                      className="w-full h-7 px-1.5 text-xs border border-hairline bg-canvas rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-ink-mute">Accent Bar Color</label>
                    <div className="relative">
                      <input 
                        type="color" 
                        value={selectedItem.accentColor} 
                        onChange={e => updateItemField(selectedItem.id, 'accentColor', e.target.value)}
                        className="w-full h-7 rounded border border-hairline bg-canvas cursor-pointer p-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Rooms List */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-ink-mute mb-0.5">Rooms & Counts (one per line)</label>
                  <textarea 
                    value={selectedItem.rooms} 
                    onChange={e => updateItemField(selectedItem.id, 'rooms', e.target.value)}
                    className="w-full p-1.5 text-xs border border-hairline bg-canvas rounded font-mono"
                    rows={3}
                  />
                </div>

                {/* Accent Color Preset Selector */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-ink-mute mb-1">Color Accent Presets</label>
                  <div className="flex flex-wrap gap-1">
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => updateItemField(selectedItem.id, 'accentColor', color.value)}
                        style={{ backgroundColor: color.value }}
                        className={`w-6 h-6 rounded-full border border-hairline hover:scale-110 transition-transform cursor-pointer ${
                          selectedItem.accentColor === color.value ? 'ring-2 ring-primary border-white' : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Duplicate/Delete quick buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const idx = items.findIndex(item => item.id === selectedItemId);
                      if (idx !== -1) handleDuplicateItem(idx);
                    }}
                    className="flex-1 py-1 px-2 border border-hairline rounded text-[10px] font-semibold text-ink bg-canvas hover:bg-canvas-soft transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-ink-mute" /> Duplicate Card
                  </button>
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="py-1 px-2 border border-accent-tomato/20 rounded text-[10px] font-semibold text-accent-tomato bg-accent-tomato/5 hover:bg-accent-tomato/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

              </div>
            ) : (
              <div className="border border-dashed border-hairline rounded-md p-6 text-center text-xs text-ink-mute">
                Click any exam card in the canvas layout to customize its individual code, name, dates, rooms, or accent color.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-hairline bg-canvas">
          <button
            onClick={handleAddItem}
            className="w-full flex items-center justify-center py-2 px-4 border border-dashed border-primary hover:border-primary-deep rounded text-xs font-semibold text-primary bg-canvas hover:bg-canvas-soft transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Custom Exam Row
          </button>
        </div>

      </div>

      {/* 2. MAIN CANVAS VIEW AREA (Right 8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-canvas-soft min-h-[500px]">
        
        {/* Canvas Toolbar Controls */}
        <div className="p-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3 bg-canvas no-export">
          
          {/* Zoom and Grid Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer border ${
                isLocked 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                  : 'bg-canvas border-hairline text-ink-secondary hover:bg-canvas-soft'
              }`}
              title={isLocked ? 'Unlock canvas for editing' : 'Lock canvas into design mode'}
            >
              {isLocked ? (
                <><Lock className="w-3.5 h-3.5 text-amber-500" /> Canvas Locked</>
              ) : (
                <><Unlock className="w-3.5 h-3.5 text-ink-mute" /> Canvas Unlocked</>
              )}
            </button>

            <div className="h-6 w-px bg-hairline" />

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setZoom(Math.max(50, zoom - 10))} 
                className="p-1.5 hover:bg-canvas-soft border border-hairline rounded cursor-pointer text-ink-mute hover:text-ink"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-medium px-1.5 w-12 text-center text-ink">{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(150, zoom + 10))} 
                className="p-1.5 hover:bg-canvas-soft border border-hairline rounded cursor-pointer text-ink-mute hover:text-ink"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              disabled={exporting}
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-hairline rounded hover:bg-canvas-soft bg-canvas text-ink cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              {exporting ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Rendering...</>
              ) : (
                <><Download className="w-3.5 h-3.5 text-primary" /> Download PNG</>
              )}
            </button>
            <button
              disabled={sharing}
              onClick={handleShareToNotice}
              className="flex items-center gap-1.5 px-4.5 py-1.5 text-xs font-semibold bg-primary text-on-primary rounded hover:bg-primary-deep cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              {sharing ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
              ) : (
                <><Share2 className="w-3.5 h-3.5" /> Share to Notice Board</>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Workspace Container */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center min-h-[500px]">
          
          {/* Zoom Wrapper */}
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }} 
            className="transition-transform duration-150 py-4"
          >
            
            {/* The Actual Poster Canvas */}
            <div
              ref={canvasRef}
              id="exam-routine-canva-poster"
              style={{ 
                background: bgGradient || bgColor, 
                width: '550px' 
              }}
              className="p-8 space-y-6 shadow-xl relative select-none font-sans overflow-hidden"
            >
              
              {/* Header Box */}
              <div 
                style={{ 
                  backgroundColor: cardBg,
                  borderRadius: cardRoundedness,
                  color: cardTextColor
                }}
                className={`p-5 text-center border border-hairline transition-all ${cardShadow}`}
              >
                <h1 className="font-extrabold text-2xl tracking-tight leading-tight uppercase">
                  <InlineInput 
                    value={headerTitle} 
                    onChange={setHeaderTitle} 
                    disabled={isLocked}
                  />
                </h1>
                <h2 className="text-base tracking-widest font-semibold uppercase mt-1 opacity-80">
                  <InlineInput 
                    value={headerSubtitle} 
                    onChange={setHeaderSubtitle} 
                    disabled={isLocked}
                  />
                </h2>
              </div>

              {/* Exam Rows List */}
              <div className="space-y-4">
                {items.map((item, index) => {
                  const isSelected = selectedItemId === item.id;
                  
                  // Compute border style based on settings
                  let borderStyle = 'border-none';
                  if (cardBorderType === 'hairline') {
                    borderStyle = `border border-[${cardBorderColor}]`;
                  } else if (cardBorderType === 'accent') {
                    borderStyle = `border-2`;
                  }

                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      style={{ 
                        backgroundColor: cardBg,
                        borderRadius: cardRoundedness,
                        color: cardTextColor,
                        borderColor: cardBorderType === 'accent' ? item.accentColor : cardBorderColor
                      }}
                      className={`relative p-5 transition-all flex items-stretch gap-2 group cursor-pointer ${cardShadow} ${borderStyle} ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                    >
                      {/* Left: Date / Time Column */}
                      <div className="w-[145px] pr-3 flex flex-col justify-center select-text">
                        <div className="font-bold text-sm leading-tight text-center">
                          <InlineInput 
                            value={item.examDate} 
                            onChange={val => updateItemField(item.id, 'examDate', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                        <div className="font-semibold text-xs text-ink-mute mt-1.5 text-center flex items-center justify-center gap-1">
                          <InlineInput 
                            value={item.examTime} 
                            onChange={val => updateItemField(item.id, 'examTime', val)} 
                            disabled={isLocked} 
                          />
                          {/* Accent line/block next to time */}
                          <div 
                            style={{ backgroundColor: item.accentColor }} 
                            className="w-6 h-1.5 rounded shrink-0 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Vertical Divider 1 */}
                      {showVerticalLines && (
                        <div className="w-px shrink-0 self-stretch my-1 border-r border-[#dfdfdf]" />
                      )}

                      {/* Middle: Course Code / Subject Name */}
                      <div className="flex-1 px-4 flex flex-col justify-center text-center select-text">
                        <div className="font-extrabold text-sm leading-snug">
                          <InlineInput 
                            value={item.courseCode} 
                            onChange={val => updateItemField(item.id, 'courseCode', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                        <div className="text-[11px] leading-tight font-bold tracking-wide mt-1.5 uppercase opacity-85">
                          <InlineInput 
                            value={item.courseName} 
                            onChange={val => updateItemField(item.id, 'courseName', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                      </div>

                      {/* Vertical Divider 2 */}
                      {showVerticalLines && (
                        <div className="w-px shrink-0 self-stretch my-1 border-r border-[#dfdfdf]" />
                      )}

                      {/* Right: Rooms and Seating */}
                      <div className="w-[125px] pl-3 flex flex-col justify-center text-center text-xs font-mono font-bold leading-normal select-text whitespace-pre-line opacity-90">
                        <InlineInput 
                          value={item.rooms} 
                          onChange={val => updateItemField(item.id, 'rooms', val)} 
                          isTextArea={true}
                          disabled={isLocked} 
                        />
                      </div>

                      {/* Hover controls (Reorder / Duplicate / Delete overlay) */}
                      {!isLocked && (
                        <div className="absolute -top-3.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-canvas border border-hairline rounded shadow px-1.5 py-1 flex items-center gap-1.5 z-10 no-export">
                          
                          {/* Move Up */}
                          <button 
                            disabled={index === 0}
                            onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                            className="p-1 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary"
                            title="Move Up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>

                          {/* Move Down */}
                          <button 
                            disabled={index === items.length - 1}
                            onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                            className="p-1 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary"
                            title="Move Down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>

                          <div className="w-px h-3 bg-hairline" />

                          {/* Duplicate */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicateItem(index); }}
                            className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-ink hover:text-primary"
                            title="Duplicate Card"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                            className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-accent-tomato hover:bg-accent-tomato/10"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Footer Box */}
              <div 
                style={{ 
                  backgroundColor: cardBg,
                  borderRadius: cardRoundedness,
                  color: cardTextColor
                }}
                className={`p-4 border border-hairline text-center transition-all ${cardShadow}`}
              >
                <div className="text-[13px] font-bold tracking-wider uppercase">
                  <InlineInput 
                    value={footerLeft} 
                    onChange={setFooterLeft} 
                    disabled={isLocked}
                  />
                </div>
                <div className="text-[12px] font-bold tracking-wide uppercase mt-1 opacity-80">
                  <InlineInput 
                    value={footerRight} 
                    onChange={setFooterRight} 
                    disabled={isLocked}
                  />
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default ExamCanvaEditor;
