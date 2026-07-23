import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { routinesAPI, filesAPI } from '../../services/api';
import TipTapEditor from '../announcement/TipTapEditor';
import { htmlToWhatsappMarkdown } from '../../lib/htmlParser';
import { 
  Palette, Download, Share2, Plus, Trash2, Copy, 
  Lock, Unlock, X, RefreshCw, ZoomIn, ZoomOut, Sliders, Type, Grid3X3, Calendar, Save, Trash, Edit, Check, AlignLeft, AlignCenter, AlignRight, ChevronDown, Bold, Italic, FileText
} from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import CustomSelect from '../ui/custom-select';

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
  onSaveLayout: (days: string[], slots: Slot[]) => void;
  onClose: () => void;
}

// Google Fonts list
const FONTS = [
  { name: 'Inter (Sans)', family: "'Inter', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap' },
  { name: 'Outfit (Modern)', family: "'Outfit', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap' },
  { name: 'Plus Jakarta', family: "'Plus Jakarta Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Poppins (Geometric)', family: "'Poppins', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800&display=swap' },
  { name: 'Montserrat (Display)', family: "'Montserrat', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap' },
  { name: 'Cinzel (Roman Elegance)', family: "'Cinzel', serif", link: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap' },
  { name: 'Lora (Editorial)', family: "'Lora', serif", link: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Fira Sans', family: "'Fira Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Nunito (Rounded)', family: "'Nunito', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap' },
  { name: 'Rubik (Soft Geo)', family: "'Rubik', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap' },
  { name: 'Quicksand (Cute)', family: "'Quicksand', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap' },
  { name: 'Manrope', family: "'Manrope', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap' },
  { name: 'Space Grotesk (Tech)', family: "'Space Grotesk', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap' },
  { name: 'Lexend', family: "'Lexend', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700;800&display=swap' },
  { name: 'DM Sans', family: "'DM Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Work Sans', family: "'Work Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Merriweather (Sturdy)', family: "'Merriweather', serif", link: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'PT Serif', family: "'PT Serif', serif", link: 'https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'EB Garamond (Classic)', family: "'EB Garamond', serif", link: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", link: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Crimson Text', family: "'Crimson Text', serif", link: 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Bodoni Moda (Luxury)', family: "'Bodoni Moda', serif", link: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Prata (Geometric Serif)', family: "'Prata', serif", link: 'https://fonts.googleapis.com/css2?family=Prata&display=swap' },
  { name: 'Syncopate (Extended)', family: "'Syncopate', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap' },
  { name: 'Kanit (Geo Sans)', family: "'Kanit', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;700;800&display=swap' },
  { name: 'Space Mono (Retro Tech)', family: "'Space Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,700;1,400&display=swap' }
];

// Predefined Class Routine Theme Palettes
const CLASS_THEMES = [
  {
    name: 'Classic Green & White',
    canvasBg: '#0F172A',
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
        className="bg-transparent border-b border-primary text-inherit focus:outline-none p-0 font-inherit text-inherit text-center max-w-full"
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

// Field formatting toolbar component (Bold, Italic, Weight, Align, Font Size)
interface FieldFormattingToolbarProps {
  label: string;
  bold: boolean;
  italic: boolean;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: number;
  defaultFontSize: number;
  defaultFontWeight?: number;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onChangeAlign?: (align: 'left' | 'center' | 'right') => void;
  onChangeFontSize?: (size: number) => void;
  onChangeFontWeight?: (weight: number) => void;
}

const FieldFormattingToolbar: React.FC<FieldFormattingToolbarProps> = ({
  label,
  bold,
  italic,
  align = 'left',
  fontSize,
  fontWeight,
  defaultFontSize,
  defaultFontWeight = 700,
  onToggleBold,
  onToggleItalic,
  onChangeAlign,
  onChangeFontSize,
  onChangeFontWeight,
}) => {
  const isBoldActive = bold !== false && (fontWeight ? fontWeight >= 700 : true);
  const currentWeight = bold === false ? 400 : (fontWeight || (bold ? 700 : 400));

  const handleBoldClick = () => {
    if (isBoldActive) {
      onToggleBold();
      if (onChangeFontWeight) onChangeFontWeight(400);
    } else {
      onToggleBold();
      if (onChangeFontWeight) onChangeFontWeight(defaultFontWeight || 700);
    }
  };

  const handleWeightChange = (newWeight: number) => {
    if (onChangeFontWeight) onChangeFontWeight(newWeight);
    if (newWeight >= 700 && bold === false) {
      onToggleBold();
    } else if (newWeight < 700 && bold !== false) {
      onToggleBold();
    }
  };

  return (
    <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
      <label className="block text-[9px] uppercase font-bold text-gray-500">{label}</label>
      <div className="flex items-center gap-0.5 bg-canvas-soft/80 p-0.5 rounded border border-hairline/60">
        <button
          type="button"
          onClick={handleBoldClick}
          className={`p-0.5 rounded cursor-pointer transition-colors ${
            isBoldActive ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
          }`}
          title={isBoldActive ? "Unbold (Regular 400)" : "Bold (700)"}
        >
          <Bold className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onToggleItalic}
          className={`p-0.5 rounded cursor-pointer transition-colors ${
            italic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
          }`}
          title="Toggle Italic"
        >
          <Italic className="w-3 h-3" />
        </button>

        {onChangeFontWeight && (
          <>
            <div className="w-px h-3 bg-gray-300 mx-0.5" />
            <div className="flex items-center gap-0.5" title="Font Weight (300 Light - 900 Black)">
              <span className="text-[8px] font-bold text-gray-400 pl-0.5">WT</span>
              <select
                value={currentWeight}
                onChange={(e) => handleWeightChange(parseInt(e.target.value, 10))}
                className="h-4 text-[9px] font-mono bg-white border border-hairline rounded text-ink focus:outline-none focus:border-primary px-0.5 py-0 cursor-pointer"
              >
                <option value={300}>300 Light</option>
                <option value={400}>400 Normal</option>
                <option value={500}>500 Medium</option>
                <option value={600}>600 SemiBold</option>
                <option value={700}>700 Bold</option>
                <option value={800}>800 ExBold</option>
                <option value={900}>900 Black</option>
              </select>
            </div>
          </>
        )}

        {onChangeAlign && (
          <>
            <div className="w-px h-3 bg-gray-300 mx-0.5" />
            <button
              type="button"
              onClick={() => onChangeAlign('left')}
              className={`p-0.5 rounded cursor-pointer transition-colors ${
                align === 'left' ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onChangeAlign('center')}
              className={`p-0.5 rounded cursor-pointer transition-colors ${
                align === 'center' ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onChangeAlign('right')}
              className={`p-0.5 rounded cursor-pointer transition-colors ${
                align === 'right' ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </>
        )}

        {onChangeFontSize && (
          <>
            <div className="w-px h-3 bg-gray-300 mx-0.5" />
            <div className="flex items-center gap-0.5" title="Font Size (px)">
              <span className="text-[8px] font-bold text-gray-400 pl-0.5">SIZE</span>
              <input
                type="number"
                min={8}
                max={48}
                value={fontSize || defaultFontSize}
                onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10) || defaultFontSize)}
                className="w-9 h-4 text-[9px] font-mono text-center bg-white border border-hairline rounded text-ink focus:outline-none focus:border-primary p-0"
              />
            </div>
          </>
        )}
      </div>
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
  onSaveLayout
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Layout and theme states
  const [selectedFont, setSelectedFont] = useState("'Montserrat', sans-serif");
  const [activeTab, setActiveTab] = useState<'theme' | 'headers' | 'grid' | 'cell'>('theme');
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [routineNotes, setRoutineNotes] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Text Styling States
  const [globalFontWeight, setGlobalFontWeight] = useState<number>(700);

  const [semesterTitleBold, setSemesterTitleBold] = useState(true);
  const [semesterTitleItalic, setSemesterTitleItalic] = useState(false);
  const [semesterTitleFontWeight, setSemesterTitleFontWeight] = useState<number>(800);
  const [semesterTitleFontSize, setSemesterTitleFontSize] = useState<number>(22);
  const [semesterTitleAlign, setSemesterTitleAlign] = useState<'left' | 'center' | 'right'>('center');

  const [sectionGroupBold, setSectionGroupBold] = useState(true);
  const [sectionGroupItalic, setSectionGroupItalic] = useState(false);
  const [sectionGroupFontWeight, setSectionGroupFontWeight] = useState<number>(700);
  const [sectionGroupFontSize, setSectionGroupFontSize] = useState<number>(14);
  const [sectionGroupAlign, setSectionGroupAlign] = useState<'left' | 'center' | 'right'>('center');

  const [batchCodeBold, setBatchCodeBold] = useState(true);
  const [batchCodeItalic, setBatchCodeItalic] = useState(false);
  const [batchCodeFontWeight, setBatchCodeFontWeight] = useState<number>(700);
  const [batchCodeFontSize, setBatchCodeFontSize] = useState<number>(13);
  const [batchCodeAlign, setBatchCodeAlign] = useState<'left' | 'center' | 'right'>('center');

  const [effectiveDateBold, setEffectiveDateBold] = useState(false);
  const [effectiveDateItalic, setEffectiveDateItalic] = useState(true);
  const [effectiveDateFontWeight, setEffectiveDateFontWeight] = useState<number>(500);
  const [effectiveDateFontSize, setEffectiveDateFontSize] = useState<number>(11);
  const [effectiveDateAlign, setEffectiveDateAlign] = useState<'left' | 'center' | 'right'>('center');

  // Cell & Grid formatting states
  const [courseCodeFontWeight, setCourseCodeFontWeight] = useState<number>(700);
  const [courseCodeFontSize, setCourseCodeFontSize] = useState<number>(11);

  const [teacherCodeFontWeight, setTeacherCodeFontWeight] = useState<number>(600);
  const [teacherCodeFontSize, setTeacherCodeFontSize] = useState<number>(9);

  const [roomNumberFontWeight, setRoomNumberFontWeight] = useState<number>(500);
  const [roomNumberFontSize, setRoomNumberFontSize] = useState<number>(9);

  const [dayHeaderFontWeight, setDayHeaderFontWeight] = useState<number>(700);
  const [dayHeaderFontSize, setDayHeaderFontSize] = useState<number>(12);

  const [timeColumnFontWeight, setTimeColumnFontWeight] = useState<number>(600);
  const [timeColumnFontSize, setTimeColumnFontSize] = useState<number>(10);

  const [savingData, setSavingData] = useState<boolean>(false);

  // Active theme properties
  const [canvasBg, setCanvasBg] = useState('#0F172A');
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

  // Alignment Options
  const [headerAlign, setHeaderAlign] = useState<'left' | 'center' | 'right'>('center');
  const [cellAlign, setCellAlign] = useState<'left' | 'center' | 'right'>('center');

  // Helper handlers to globally update Header and Grid alignment across all fields
  const handleHeaderAlignChange = (align: 'left' | 'center' | 'right') => {
    setHeaderAlign(align);
    setSemesterTitleAlign(align);
    setSectionGroupAlign(align);
    setBatchCodeAlign(align);
    setEffectiveDateAlign(align);
  };

  const handleGridAlignChange = (align: 'left' | 'center' | 'right') => {
    setCellAlign(align);
  };

  const handleGlobalFontWeightChange = (weight: number) => {
    setGlobalFontWeight(weight);
    setSemesterTitleFontWeight(weight);
    setSectionGroupFontWeight(weight);
    setBatchCodeFontWeight(weight);
    setEffectiveDateFontWeight(weight);
    setCourseCodeFontWeight(weight);
    setTeacherCodeFontWeight(weight);
    setRoomNumberFontWeight(weight);
    setDayHeaderFontWeight(weight);
    setTimeColumnFontWeight(weight);
  };

  const handleSaveRoutineData = async () => {
    setSavingData(true);
    try {
      localStorage.setItem('class_canva_custom_style', JSON.stringify({
        selectedFont,
        globalFontWeight,
        semesterTitleFontWeight, semesterTitleFontSize, semesterTitleAlign, semesterTitleBold, semesterTitleItalic,
        sectionGroupFontWeight, sectionGroupFontSize, sectionGroupAlign, sectionGroupBold, sectionGroupItalic,
        batchCodeFontWeight, batchCodeFontSize, batchCodeAlign, batchCodeBold, batchCodeItalic,
        effectiveDateFontWeight, effectiveDateFontSize, effectiveDateAlign, effectiveDateBold, effectiveDateItalic,
        courseCodeFontWeight, courseCodeFontSize,
        teacherCodeFontWeight, teacherCodeFontSize,
        roomNumberFontWeight, roomNumberFontSize,
        dayHeaderFontWeight, dayHeaderFontSize,
        timeColumnFontWeight, timeColumnFontSize,
        canvasBg, canvasGradient, headerBg, headerTextColor, timeColumnBg, timeTextColor, dayHeaderBg, dayHeaderTextColor, cellBg, cellTextColor, borderColor,
        headerAlign, cellAlign
      }));
      toast.success('Class routine formatting & data saved!');
    } catch (e: any) {
      toast.error('Failed to save settings');
    } finally {
      setSavingData(false);
    }
  };

  // Selected cell position
  const [selectedCell, setSelectedCell] = useState<{ day: string; slot: Slot } | null>(null);

  // Form states for selected class entry editing
  const [formCourseId, setFormCourseId] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  // Grid layout add form states
  const [newDayName, setNewDayName] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('08:30');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');

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
    if (!formCourseId || !formRoomNumber) {
      toast.error('Please select a Course and specify a Room Number');
      return;
    }

    setSavingCell(true);
    try {
      const cellClasses = getCellRoutines(selectedCell.day, selectedCell.slot);
      const cleanSection = formSection.trim() === '.' ? '' : formSection.trim();
      
      const payload = {
        course_id: parseInt(formCourseId),
        day_of_week: selectedCell.day.toLowerCase(),
        start_time: selectedCell.slot.start,
        end_time: selectedCell.slot.end,
        room_number: formRoomNumber.trim(),
        section: cleanSection || null
      };

      if (cellClasses.length > 0) {
        await routinesAPI.update(cellClasses[0].id, payload);
        toast.success('Updated class schedule entry');
      } else {
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
      setFormCourseId(courses[0]?.id?.toString() || '');
      setFormSection('');
      setFormRoomNumber('');
    } catch (err: any) {
      toast.error('Failed to remove entry: ' + err.message);
    }
  };

  // Grid Configuration Handlers
  const handleRenameDay = (idx: number, newName: string) => {
    const updated = [...customDays];
    updated[idx] = newName;
    onSaveLayout(updated, customSlots);
  };

  const handleDeleteDay = (idx: number) => {
    if (customDays.length <= 1) {
      toast.error('Must keep at least one day in the grid');
      return;
    }
    const updated = customDays.filter((_, i) => i !== idx);
    onSaveLayout(updated, customSlots);
    toast.success('Day removed from routine grid');
  };

  const handleAddDay = () => {
    if (!newDayName.trim()) {
      toast.error('Day name cannot be empty');
      return;
    }
    if (customDays.map(d => d.toLowerCase()).includes(newDayName.trim().toLowerCase())) {
      toast.error('Day already exists in layout');
      return;
    }
    const updated = [...customDays, newDayName.trim()];
    onSaveLayout(updated, customSlots);
    setNewDayName('');
    toast.success(`Added ${newDayName.trim()} to routine grid`);
  };

  const handleRenameSlot = (idx: number, field: keyof Slot, newTime: string) => {
    const updated = customSlots.map((s, i) => i === idx ? { ...s, [field]: newTime } : s);
    onSaveLayout(customDays, updated);
  };

  const handleDeleteSlot = (idx: number) => {
    if (customSlots.length <= 1) {
      toast.error('Must keep at least one time slot in the grid');
      return;
    }
    const updated = customSlots.filter((_, i) => i !== idx);
    onSaveLayout(customDays, updated);
    toast.success('Time slot removed from grid');
  };

  const handleAddSlot = () => {
    if (!newSlotStart || !newSlotEnd) {
      toast.error('Please specify start and end times');
      return;
    }
    const updated = [...customSlots, { start: newSlotStart, end: newSlotEnd }];
    // Sort slots chronologically
    updated.sort((a, b) => a.start.localeCompare(b.start));
    onSaveLayout(customDays, updated);
    toast.success('Added new time slot to routine grid');
  };

  // Format time display
  const formatTimeRange = (start: string, end: string) => {
    return `${start} – ${end}`;
  };

  // Apply Theme Palette
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

      const notesMarkdown = routineNotes ? htmlToWhatsappMarkdown(routineNotes) : '';
      const defaultBody = `📢 *Updated Class Routine Notice*\n\nClass routine for *${semesterTitle}* (${sectionGroup}) Swe ${batchCode} has been updated. Please check the attached routine schedule image for details.\n\n_Effective from: ${effectiveDate}_\n\nAdjust your plans accordingly. Thank you! 📅`;
      const preFillBody = notesMarkdown ? `${defaultBody}\n\n📝 *Routine Notes & Instructions:*\n${notesMarkdown}` : defaultBody;

      navigate('/announcement/new', {
        state: {
          preFillTitle: `Updated Class Routine - ${semesterTitle}`,
          preFillBody,
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
    <div className="bg-canvas border border-hairline rounded-lg shadow-md overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full select-none">
      
      {/* 1. SIDEBAR: Controls & Settings (Left 4 cols) */}
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas-soft flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
        
        <div className="p-4 border-b border-hairline flex items-center bg-canvas flex-shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-bold text-ink">Class Routine Canva Editor</h2>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-hairline bg-canvas p-1 gap-1 flex-shrink-0">
          <button 
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'theme' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Theme
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
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'grid' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Grid Setup
          </button>
          <button 
            onClick={() => setActiveTab('cell')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'cell' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Cell
            {selectedCell && (
              <span className="w-1.5 h-1.5 bg-primary rounded-full absolute top-1 right-2"></span>
            )}
          </button>
        </div>

        {/* Settings Sections (Scrollable) */}
        <div className="p-4 space-y-6 flex-grow lg:flex-1 lg:overflow-y-auto bg-canvas-soft">

          {/* TAB 1: Theme & Style Settings */}
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
                {/* Font Family & Weight Selection */}
                <div className="space-y-3 pt-2 border-t border-hairline">
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">Font Family</label>
                    <CustomSelect
                      value={selectedFont}
                      onChange={(val) => setSelectedFont(val)}
                      options={FONTS.map(f => ({ value: f.family, label: f.name }))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wide">Font Weight Theme</label>
                      <span className="text-[10px] font-mono text-primary font-bold">{globalFontWeight}</span>
                    </div>
                    <CustomSelect
                      value={globalFontWeight.toString()}
                      onChange={(val) => handleGlobalFontWeightChange(parseInt(val, 10))}
                      size="sm"
                      options={[
                        { value: '300', label: '300 Light (Thin / Elegant)' },
                        { value: '400', label: '400 Regular / Normal' },
                        { value: '500', label: '500 Medium' },
                        { value: '600', label: '600 SemiBold' },
                        { value: '700', label: '700 Bold (Standard)' },
                        { value: '800', label: '800 ExtraBold (Heavy)' },
                        { value: '900', label: '900 Black (Ultra Heavy)' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-3 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Alignment</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Header text</label>
                    <div className="flex bg-canvas p-0.5 rounded border border-hairline">
                      <button 
                        onClick={() => handleHeaderAlignChange('left')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${headerAlign === 'left' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleHeaderAlignChange('center')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${headerAlign === 'center' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleHeaderAlignChange('right')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${headerAlign === 'right' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Grid Cells</label>
                    <div className="flex bg-canvas p-0.5 rounded border border-hairline">
                      <button 
                        onClick={() => handleGridAlignChange('left')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cellAlign === 'left' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleGridAlignChange('center')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cellAlign === 'center' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleGridAlignChange('right')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cellAlign === 'right' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Colors */}
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
                  <FieldFormattingToolbar
                    label="Semester Title"
                    bold={semesterTitleBold}
                    italic={semesterTitleItalic}
                    align={semesterTitleAlign}
                    fontSize={semesterTitleFontSize}
                    fontWeight={semesterTitleFontWeight}
                    defaultFontSize={22}
                    onToggleBold={() => setSemesterTitleBold(semesterTitleBold === false ? true : false)}
                    onToggleItalic={() => setSemesterTitleItalic(!semesterTitleItalic)}
                    onChangeAlign={(align) => setSemesterTitleAlign(align)}
                    onChangeFontSize={(size) => setSemesterTitleFontSize(size)}
                    onChangeFontWeight={(weight) => setSemesterTitleFontWeight(weight)}
                  />
                  <input 
                    type="text" 
                    value={semesterTitle} 
                    onChange={e => setSemesterTitle(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <FieldFormattingToolbar
                    label="Sections"
                    bold={sectionGroupBold}
                    italic={sectionGroupItalic}
                    align={sectionGroupAlign}
                    fontSize={sectionGroupFontSize}
                    fontWeight={sectionGroupFontWeight}
                    defaultFontSize={14}
                    onToggleBold={() => setSectionGroupBold(sectionGroupBold === false ? true : false)}
                    onToggleItalic={() => setSectionGroupItalic(!sectionGroupItalic)}
                    onChangeAlign={(align) => setSectionGroupAlign(align)}
                    onChangeFontSize={(size) => setSectionGroupFontSize(size)}
                    onChangeFontWeight={(weight) => setSectionGroupFontWeight(weight)}
                  />
                  <input 
                    type="text" 
                    value={sectionGroup} 
                    onChange={e => setSectionGroup(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <FieldFormattingToolbar
                    label="Batch Code"
                    bold={batchCodeBold}
                    italic={batchCodeItalic}
                    align={batchCodeAlign}
                    fontSize={batchCodeFontSize}
                    fontWeight={batchCodeFontWeight}
                    defaultFontSize={13}
                    onToggleBold={() => setBatchCodeBold(batchCodeBold === false ? true : false)}
                    onToggleItalic={() => setBatchCodeItalic(!batchCodeItalic)}
                    onChangeAlign={(align) => setBatchCodeAlign(align)}
                    onChangeFontSize={(size) => setBatchCodeFontSize(size)}
                    onChangeFontWeight={(weight) => setBatchCodeFontWeight(weight)}
                  />
                  <input 
                    type="text" 
                    value={batchCode} 
                    onChange={e => setBatchCode(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <FieldFormattingToolbar
                    label="Effective Date"
                    bold={effectiveDateBold}
                    italic={effectiveDateItalic}
                    align={effectiveDateAlign}
                    fontSize={effectiveDateFontSize}
                    fontWeight={effectiveDateFontWeight}
                    defaultFontSize={11}
                    onToggleBold={() => setEffectiveDateBold(effectiveDateBold === false ? true : false)}
                    onToggleItalic={() => setEffectiveDateItalic(!effectiveDateItalic)}
                    onChangeAlign={(align) => setEffectiveDateAlign(align)}
                    onChangeFontSize={(size) => setEffectiveDateFontSize(size)}
                    onChangeFontWeight={(weight) => setEffectiveDateFontWeight(weight)}
                  />
                  <input 
                    type="text" 
                    value={effectiveDate} 
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none italic"
                  />
                </div>
              </div>

              {/* Routine Notes & Instructions (TipTap Rich Text Editor) */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide">Instructions & Notes</label>
                  <label className="flex items-center gap-1.5 text-xs text-primary font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showInstructions} 
                      onChange={(e) => setShowInstructions(e.target.checked)}
                      className="rounded accent-primary w-3.5 h-3.5 cursor-pointer" 
                    />
                    Show Box on Poster
                  </label>
                </div>
                <p className="text-[11px] text-gray-500">Format instructions or class notes with custom fonts, bold, and lists!</p>
                <TipTapEditor 
                  value={routineNotes} 
                  onChange={(val) => {
                    setRoutineNotes(val);
                    if (val && val.trim() && val !== '<p></p>') {
                      setShowInstructions(true);
                    }
                  }} 
                  placeholder="e.g. 1. Classes start sharp on time. 2. Lab classes held in 6th floor lab room..." 
                />
              </div>
            </div>
          )}

          {/* TAB 3: GRID LAYOUT CONFIGURATION (DAYS & TIMINGS) */}
          {activeTab === 'grid' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Days Management */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Manage Days</label>
                <div className="space-y-2 bg-canvas border border-hairline rounded-md p-3.5">
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {customDays.map((day, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={day}
                          onChange={e => handleRenameDay(idx, e.target.value)}
                          className="flex-1 h-8 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-semibold"
                        />
                        <button
                          onClick={() => handleDeleteDay(idx)}
                          className="p-1.5 text-gray-400 hover:text-accent-tomato hover:bg-accent-tomato/5 rounded transition-colors cursor-pointer"
                          title="Delete Day"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-hairline flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add Day (e.g. Wednesday)"
                      value={newDayName}
                      onChange={e => setNewDayName(e.target.value)}
                      className="flex-1 h-8 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleAddDay}
                      className="p-2 bg-primary text-on-primary rounded hover:bg-primary-deep cursor-pointer"
                      title="Add Day"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Slots Management */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Manage Time Slots</label>
                <div className="space-y-2 bg-canvas border border-hairline rounded-md p-3.5">
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {customSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        <input
                          type="text"
                          value={slot.start}
                          onChange={e => handleRenameSlot(idx, 'start', e.target.value)}
                          className="w-16 h-8 text-center border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-mono"
                        />
                        <span className="text-gray-400 font-bold">–</span>
                        <input
                          type="text"
                          value={slot.end}
                          onChange={e => handleRenameSlot(idx, 'end', e.target.value)}
                          className="w-16 h-8 text-center border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => handleDeleteSlot(idx)}
                          className="p-1.5 text-gray-400 hover:text-accent-tomato hover:bg-accent-tomato/5 rounded transition-colors cursor-pointer"
                          title="Delete slot"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-hairline space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-ink">
                      <input
                        type="text"
                        placeholder="Start"
                        value={newSlotStart}
                        onChange={e => setNewSlotStart(e.target.value)}
                        className="w-20 h-8 text-center border border-hairline bg-canvas rounded font-mono focus:border-primary focus:outline-none"
                      />
                      <span className="text-gray-400 font-bold">–</span>
                      <input
                        type="text"
                        placeholder="End"
                        value={newSlotEnd}
                        onChange={e => setNewSlotEnd(e.target.value)}
                        className="w-20 h-8 text-center border border-hairline bg-canvas rounded font-mono focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={handleAddSlot}
                        className="flex-1 h-8 flex items-center justify-center gap-1 bg-primary text-on-primary rounded hover:bg-primary-deep text-xs font-semibold cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Slot
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CELL SCHEDULE EDITOR */}
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
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Teacher & Course</label>
                      <CustomSelect
                        value={formCourseId}
                        onChange={(val) => setFormCourseId(val)}
                        placeholder="-- Choose registered course --"
                        options={[
                          { value: '', label: '-- Choose registered course --' },
                          ...courses.map(c => ({ value: String(c.id), label: `${c.course_id} (${c.teacher_initials}) - ${c.course_name}` })),
                        ]}
                        size="sm"
                      />
                    </div>

                    {/* Section (Optional) */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center justify-between">
                        <span>Section</span>
                        <span className="text-[9px] font-normal text-gray-400 lowercase">(optional)</span>
                      </label>
                      <input 
                        type="text" 
                        value={formSection}
                        onChange={e => setFormSection(e.target.value)}
                        placeholder="e.g. H (Leave empty if in course name)"
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

              {/* Global Grid & Cell Typography Controls */}
              <div className="bg-canvas border border-hairline rounded-md p-3.5 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide border-b border-hairline pb-1.5">Cell Typography & Weights</label>
                
                <FieldFormattingToolbar
                  label="Day Headers (Sat, Sun...)"
                  bold={dayHeaderFontWeight >= 700}
                  italic={false}
                  fontSize={dayHeaderFontSize}
                  fontWeight={dayHeaderFontWeight}
                  defaultFontSize={12}
                  onToggleBold={() => setDayHeaderFontWeight(dayHeaderFontWeight >= 700 ? 400 : 700)}
                  onToggleItalic={() => {}}
                  onChangeFontSize={(size) => setDayHeaderFontSize(size)}
                  onChangeFontWeight={(weight) => setDayHeaderFontWeight(weight)}
                />

                <FieldFormattingToolbar
                  label="Time Slots Column"
                  bold={timeColumnFontWeight >= 700}
                  italic={false}
                  fontSize={timeColumnFontSize}
                  fontWeight={timeColumnFontWeight}
                  defaultFontSize={10}
                  onToggleBold={() => setTimeColumnFontWeight(timeColumnFontWeight >= 700 ? 400 : 700)}
                  onToggleItalic={() => {}}
                  onChangeFontSize={(size) => setTimeColumnFontSize(size)}
                  onChangeFontWeight={(weight) => setTimeColumnFontWeight(weight)}
                />

                <FieldFormattingToolbar
                  label="Course Code (e.g. SE333)"
                  bold={courseCodeFontWeight >= 700}
                  italic={false}
                  fontSize={courseCodeFontSize}
                  fontWeight={courseCodeFontWeight}
                  defaultFontSize={11}
                  onToggleBold={() => setCourseCodeFontWeight(courseCodeFontWeight >= 700 ? 400 : 700)}
                  onToggleItalic={() => {}}
                  onChangeFontSize={(size) => setCourseCodeFontSize(size)}
                  onChangeFontWeight={(weight) => setCourseCodeFontWeight(weight)}
                />

                <FieldFormattingToolbar
                  label="Teacher Initials Badge"
                  bold={teacherCodeFontWeight >= 700}
                  italic={false}
                  fontSize={teacherCodeFontSize}
                  fontWeight={teacherCodeFontWeight}
                  defaultFontSize={9}
                  onToggleBold={() => setTeacherCodeFontWeight(teacherCodeFontWeight >= 700 ? 400 : 700)}
                  onToggleItalic={() => {}}
                  onChangeFontSize={(size) => setTeacherCodeFontSize(size)}
                  onChangeFontWeight={(weight) => setTeacherCodeFontWeight(weight)}
                />

                <FieldFormattingToolbar
                  label="Room Number (e.g. 712B)"
                  bold={roomNumberFontWeight >= 700}
                  italic={false}
                  fontSize={roomNumberFontSize}
                  fontWeight={roomNumberFontWeight}
                  defaultFontSize={9}
                  onToggleBold={() => setRoomNumberFontWeight(roomNumberFontWeight >= 700 ? 400 : 700)}
                  onToggleItalic={() => {}}
                  onChangeFontSize={(size) => setRoomNumberFontSize(size)}
                  onChangeFontWeight={(weight) => setRoomNumberFontWeight(weight)}
                />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 2. MAIN CANVAS VIEW AREA (Right 8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-[550px] lg:h-full bg-[#f8fafc] overflow-hidden">
        
        {/* Toolbar Controls */}
        <div className="p-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3 bg-canvas no-export flex-shrink-0">
          
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
              disabled={savingData}
              onClick={handleSaveRoutineData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-hairline rounded hover:bg-canvas-soft bg-canvas text-ink cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              title="Save routine design, custom formatting and grid layout"
            >
              {savingData ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Saving...</>
              ) : (
                <><Save className="w-3.5 h-3.5 text-primary" /> Save Routine Data</>
              )}
            </button>
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

        {/* Scrollable Workspace (Figma Dot Grid Style) */}
        <div 
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '16px 16px'
          }}
          className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#f8fafc]"
        >
          
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
              className="p-8 space-y-6 shadow-2xl relative select-none rounded border border-hairline transition-all duration-300"
            >
              
              {/* Header Box */}
              <div 
                style={{ 
                  backgroundColor: cellBg,
                  borderColor: borderColor,
                  textAlign: headerAlign
                }}
                className="p-5 border transition-all duration-300 shadow-sm rounded-sm"
              >
                <h1 
                  style={{
                    fontWeight: semesterTitleBold === false ? 400 : (semesterTitleFontWeight || 800),
                    fontStyle: semesterTitleItalic ? 'italic' : 'normal',
                    textAlign: semesterTitleAlign || headerAlign,
                    fontSize: `${semesterTitleFontSize || 22}px`
                  }}
                  className="tracking-tight leading-tight uppercase text-gray-900"
                >
                  <InlineInput 
                    value={semesterTitle} 
                    onChange={setSemesterTitle} 
                    disabled={isLocked}
                  />
                </h1>
                <h2 
                  style={{
                    fontWeight: sectionGroupBold === false ? 400 : (sectionGroupFontWeight || 700),
                    fontStyle: sectionGroupItalic ? 'italic' : 'normal',
                    textAlign: sectionGroupAlign || headerAlign,
                    fontSize: `${sectionGroupFontSize || 14}px`
                  }}
                  className="tracking-widest uppercase mt-1 text-gray-700 opacity-90"
                >
                  <InlineInput 
                    value={sectionGroup} 
                    onChange={setSectionGroup} 
                    disabled={isLocked}
                  />
                </h2>
                <div 
                  style={{
                    fontWeight: batchCodeBold === false ? 400 : (batchCodeFontWeight || 700),
                    fontStyle: batchCodeItalic ? 'italic' : 'normal',
                    textAlign: batchCodeAlign || headerAlign,
                    fontSize: `${batchCodeFontSize || 13}px`
                  }}
                  className="text-gray-600 mt-1 uppercase"
                >
                  <InlineInput 
                    value={batchCode} 
                    onChange={setBatchCode} 
                    disabled={isLocked}
                  />
                </div>
                <div 
                  style={{
                    fontWeight: effectiveDateBold === false ? 400 : (effectiveDateFontWeight || 500),
                    fontStyle: effectiveDateItalic ? 'italic' : 'normal',
                    textAlign: effectiveDateAlign || headerAlign,
                    fontSize: `${effectiveDateFontSize || 11}px`
                  }}
                  className="text-gray-500 mt-0.5"
                >
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
                        style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}`, color: dayHeaderTextColor, fontWeight: dayHeaderFontWeight || 700, fontSize: `${dayHeaderFontSize || 12}px` }}
                        className="py-3 px-2 text-center w-28 uppercase tracking-wide"
                      >
                        ↓Time / Day →
                      </th>
                      {customDays.map((day: string) => (
                        <th 
                          key={day} 
                          style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}`, color: dayHeaderTextColor, fontWeight: dayHeaderFontWeight || 700, fontSize: `${dayHeaderFontSize || 12}px` }}
                          className="py-3 px-2 text-center tracking-wide uppercase"
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
                            borderRight: `1px solid ${borderColor}`,
                            fontWeight: timeColumnFontWeight || 600,
                            fontSize: `${timeColumnFontSize || 10}px`
                          }}
                          className="py-2 px-1 text-center w-28 font-mono leading-tight"
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
                                backgroundColor: isSelected 
                                  ? (cellTextColor.toLowerCase() === '#f1f5f9' || 
                                     cellTextColor.toLowerCase() === '#f8fafc' || 
                                     cellTextColor.toLowerCase() === '#ffffff' || 
                                     cellTextColor.toLowerCase() === '#38bdf8' 
                                      ? '#1E293B' 
                                      : '#E0F2FE')
                                  : cellBg,
                                color: cellTextColor,
                                borderRight: `1px solid ${borderColor}`,
                                borderStyle: isSelected ? 'solid' : 'solid',
                                borderWidth: isSelected ? '2px' : '1px',
                                borderColor: isSelected ? '#38bdf8' : borderColor,
                                textAlign: cellAlign
                              }}
                              className={`p-1.5 text-xs align-middle cursor-pointer transition-all relative group select-none min-w-[100px] h-20 ${
                                isSelected ? 'shadow-inner' : 'hover:bg-slate-50'
                              }`}
                            >
                              {!isEmpty ? (
                                <div className="space-y-1">
                                  {cellClasses.map((r: Routine) => {
                                    const matchedCourse = courses.find(c => c.course_id === r.c_id);
                                    const initials = matchedCourse ? matchedCourse.teacher_initials : '';
                                    const cleanSec = r.section && r.section.trim() !== '.' ? r.section.trim() : '';
                                    const displayCode = cleanSec ? `${r.c_id} ${cleanSec}` : r.c_id;
                                    return (
                                      <div key={r.id} className="font-sans" style={{ textAlign: cellAlign }}>
                                        <div 
                                          style={{
                                            fontWeight: courseCodeFontWeight || 700,
                                            fontSize: `${courseCodeFontSize || 11}px`
                                          }}
                                          className="leading-tight"
                                        >
                                          {displayCode}
                                        </div>
                                        {initials && (
                                          <div 
                                            style={{
                                              backgroundColor: cellTextColor.toLowerCase() === '#f1f5f9' || cellTextColor.toLowerCase() === '#f8fafc' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                              color: cellTextColor,
                                              borderColor: borderColor,
                                              fontWeight: teacherCodeFontWeight || 600,
                                              fontSize: `${teacherCodeFontSize || 9}px`
                                            }}
                                            className="px-1.5 py-0.5 rounded border my-0.5 inline-block tracking-wider"
                                          >
                                            {initials}
                                          </div>
                                        )}
                                        <div 
                                          style={{
                                            fontWeight: roomNumberFontWeight || 500,
                                            fontSize: `${roomNumberFontSize || 9}px`
                                          }}
                                          className="opacity-75 font-mono leading-none mt-0.5"
                                        >
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

              {/* Optional Routine Notes & Instructions Box */}
              {showInstructions && routineNotes && routineNotes !== '<p></p>' && (
                <div 
                  onClick={() => { if (!isLocked) setActiveTab('headers'); }}
                  style={{ 
                    backgroundColor: cellBg,
                    color: cellTextColor,
                    borderColor: borderColor
                  }}
                  className={`p-4 border text-left transition-all duration-300 rounded-lg space-y-2 mt-4 cursor-pointer hover:ring-2 hover:ring-primary/40 relative group`}
                  title={isLocked ? undefined : 'Click to edit Instructions & Notes with TipTap'}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider opacity-80 border-b border-hairline/60 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Instructions & Notes</span>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInstructions(false);
                        }}
                        className="p-0.5 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer border-none bg-transparent"
                        title="Remove Instructions Box from poster"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div 
                    className="prose prose-xs max-w-none text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: routineNotes }}
                  />
                </div>
              )}

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default ClassCanvaEditor;
