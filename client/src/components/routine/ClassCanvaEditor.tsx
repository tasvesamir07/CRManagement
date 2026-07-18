import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { routinesAPI, filesAPI } from '../../services/api';
import { 
  Palette, Download, Share2, Plus, Trash2, Copy, 
  Lock, Unlock, X, RefreshCw, ZoomIn, ZoomOut, Sliders, Type, Grid3X3, Calendar, Save
} from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  course_id: string;
  course_name: string;
  teacher_name: string;
  teacher_initials: string;
}

interface Routine {
  id: number;
  course_id: number;
  c_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  section?: string;
}

interface Slot {
  start: string;
  end: string;
}

interface ClassCanvaEditorProps {
  routines: Routine[];
  courses: Course[];
  customDays: string[];
  customSlots: Slot[];
  semesterTitle: string;
  sectionGroup: string;
  batchCode: string;
  effectiveDate: string;
  setSemesterTitle: (val: string) => void;
  setSectionGroup: (val: string) => void;
  setBatchCode: (val: string) => void;
  setEffectiveDate: (val: string) => void;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

// Google Fonts list
const FONTS = [
  { name: 'Inter (Sans)', family: "'Inter', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap' },
  { name: 'Outfit (Modern)', family: "'Outfit', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap' },
  { name: 'Plus Jakarta', family: "'Plus Jakarta Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Poppins', family: "'Poppins', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800&display=swap' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap' },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap' },
  { name: 'Cinzel (Elegant)', family: "'Cinzel', serif", link: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap' }
];

// Predefined Class Routine Theme Palettes
const CLASS_THEMES = [
  {
    name: 'Classic Green & White',
    canvasBg: '#1E293B',
    headerBg: '#1E5A38',
    headerTextColor: '#FFFFFF',
    timeColumnBg: '#F1F5F9',
    timeTextColor: '#334155',
    dayHeaderBg: '#1E5A38',
    dayHeaderTextColor: '#FFFFFF',
    cellBg: '#FFFFFF',
    cellTextColor: '#1E293B',
    borderColor: '#CBD5E1'
  },
  {
    name: 'Modern Dark Slate',
    canvasBg: '#090D16',
    headerBg: '#1E293B',
    headerTextColor: '#38BDF8',
    timeColumnBg: '#1E293B',
    timeTextColor: '#94A3B8',
    dayHeaderBg: '#1E293B',
    dayHeaderTextColor: '#F8FAFC',
    cellBg: '#0F172A',
    cellTextColor: '#F1F5F9',
    borderColor: '#334155'
  },
  {
    name: 'Royal Navy & Gold',
    canvasBg: '#0B132B',
    headerBg: '#1C2541',
    headerTextColor: '#F5B041',
    timeColumnBg: '#F8FAFC',
    timeTextColor: '#0B132B',
    dayHeaderBg: '#1C2541',
    dayHeaderTextColor: '#FFFFFF',
    cellBg: '#FFFFFF',
    cellTextColor: '#0B132B',
    borderColor: '#D5DBDB'
  },
  {
    name: 'Soft Sage & Peach',
    canvasBg: '#FEF5E7',
    headerBg: '#5D6D7E',
    headerTextColor: '#FFFFFF',
    timeColumnBg: '#FDFEFE',
    timeTextColor: '#2C3E50',
    dayHeaderBg: '#5D6D7E',
    dayHeaderTextColor: '#FFFFFF',
    cellBg: '#FFFFFF',
    cellTextColor: '#2E4053',
    borderColor: '#E5E8E8'
  },
  {
    name: 'Ocean Breeze Gradient',
    canvasBg: 'linear-gradient(135deg, #E0F2FE 0%, #DBEAFE 100%)',
    headerBg: '#0369A1',
    headerTextColor: '#FFFFFF',
    timeColumnBg: 'rgba(255, 255, 255, 0.6)',
    timeTextColor: '#0369A1',
    dayHeaderBg: '#0369A1',
    dayHeaderTextColor: '#FFFFFF',
    cellBg: 'rgba(255, 255, 255, 0.95)',
    cellTextColor: '#0F172A',
    borderColor: '#BAE6FD'
  }
] as const;

// Inline editing component
interface InlineInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
}

const InlineInput: React.FC<InlineInputProps> = ({ value, onChange, className = '', disabled = false }) => {
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
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setLocalVal(value);
      setEditing(false);
    }
  };

  if (editing && !disabled) {
    return (
      <input
        type="text"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="bg-white border border-primary text-black focus:outline-none p-0.5 rounded text-center max-w-full font-sans"
      />
    );
  }

  return (
    <div
      onClick={() => !disabled && setEditing(true)}
      className={`relative inline-block rounded px-1 -mx-1 border border-transparent transition-all ${
        disabled ? '' : 'cursor-pointer hover:bg-primary/10 hover:border-primary/20'
      } ${className}`}
      title={disabled ? undefined : 'Click to edit'}
    >
      {value || <span className="text-gray-400 italic">(Click to edit)</span>}
    </div>
  );
};

const ClassCanvaEditor: React.FC<ClassCanvaEditorProps> = ({
  routines,
  courses,
  customDays,
  customSlots,
  semesterTitle,
  sectionGroup,
  batchCode,
  effectiveDate,
  setSemesterTitle,
  setSectionGroup,
  setBatchCode,
  setEffectiveDate,
  onRefresh,
  onClose
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Layout and theme states
  const [selectedFont, setSelectedFont] = useState("'Inter', sans-serif");
  const [activeTab, setActiveTab] = useState<'theme' | 'headers' | 'cell'>('theme');
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Active theme properties
  const [canvasBg, setCanvasBg] = useState('#1E293B');
  const [canvasGradient, setCanvasGradient] = useState('');
  const [headerBg, setHeaderBg] = useState('#1E5A38');
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF');
  const [timeColumnBg, setTimeColumnBg] = useState('#F1F5F9');
  const [timeTextColor, setTimeTextColor] = useState('#334155');
  const [dayHeaderBg, setDayHeaderBg] = useState('#1E5A38');
  const [dayHeaderTextColor, setDayHeaderTextColor] = useState('#FFFFFF');
  const [cellBg, setCellBg] = useState('#FFFFFF');
  const [cellTextColor, setCellTextColor] = useState('#1E293B');
  const [borderColor, setBorderColor] = useState('#CBD5E1');

  // Selected cell position
  const [selectedCell, setSelectedCell] = useState<{ day: string; slot: Slot } | null>(null);

  // Form states for selected class entry editing
  const [formCourseId, setFormCourseId] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  // Dynamic Font Loader
  useEffect(() => {
    const fontObj = FONTS.find(f => f.family === selectedFont);
    if (fontObj && fontObj.link) {
      let link = document.getElementById('class-canva-custom-font') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = 'class-canva-custom-font';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = fontObj.link;
    }
  }, [selectedFont]);

  // Load selected cell's routine details into form
  const getCellRoutines = (day: string, slot: Slot) => {
    return routines.filter(r => 
      r.day_of_week.toLowerCase() === day.toLowerCase() &&
      r.start_time.substring(0, 5) === slot.start
    );
  };

  useEffect(() => {
    if (selectedCell) {
      const cellClasses = getCellRoutines(selectedCell.day, selectedCell.slot);
      if (cellClasses.length > 0) {
        const activeRoutine = cellClasses[0];
        setFormCourseId(activeRoutine.course_id.toString());
        setFormSection(activeRoutine.section || '');
        setFormRoomNumber(activeRoutine.room_number || '');
      } else {
        setFormCourseId(courses[0]?.id?.toString() || '');
        setFormSection('');
        setFormRoomNumber('');
      }
    }
  }, [selectedCell, routines]);

  // Handle cell click selection
  const handleCellClick = (day: string, slot: Slot) => {
    setSelectedCell({ day, slot });
    setActiveTab('cell'); // Focus editor tab
  };

  // Save/Update class entry
  const handleSaveCellEntry = async () => {
    if (!selectedCell) return;
    if (!formCourseId || !formRoomNumber || !formSection) {
      toast.error('Please specify a Course, Section, and Room Number');
      return;
    }

    setSavingCell(true);
    try {
      const cellClasses = getCellRoutines(selectedCell.day, selectedCell.slot);
      const matchedCourse = courses.find(c => c.id === parseInt(formCourseId));
      
      const payload = {
        course_id: parseInt(formCourseId),
        day_of_week: selectedCell.day,
        start_time: selectedCell.slot.start,
        end_time: selectedCell.slot.end,
        room_number: formRoomNumber,
        section: formSection
      };

      if (cellClasses.length > 0) {
        // Update existing routine entry
        await routinesAPI.update(cellClasses[0].id, payload);
        toast.success('Updated class schedule entry');
      } else {
        // Create new routine entry
        await routinesAPI.create(payload);
        toast.success('Created new class schedule entry');
      }
      await onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save class routine entry');
    } finally {
      setSavingCell(false);
    }
  };

  // Delete class entry
  const handleDeleteCellEntry = async (routineId: number) => {
    try {
      await routinesAPI.delete(routineId);
      toast.success('Removed schedule entry');
      await onRefresh();
      // Reset form
      setFormCourseId(courses[0]?.id?.toString() || '');
      setFormSection('');
      setFormRoomNumber('');
    } catch (err: any) {
      toast.error('Failed to remove entry: ' + err.message);
    }
  };

  // Format time display
  const formatTimeRange = (start: string, end: string) => {
    return `${start} – ${end}`;
  };

  const applyThemePalette = (theme: typeof CLASS_THEMES[number]) => {
    if (theme.canvasBg.includes('gradient')) {
      setCanvasGradient(theme.canvasBg);
      setCanvasBg('');
    } else {
      setCanvasBg(theme.canvasBg);
      setCanvasGradient('');
    }
    setHeaderBg(theme.headerBg);
    setHeaderTextColor(theme.headerTextColor);
    setTimeColumnBg(theme.timeColumnBg);
    setTimeTextColor(theme.timeTextColor);
    setDayHeaderBg(theme.dayHeaderBg);
    setDayHeaderTextColor(theme.dayHeaderTextColor);
    setCellBg(theme.cellBg);
    setCellTextColor(theme.cellTextColor);
    setBorderColor(theme.borderColor);
    toast.success(`Applied ${theme.name} palette!`);
  };

  // Image Export Blob renderer
  const captureCanvasBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    const origTransform = canvasRef.current.style.transform;
    const origWidth = canvasRef.current.style.width;

    canvasRef.current.style.transform = 'none';
    canvasRef.current.style.width = '750px';

    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        style: {
          transform: 'none',
          width: '750px'
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

  // Download PNG
  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await captureCanvasBlob();
      if (!blob) throw new Error('Canvas render failed');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `class-routine-${semesterTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'design'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('Downloaded Class Routine PNG successfully!');
    } catch (err) {
      toast.error('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Share to Notice
  const handleShareToNotice = async () => {
    setSharing(true);
    try {
      const blob = await captureCanvasBlob();
      if (!blob) throw new Error('Canvas render failed');

      const fileName = `class-routine-${semesterTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'design'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      const uploadedFileRecord = await filesAPI.upload(file, null);

      navigate('/announcement/new', {
        state: {
          preFillTitle: `Updated Class Routine - ${semesterTitle}`,
          preFillBody: `📢 *Updated Class Routine Notice*\n\nClass routine for *${semesterTitle}* (${sectionGroup}) Swe ${batchCode} has been updated. Please check the attached routine schedule image for details.\n\n_Effective from: ${effectiveDate}_\n\nAdjust your plans accordingly. Thank you! 📅`,
          preFillCategory: 'notice',
          preAttachedFiles: [uploadedFileRecord]
        }
      });
      toast.success('Exported and attached to new notice broadcast!');
    } catch (err: any) {
      toast.error('Failed to share: ' + (err.response?.data?.error || err.message));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[750px] animate-in fade-in duration-200">
      
      {/* 1. SIDEBAR: Controls & Settings (Left 4 cols) */}
      <div className="lg:col-span-4 border-r border-hairline bg-canvas-soft flex flex-col h-full overflow-y-auto max-h-[850px]">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-hairline flex items-center bg-canvas">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-bold text-ink">Class Routine Canva Editor</h2>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-hairline bg-canvas p-1 gap-1">
          <button 
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'theme' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Design Theme
          </button>
          <button 
            onClick={() => setActiveTab('headers')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'headers' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Titles
          </button>
          <button 
            onClick={() => setActiveTab('cell')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'cell' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Edit Cell
            {selectedCell && (
              <span className="w-1.5 h-1.5 bg-primary rounded-full absolute top-1 right-2"></span>
            )}
          </button>
        </div>

        {/* Tab Settings Body */}
        <div className="p-4 space-y-6 flex-1 bg-canvas-soft">

          {/* TAB 1: DESIGN THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Palette Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Theme Templates</label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASS_THEMES.map((theme, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyThemePalette(theme)}
                      className="text-left p-2.5 rounded border border-hairline bg-canvas hover:border-primary transition-all duration-150 cursor-pointer text-xs font-medium space-y-1.5 shadow-sm hover:shadow"
                    >
                      <div className="truncate font-semibold text-ink-secondary">{theme.name}</div>
                      <div className="flex gap-1 h-3.5 items-center">
                        <span style={{ backgroundColor: theme.canvasBg }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" title="Canvas Bg" />
                        <span style={{ backgroundColor: theme.headerBg }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" title="Header" />
                        <span style={{ backgroundColor: theme.cellBg }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" title="Cells" />
                        <span style={{ backgroundColor: theme.borderColor }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" title="Border" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font selector */}
              <div className="space-y-1.5 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Font Family</label>
                <select
                  value={selectedFont}
                  onChange={e => setSelectedFont(e.target.value)}
                  className="w-full h-9 px-2 border border-hairline bg-canvas text-xs rounded text-ink focus:border-primary focus:outline-none"
                >
                  {FONTS.map(f => (
                    <option 
                      key={f.family} 
                      value={f.family}
                      style={{ fontFamily: f.family }}
                    >
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background Color Pickers */}
              <div className="space-y-3 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Custom Color Overrides</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Canvas Background</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={canvasBg.startsWith('#') ? canvasBg : '#1E293B'} 
                        onChange={e => {
                          setCanvasBg(e.target.value);
                          setCanvasGradient('');
                        }} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink truncate">{canvasBg.startsWith('#') ? canvasBg : 'Gradient'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Header Background</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={headerBg} 
                        onChange={e => {
                          setHeaderBg(e.target.value);
                          setDayHeaderBg(e.target.value);
                        }} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink truncate">{headerBg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Cell Background</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={cellBg} 
                        onChange={e => setCellBg(e.target.value)} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink truncate">{cellBg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Grid Border Color</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={borderColor} 
                        onChange={e => setBorderColor(e.target.value)} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink truncate">{borderColor}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: POSTER HEADERS */}
          {activeTab === 'headers' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-3 bg-canvas border border-hairline rounded-md p-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Semester Title</label>
                  <input 
                    type="text" 
                    value={semesterTitle} 
                    onChange={e => setSemesterTitle(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Sections</label>
                  <input 
                    type="text" 
                    value={sectionGroup} 
                    onChange={e => setSectionGroup(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Batch Code</label>
                  <input 
                    type="text" 
                    value={batchCode} 
                    onChange={e => setBatchCode(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Effective Date</label>
                  <input 
                    type="text" 
                    value={effectiveDate} 
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none italic"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CELL SCHEDULE EDITOR */}
          {activeTab === 'cell' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {selectedCell ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-ink uppercase tracking-wide">Cell Editor</label>
                    <span className="text-[9px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded">
                      {selectedCell.day} @ {selectedCell.slot.start}
                    </span>
                  </div>

                  <div className="bg-canvas border border-hairline rounded-md p-3.5 space-y-4 shadow-sm">
                    {/* Course selector */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Registered Courses (Autofill)</label>
                      <select
                        value={formCourseId}
                        onChange={e => setFormCourseId(e.target.value)}
                        className="w-full h-8 px-2 border border-hairline bg-canvas text-xs rounded text-ink focus:border-primary focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Choose registered course --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.course_id} ({c.teacher_initials}) - {c.course_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Section</label>
                      <input 
                        type="text" 
                        value={formSection}
                        onChange={e => setFormSection(e.target.value)}
                        placeholder="e.g. H"
                        className="w-full h-8 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Room Number */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Room Number</label>
                      <input 
                        type="text" 
                        value={formRoomNumber}
                        onChange={e => setFormRoomNumber(e.target.value)}
                        placeholder="e.g. 712-B or AB3-107"
                        className="w-full h-8 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-hairline">
                      <button
                        disabled={savingCell}
                        onClick={handleSaveCellEntry}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-primary text-on-primary text-xs font-bold rounded hover:bg-primary-deep cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      >
                        {savingCell ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                        ) : (
                          <><Save className="w-3.5 h-3.5" /> Save Entry</>
                        )}
                      </button>

                      {getCellRoutines(selectedCell.day, selectedCell.slot).length > 0 && (
                        <button
                          onClick={() => handleDeleteCellEntry(getCellRoutines(selectedCell.day, selectedCell.slot)[0].id)}
                          className="py-1.5 px-3 border border-accent-tomato/20 text-accent-tomato bg-accent-tomato/5 hover:bg-accent-tomato/10 text-xs font-bold rounded cursor-pointer transition-colors"
                          title="Remove from cell"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-hairline rounded-md p-6 text-center text-xs text-gray-500 bg-canvas">
                  Click on any cell in the routine grid layout on the right to edit classes or create new schedules at that slot.
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 2. MAIN CANVAS VIEW AREA (Right 8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-[#f0f3f5] min-h-[500px]">
        
        {/* Toolbar Controls */}
        <div className="p-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3 bg-canvas no-export">
          
          {/* Zoom and Lock toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer border ${
                isLocked 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                  : 'bg-canvas border-hairline text-gray-600 hover:bg-canvas-soft'
              }`}
            >
              {isLocked ? (
                <><Lock className="w-3.5 h-3.5 text-amber-500" /> Locked</>
              ) : (
                <><Unlock className="w-3.5 h-3.5 text-gray-400" /> Unlocked</>
              )}
            </button>

            <div className="h-6 w-px bg-hairline" />

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setZoom(Math.max(40, zoom - 10))} 
                className="p-1.5 hover:bg-canvas-soft border border-hairline rounded cursor-pointer text-gray-400 hover:text-ink"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-medium px-1.5 w-12 text-center text-ink">{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(130, zoom + 10))} 
                className="p-1.5 hover:bg-canvas-soft border border-hairline rounded cursor-pointer text-gray-400 hover:text-ink"
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

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#f0f3f5]">
          
          {/* Zoom Wrapper */}
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }} 
            className="transition-transform duration-150 py-4"
          >
            
            {/* Poster Canvas */}
            <div
              ref={canvasRef}
              id="class-routine-canva-poster"
              style={{ 
                background: canvasGradient || canvasBg, 
                width: '750px',
                fontFamily: selectedFont
              }}
              className="p-8 space-y-6 shadow-xl relative select-none rounded border border-hairline transition-all duration-300"
            >
              
              {/* Header Box */}
              <div 
                style={{ 
                  backgroundColor: cellBg,
                  borderColor: borderColor
                }}
                className="p-5 text-center border transition-all duration-300 shadow-sm rounded-sm"
              >
                <h1 className="font-extrabold text-2xl tracking-tight leading-tight uppercase text-gray-900">
                  <InlineInput 
                    value={semesterTitle} 
                    onChange={setSemesterTitle} 
                    disabled={isLocked}
                  />
                </h1>
                <h2 className="text-sm tracking-widest font-semibold uppercase mt-1 text-gray-700 opacity-90">
                  <InlineInput 
                    value={sectionGroup} 
                    onChange={setSectionGroup} 
                    disabled={isLocked}
                  />
                </h2>
                <div className="text-xs text-gray-600 font-semibold mt-1 uppercase">
                  <InlineInput 
                    value={batchCode} 
                    onChange={setBatchCode} 
                    disabled={isLocked}
                  />
                </div>
                <div className="text-[11px] text-gray-500 italic mt-0.5">
                  <InlineInput 
                    value={effectiveDate} 
                    onChange={setEffectiveDate} 
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Weekly Timetable Grid Table */}
              <div className="overflow-hidden border rounded-sm" style={{ borderColor: borderColor }}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: dayHeaderBg, color: dayHeaderTextColor }}>
                      <th 
                        style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}`, color: dayHeaderTextColor }}
                        className="py-3 px-2 text-[10px] font-bold text-center w-28 uppercase"
                      >
                        ↓Time / Day →
                      </th>
                      {customDays.map((day: string) => (
                        <th 
                          key={day} 
                          style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}`, color: dayHeaderTextColor }}
                          className="py-3 px-2 text-xs font-bold text-center"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customSlots.map((slot: Slot, sIdx: number) => (
                      <tr key={sIdx} className="h-20" style={{ borderBottom: `1px solid ${borderColor}` }}>
                        
                        {/* Time Slot column */}
                        <td 
                          style={{ 
                            backgroundColor: timeColumnBg, 
                            color: timeTextColor,
                            borderRight: `1px solid ${borderColor}`
                          }}
                          className="py-2 px-1 text-center text-[10px] font-bold w-28 font-mono leading-tight"
                        >
                          {formatTimeRange(slot.start, slot.end)}
                        </td>

                        {/* Schedule cells */}
                        {customDays.map((day: string, dIdx: number) => {
                          const cellClasses = getCellRoutines(day, slot);
                          const isEmpty = cellClasses.length === 0;
                          
                          // Check if this cell is selected in the editor
                          const isSelected = selectedCell && 
                                             selectedCell.day === day && 
                                             selectedCell.slot.start === slot.start;

                          return (
                            <td 
                              key={dIdx}
                              onClick={() => handleCellClick(day, slot)}
                              style={{ 
                                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : cellBg,
                                color: cellTextColor,
                                borderRight: `1px solid ${borderColor}`,
                                borderStyle: isSelected ? 'solid' : 'solid',
                                borderWidth: isSelected ? '2px' : '1px',
                                borderColor: isSelected ? '#38bdf8' : borderColor
                              }}
                              className={`p-1.5 text-center text-xs align-middle cursor-pointer transition-all relative group select-none min-w-[100px] h-20 ${
                                isSelected ? 'shadow-inner' : 'hover:bg-slate-50'
                              }`}
                            >
                              {!isEmpty ? (
                                <div className="space-y-1">
                                  {cellClasses.map((r: Routine) => {
                                    const matchedCourse = courses.find(c => c.course_id === r.c_id);
                                    const initials = matchedCourse ? matchedCourse.teacher_initials : '';
                                    return (
                                      <div key={r.id} className="text-center font-sans">
                                        <div className="font-extrabold text-[11px] leading-tight">
                                          {r.c_id}{r.section ? ` ${r.section}` : ''}
                                        </div>
                                        {initials && (
                                          <div className="text-[10px] font-semibold opacity-75 leading-tight">
                                            ({initials})
                                          </div>
                                        )}
                                        <div className="text-[9px] opacity-75 font-mono leading-none mt-0.5">
                                          {r.room_number}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Plus className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                              )}
                            </td>
                          );
                        })}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default ClassCanvaEditor;
