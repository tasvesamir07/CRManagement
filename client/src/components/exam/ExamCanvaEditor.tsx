import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI, examRoutinesAPI } from '../../services/api';
import TipTapEditor from '../announcement/TipTapEditor';
import { htmlToWhatsappMarkdown } from '../../lib/htmlParser';
import { 
  Palette, Download, Share2, Plus, Trash2, Copy, 
  MoveUp, MoveDown, Lock, Unlock, X, RefreshCw, 
  ZoomIn, ZoomOut, Sliders, Type, Grid3X3, AlignLeft, AlignCenter, AlignRight, Save,
  ChevronDown, Bold, Italic, FileText
} from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import CustomSelect from '../ui/custom-select';

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
  courseCodeBold?: boolean;
  courseCodeItalic?: boolean;
  courseCodeAlign?: 'left' | 'center' | 'right';
  courseCodeFontSize?: number;

  examDateBold?: boolean;
  examDateItalic?: boolean;
  examDateAlign?: 'left' | 'center' | 'right';
  examDateFontSize?: number;

  courseNameBold?: boolean;
  courseNameItalic?: boolean;
  courseNameAlign?: 'left' | 'center' | 'right';
  courseNameFontSize?: number;

  examTimeBold?: boolean;
  examTimeItalic?: boolean;
  examTimeAlign?: 'left' | 'center' | 'right';
  examTimeFontSize?: number;

  roomsBold?: boolean;
  roomsItalic?: boolean;
  roomsAlign?: 'left' | 'center' | 'right';
  roomsFontSize?: number;

  cardHeightPx?: number;
  cardPadding?: string;

  leftColWidth?: number;
  rightColWidth?: number;
  showLeftDivider?: boolean;
  showRightDivider?: boolean;
  vLineColor?: string;
  vLineStyle?: 'solid' | 'dashed' | 'dotted';
  vLineOpacity?: number;
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
  { name: 'Dark Slate', value: '#0F172A', gradient: '' }
];

// Predefined Theme Palettes
const THEME_PALETTES = [
  {
    name: 'Classic Canva Blue-Gray',
    canvasBg: '#E4ECF0',
    canvasGradient: '',
    cardBg: '#FFFFFF',
    cardTextColor: '#171717',
    cardBorderType: 'none',
    cardShadow: 'shadow-sm',
    cardBorderColor: '#dfdfdf'
  },
  {
    name: 'Retro Warm Cream',
    canvasBg: '#F9F6F0',
    canvasGradient: '',
    cardBg: '#FFFFFF',
    cardTextColor: '#2B2A27',
    cardBorderType: 'hairline',
    cardShadow: 'shadow-md',
    cardBorderColor: '#E6E2D8'
  },
  {
    name: 'Modern Dark Slate',
    canvasBg: '#0F172A',
    canvasGradient: '',
    cardBg: '#1E293B',
    cardTextColor: '#F8FAFC',
    cardBorderType: 'none',
    cardShadow: 'shadow-lg',
    cardBorderColor: '#334155'
  },
  {
    name: 'Lavender Breeze',
    canvasBg: '#F3E8FF',
    canvasGradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardTextColor: '#581C87',
    cardBorderType: 'accent',
    cardShadow: 'shadow-sm',
    cardBorderColor: '#D8B4FE'
  },
  {
    name: 'Forest Mint',
    canvasBg: '#ECFDF5',
    canvasGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    cardBg: '#FFFFFF',
    cardTextColor: '#064E3B',
    cardBorderType: 'hairline',
    cardShadow: 'shadow-sm',
    cardBorderColor: '#A7F3D0'
  },
  {
    name: 'Sunset Glassmorphism',
    canvasBg: '#FEF3C7',
    canvasGradient: 'linear-gradient(135deg, #FFE4E6 0%, #FFEDD5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.8)',
    cardTextColor: '#7C2D12',
    cardBorderType: 'none',
    cardShadow: 'shadow-md',
    cardBorderColor: '#fed7aa'
  }
] as const;

// Google Fonts list for Canva Routine Designer
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

// Field formatting toolbar component (Bold, Italic, Align, Font Size)
interface FieldFormattingToolbarProps {
  label: string;
  bold: boolean;
  italic: boolean;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  defaultFontSize: number;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onChangeAlign: (align: 'left' | 'center' | 'right') => void;
  onChangeFontSize: (size: number) => void;
}

const FieldFormattingToolbar: React.FC<FieldFormattingToolbarProps> = ({
  label,
  bold,
  italic,
  align = 'left',
  fontSize,
  defaultFontSize,
  onToggleBold,
  onToggleItalic,
  onChangeAlign,
  onChangeFontSize,
}) => {
  return (
    <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
      <label className="block text-[9px] uppercase font-bold text-gray-500">{label}</label>
      <div className="flex items-center gap-0.5 bg-canvas-soft/80 p-0.5 rounded border border-hairline/60">
        <button
          type="button"
          onClick={onToggleBold}
          className={`p-0.5 rounded cursor-pointer transition-colors ${
            bold ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft hover:text-ink'
          }`}
          title="Toggle Bold"
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
      </div>
    </div>
  );
};

// Custom Inline Input Component (Light text editor style)
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
        className="w-full bg-white border border-primary text-black focus:outline-none p-1 rounded font-sans text-xs resize-none text-inherit shadow-inner"
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
        className="w-full bg-transparent border-b border-primary text-inherit focus:outline-none p-0 font-inherit text-inherit"
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
      {value || <span className="text-gray-400 italic font-normal text-xs">(Click to edit)</span>}
    </div>
  );
};

const ExamCanvaEditor: React.FC<ExamCanvaEditorProps> = ({ routines, courses, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Editor states
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'theme' | 'headers' | 'exams'>('theme');
  const [savingData, setSavingData] = useState(false);

  // Helper: Parse DD-MM-YY back to YYYY-MM-DD
  const parseShortDateToYYYYMMDD = (shortDate: string) => {
    if (!shortDate) return '';
    const cleaned = shortDate.trim();
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      
      // Handle the case where it contains T00:00:00
      if (cleaned.includes('T') && !cleaned.includes('-')) {
        return cleaned.substring(0, 10);
      }

      const parts = cleaned.split('-');
      if (parts.length === 3) {
        const day = parts[0].split('T')[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) {
          year = `20${year}`;
        }
        return `${year}-${month}-${day}`;
      }
    } catch {}
    return shortDate;
  };

  // Helper: Parse 12-hour AM/PM back to 24-hour HH:MM
  const parse12HourTo24Hour = (time12: string) => {
    if (!time12) return '09:00';
    const cleaned = time12.trim();
    try {
      const parts = cleaned.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (parts) {
        let hours = parseInt(parts[1], 10);
        const minutes = parts[2];
        const ampm = parts[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    } catch {}
    return cleaned;
  };

  const handleSaveRoutineData = async () => {
    setSavingData(true);
    try {
      // 1. Identify which routines were deleted
      const currentRoutineIds = items
        .filter(item => item.id.startsWith('routine-'))
        .map(item => parseInt(item.id.replace('routine-', ''), 10));
        
      const deletedRoutines = routines.filter(r => !currentRoutineIds.includes(r.id));
      
      for (const r of deletedRoutines) {
        await examRoutinesAPI.delete(r.id);
      }
      
      // 2. Add or Update routines
      for (const item of items) {
        const rawCode = (item.courseCode || '').trim();
        const cleanCode = rawCode.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        const matchedCourse = courses.find(c => c.course_id.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanCode)
                           || courses.find(c => rawCode.toLowerCase().includes(c.course_id.toLowerCase()))
                           || courses.find(c => c.course_name.toLowerCase().includes(item.courseName.toLowerCase()))
                           || courses[0];
        
        let examType = 'mid';
        if (headerTitle.toLowerCase().includes('final')) examType = 'final';
        else if (headerTitle.toLowerCase().includes('makeup') || headerTitle.toLowerCase().includes('make-up')) examType = 'makeup';
        else if (headerTitle.toLowerCase().includes('quiz')) examType = 'quiz';
        
        const parsedDate = parseShortDateToYYYYMMDD(item.examDate);
        const parsedTime = parse12HourTo24Hour(item.examTime);
        const parsedRooms = item.rooms.replace(/\n/g, ', ').trim();
        
        const parts = item.courseCode.trim().split(/\s+/);
        const parsedSection = parts.length > 1 ? parts.slice(1).join(' ') : '';
        
        const payload = {
          course_id: matchedCourse ? matchedCourse.id : null,
          exam_type: examType,
          exam_date: parsedDate,
          start_time: parsedTime,
          end_time: parsedTime,
          room_number: parsedRooms,
          section: parsedSection,
          instructions: '',
          canva_template_id: null
        };
        
        if (item.id.startsWith('routine-')) {
          const rId = parseInt(item.id.replace('routine-', ''), 10);
          await examRoutinesAPI.update(rId, payload);
        } else {
          await examRoutinesAPI.create(payload);
        }
      }

      // Save item formatting styles and global canvas styles to localStorage
      try {
        const itemStylesMap: Record<string, any> = {};
        items.forEach((item, idx) => {
          const key = item.id.startsWith('routine-') ? item.id : (item.courseCode.trim() || `index-${idx}`);
          const styleData = {
            courseCodeBold: item.courseCodeBold,
            courseCodeItalic: item.courseCodeItalic,
            courseCodeAlign: item.courseCodeAlign,
            courseCodeFontSize: item.courseCodeFontSize,
            examDateBold: item.examDateBold,
            examDateItalic: item.examDateItalic,
            examDateAlign: item.examDateAlign,
            examDateFontSize: item.examDateFontSize,
            courseNameBold: item.courseNameBold,
            courseNameItalic: item.courseNameItalic,
            courseNameAlign: item.courseNameAlign,
            courseNameFontSize: item.courseNameFontSize,
            examTimeBold: item.examTimeBold,
            examTimeItalic: item.examTimeItalic,
            examTimeAlign: item.examTimeAlign,
            examTimeFontSize: item.examTimeFontSize,
            roomsBold: item.roomsBold,
            roomsItalic: item.roomsItalic,
            roomsAlign: item.roomsAlign,
            roomsFontSize: item.roomsFontSize,
            accentColor: item.accentColor,
            cardHeightPx: item.cardHeightPx,
            cardPadding: item.cardPadding,
            leftColWidth: item.leftColWidth,
            rightColWidth: item.rightColWidth,
            showLeftDivider: item.showLeftDivider,
            showRightDivider: item.showRightDivider,
            vLineColor: item.vLineColor,
            vLineStyle: item.vLineStyle,
            vLineOpacity: item.vLineOpacity,
          };
          itemStylesMap[key] = styleData;
          if (item.courseCode.trim()) {
            itemStylesMap[item.courseCode.trim()] = styleData;
          }
        });
        localStorage.setItem('exam_canva_item_styles', JSON.stringify(itemStylesMap));

        const globalStyles = {
          headerTitle, headerSubtitle, footerLeft, footerRight, routineNotes, showInstructions,
          headerTitleBold, headerTitleItalic, headerTitleAlign, headerTitleFontSize,
          headerSubtitleBold, headerSubtitleItalic, headerSubtitleAlign, headerSubtitleFontSize,
          footerLeftBold, footerLeftItalic, footerLeftAlign, footerLeftFontSize,
          footerRightBold, footerRightItalic, footerRightAlign, footerRightFontSize,
          bgColor, bgGradient, cardBg, cardTextColor, cardBorderColor, cardBorderType,
          cardRoundedness, cardShadow, selectedFont, headerAlign, cardAlign,
          cardHeightPx, cardPadding,
          leftColWidth, rightColWidth, showLeftDivider, showRightDivider,
          vLineColor, vLineStyle, vLineOpacity, vLineHeight
        };
        localStorage.setItem('exam_canva_global_styles', JSON.stringify(globalStyles));
      } catch (e) {}
      
      toast.success('Successfully saved all routine data to the database!');
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      toast.error('Failed to save routine data: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingData(false);
    }
  };
  
  // Canvas customizer states
  const [headerTitle, setHeaderTitle] = useState('MID - EXAM');
  const [headerSubtitle, setHeaderSubtitle] = useState('SUMMER - 2026');
  const [footerLeft, setFooterLeft] = useState('SECTION - CS-(A & H)');
  const [footerRight, setFooterRight] = useState('ROUTINE - SWE - 41');
  const [routineNotes, setRoutineNotes] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Text Styling States
  const [headerTitleBold, setHeaderTitleBold] = useState(true);
  const [headerTitleItalic, setHeaderTitleItalic] = useState(false);
  const [headerTitleAlign, setHeaderTitleAlign] = useState<'left' | 'center' | 'right'>('center');
  const [headerTitleFontSize, setHeaderTitleFontSize] = useState<number>(24);

  const [headerSubtitleBold, setHeaderSubtitleBold] = useState(true);
  const [headerSubtitleItalic, setHeaderSubtitleItalic] = useState(false);
  const [headerSubtitleAlign, setHeaderSubtitleAlign] = useState<'left' | 'center' | 'right'>('center');
  const [headerSubtitleFontSize, setHeaderSubtitleFontSize] = useState<number>(16);

  const [footerLeftBold, setFooterLeftBold] = useState(true);
  const [footerLeftItalic, setFooterLeftItalic] = useState(false);
  const [footerLeftAlign, setFooterLeftAlign] = useState<'left' | 'center' | 'right'>('center');
  const [footerLeftFontSize, setFooterLeftFontSize] = useState<number>(13);

  const [footerRightBold, setFooterRightBold] = useState(true);
  const [footerRightItalic, setFooterRightItalic] = useState(false);
  const [footerRightAlign, setFooterRightAlign] = useState<'left' | 'center' | 'right'>('center');
  const [footerRightFontSize, setFooterRightFontSize] = useState<number>(12);
  
  const [bgColor, setBgColor] = useState('#E4ECF0');
  const [bgGradient, setBgGradient] = useState('');
  
  const [cardBg, setCardBg] = useState('#ffffff');
  const [cardTextColor, setCardTextColor] = useState('#171717');
  const [cardBorderColor, setCardBorderColor] = useState('#dfdfdf');
  const [cardBorderType, setCardBorderType] = useState<'none' | 'hairline' | 'accent'>('none');
  const [cardRoundedness, setCardRoundedness] = useState('8px');
  const [cardShadow, setCardShadow] = useState('shadow-sm');
  const [cardHeightPx, setCardHeightPx] = useState<number>(0); // 0 = Auto fit content
  const [cardPadding, setCardPadding] = useState<string>('p-5');

  // Column Widths & Vertical Divider customizer states
  const [leftColWidth, setLeftColWidth] = useState<number>(145);
  const [rightColWidth, setRightColWidth] = useState<number>(115);
  const [showLeftDivider, setShowLeftDivider] = useState<boolean>(true);
  const [showRightDivider, setShowRightDivider] = useState<boolean>(true);
  const [vLineColor, setVLineColor] = useState<string>('#dfdfdf');
  const [vLineStyle, setVLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [vLineOpacity, setVLineOpacity] = useState<number>(0.6);
  const [vLineHeight, setVLineHeight] = useState<'full' | 'padded' | 'short'>('full');
  
  const [showVerticalLines, setShowVerticalLines] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  
  // Custom font & text alignment state
  const [selectedFont, setSelectedFont] = useState("'Montserrat', sans-serif");
  const [headerAlign, setHeaderAlign] = useState<'left' | 'center' | 'right'>('center');
  const [cardAlign, setCardAlign] = useState<'left' | 'center' | 'right'>('left');

  // Interactive Drag-to-Resize State
  const [draggingTarget, setDraggingTarget] = useState<{
    itemId: string;
    type: 'col-left' | 'col-right' | 'card-height';
    initialMouseX: number;
    initialMouseY: number;
    initialVal: number;
  } | null>(null);

  const handleStartDrag = (
    e: React.MouseEvent,
    itemId: string,
    type: 'col-left' | 'col-right' | 'card-height',
    initialVal: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingTarget({
      itemId,
      type,
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialVal,
    });
  };

  useEffect(() => {
    if (!draggingTarget) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scale = zoom / 100;
      const deltaX = (e.clientX - draggingTarget.initialMouseX) / scale;
      const deltaY = (e.clientY - draggingTarget.initialMouseY) / scale;

      if (draggingTarget.type === 'col-left') {
        const newVal = Math.min(260, Math.max(80, Math.round(draggingTarget.initialVal + deltaX)));
        updateItemField(draggingTarget.itemId, 'leftColWidth', newVal);
      } else if (draggingTarget.type === 'col-right') {
        const newVal = Math.min(220, Math.max(60, Math.round(draggingTarget.initialVal - deltaX)));
        updateItemField(draggingTarget.itemId, 'rightColWidth', newVal);
      } else if (draggingTarget.type === 'card-height') {
        const newVal = Math.min(300, Math.max(50, Math.round(draggingTarget.initialVal + deltaY)));
        updateItemField(draggingTarget.itemId, 'cardHeightPx', newVal);
      }
    };

    const handleMouseUp = () => {
      setDraggingTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTarget, zoom]);

  // Helper handlers to globally update Header and Card alignment across all fields
  const handleHeaderAlignChange = (align: 'left' | 'center' | 'right') => {
    setHeaderAlign(align);
    setHeaderTitleAlign(align);
    setHeaderSubtitleAlign(align);
  };

  const handleCardAlignChange = (align: 'left' | 'center' | 'right') => {
    setCardAlign(align);
    setItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        courseCodeAlign: align,
        examDateAlign: align,
        courseNameAlign: align,
        examTimeAlign: align,
        roomsAlign: align,
      }))
    );
  };

  // Helper handlers to globally update Card Dimensions, Column Layout & Vertical Lines across all cards
  const handleCardHeightPxChange = (val: number) => {
    setCardHeightPx(val);
    setItems(prev => prev.map(item => ({ ...item, cardHeightPx: val })));
  };

  const handleCardPaddingChange = (val: string) => {
    setCardPadding(val);
    setItems(prev => prev.map(item => ({ ...item, cardPadding: val })));
  };

  const handleLeftColWidthChange = (val: number) => {
    setLeftColWidth(val);
    setItems(prev => prev.map(item => ({ ...item, leftColWidth: val })));
  };

  const handleRightColWidthChange = (val: number) => {
    setRightColWidth(val);
    setItems(prev => prev.map(item => ({ ...item, rightColWidth: val })));
  };

  const handleLeftDividerToggle = (checked: boolean) => {
    setShowLeftDivider(checked);
    setItems(prev => prev.map(item => ({ ...item, showLeftDivider: checked })));
  };

  const handleRightDividerToggle = (checked: boolean) => {
    setShowRightDivider(checked);
    setItems(prev => prev.map(item => ({ ...item, showRightDivider: checked })));
  };

  const handleVLineStyleChange = (style: 'solid' | 'dashed' | 'dotted') => {
    setVLineStyle(style);
    setItems(prev => prev.map(item => ({ ...item, vLineStyle: style })));
  };

  const handleVLineHeightChange = (height: 'full' | 'padded' | 'short') => {
    setVLineHeight(height);
  };

  const handleVLineColorChange = (color: string) => {
    setVLineColor(color);
    setItems(prev => prev.map(item => ({ ...item, vLineColor: color })));
  };

  const handleVLineOpacityChange = (opacity: number) => {
    setVLineOpacity(opacity);
    setItems(prev => prev.map(item => ({ ...item, vLineOpacity: opacity })));
  };

  // Dynamic Font Loader
  useEffect(() => {
    const fontObj = FONTS.find(f => f.family === selectedFont);
    if (fontObj && fontObj.link) {
      let link = document.getElementById('canva-custom-font') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = 'canva-custom-font';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = fontObj.link;
    }
  }, [selectedFont]);

  // Convert Date from YYYY-MM-DD to DD-MM-YY
  const formatDateToShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const cleaned = dateStr.trim();
      
      // If it matches the corrupted pattern from previous saves: '01T00:00:00.000Z-01-26'
      if (cleaned.includes('T') && cleaned.includes('-')) {
        const parts = cleaned.split('-');
        if (parts.length === 3 && parts[0].includes('T')) {
          const day = parts[0].split('T')[0];
          const month = parts[1];
          const year = parts[2];
          return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
        }
      }

      let datePortion = cleaned;
      if (cleaned.includes('T')) {
        datePortion = cleaned.substring(0, 10);
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePortion)) {
        const parts = datePortion.split('-');
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

  // Initialize Canvas items from prop routines and saved item formatting
  useEffect(() => {
    let savedItemStyles: Record<string, any> = {};
    try {
      const savedStr = localStorage.getItem('exam_canva_item_styles');
      if (savedStr) {
        savedItemStyles = JSON.parse(savedStr);
      }
    } catch {}

    const formattedItems = routines.map((r: any, index: number) => {
      const rooms = r.room_number 
        ? r.room_number.split(',').map((s: string) => s.trim()).join('\n') 
        : '';
      
      const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length].value;

      const matchedCourse = courses.find((c: any) => c.id === r.course_id);
      const code = r.c_id 
        || r.course_code 
        || (typeof r.course_id === 'string' ? r.course_id : '') 
        || matchedCourse?.course_id 
        || '';

      const rIdKey = `routine-${r.id}`;
      const savedStyle = savedItemStyles[rIdKey] || savedItemStyles[code] || savedItemStyles[`index-${index}`] || {};

      return {
        id: rIdKey,
        courseCode: code,
        courseName: r.course_name || matchedCourse?.course_name || '',
        examDate: formatDateToShort(r.exam_date),
        examTime: formatTimeTo12Hour(r.start_time),
        rooms: rooms,
        accentColor: savedStyle.accentColor || accentColor,

        courseCodeBold: savedStyle.courseCodeBold !== undefined ? savedStyle.courseCodeBold : true,
        courseCodeItalic: !!savedStyle.courseCodeItalic,
        courseCodeAlign: savedStyle.courseCodeAlign || 'left',
        courseCodeFontSize: savedStyle.courseCodeFontSize || 14,

        examDateBold: savedStyle.examDateBold !== undefined ? savedStyle.examDateBold : true,
        examDateItalic: !!savedStyle.examDateItalic,
        examDateAlign: savedStyle.examDateAlign || 'left',
        examDateFontSize: savedStyle.examDateFontSize || 14,

        courseNameBold: savedStyle.courseNameBold !== undefined ? savedStyle.courseNameBold : true,
        courseNameItalic: !!savedStyle.courseNameItalic,
        courseNameAlign: savedStyle.courseNameAlign || 'left',
        courseNameFontSize: savedStyle.courseNameFontSize || 10,

        examTimeBold: savedStyle.examTimeBold !== undefined ? savedStyle.examTimeBold : true,
        examTimeItalic: !!savedStyle.examTimeItalic,
        examTimeAlign: savedStyle.examTimeAlign || 'left',
        examTimeFontSize: savedStyle.examTimeFontSize || 12,

        roomsBold: savedStyle.roomsBold !== undefined ? savedStyle.roomsBold : true,
        roomsItalic: !!savedStyle.roomsItalic,
        roomsAlign: savedStyle.roomsAlign || 'left',
        roomsFontSize: savedStyle.roomsFontSize || 12,

        cardHeightPx: savedStyle.cardHeightPx || 0,
        cardPadding: savedStyle.cardPadding || '',
        leftColWidth: savedStyle.leftColWidth || 145,
        rightColWidth: savedStyle.rightColWidth || 115,
        showLeftDivider: savedStyle.showLeftDivider !== undefined ? savedStyle.showLeftDivider : true,
        showRightDivider: savedStyle.showRightDivider !== undefined ? savedStyle.showRightDivider : true,
        vLineColor: savedStyle.vLineColor || '#dfdfdf',
        vLineStyle: savedStyle.vLineStyle || 'solid',
        vLineOpacity: savedStyle.vLineOpacity !== undefined ? savedStyle.vLineOpacity : 0.6,
      };
    });

    setItems(formattedItems);

    const savedGlobal = localStorage.getItem('exam_canva_global_styles');
    if (savedGlobal) {
      try {
        const parsed = JSON.parse(savedGlobal);
        if (parsed.headerTitle) setHeaderTitle(parsed.headerTitle);
        if (parsed.headerSubtitle) setHeaderSubtitle(parsed.headerSubtitle);
        if (parsed.footerLeft) setFooterLeft(parsed.footerLeft);
        if (parsed.footerRight) setFooterRight(parsed.footerRight);
        if (parsed.routineNotes) setRoutineNotes(parsed.routineNotes);
        if (parsed.showInstructions !== undefined) setShowInstructions(parsed.showInstructions);

        if (parsed.headerTitleBold !== undefined) setHeaderTitleBold(parsed.headerTitleBold);
        if (parsed.headerTitleItalic !== undefined) setHeaderTitleItalic(parsed.headerTitleItalic);
        if (parsed.headerTitleAlign) setHeaderTitleAlign(parsed.headerTitleAlign);
        if (parsed.headerTitleFontSize) setHeaderTitleFontSize(parsed.headerTitleFontSize);

        if (parsed.headerSubtitleBold !== undefined) setHeaderSubtitleBold(parsed.headerSubtitleBold);
        if (parsed.headerSubtitleItalic !== undefined) setHeaderSubtitleItalic(parsed.headerSubtitleItalic);
        if (parsed.headerSubtitleAlign) setHeaderSubtitleAlign(parsed.headerSubtitleAlign);
        if (parsed.headerSubtitleFontSize) setHeaderSubtitleFontSize(parsed.headerSubtitleFontSize);

        if (parsed.footerLeftBold !== undefined) setFooterLeftBold(parsed.footerLeftBold);
        if (parsed.footerLeftItalic !== undefined) setFooterLeftItalic(parsed.footerLeftItalic);
        if (parsed.footerLeftAlign) setFooterLeftAlign(parsed.footerLeftAlign);
        if (parsed.footerLeftFontSize) setFooterLeftFontSize(parsed.footerLeftFontSize);

        if (parsed.footerRightBold !== undefined) setFooterRightBold(parsed.footerRightBold);
        if (parsed.footerRightItalic !== undefined) setFooterRightItalic(parsed.footerRightItalic);
        if (parsed.footerRightAlign) setFooterRightAlign(parsed.footerRightAlign);
        if (parsed.footerRightFontSize) setFooterRightFontSize(parsed.footerRightFontSize);

        if (parsed.bgColor) setBgColor(parsed.bgColor);
        if (parsed.bgGradient !== undefined) setBgGradient(parsed.bgGradient);
        if (parsed.cardBg) setCardBg(parsed.cardBg);
        if (parsed.cardTextColor) setCardTextColor(parsed.cardTextColor);
        if (parsed.cardBorderColor) setCardBorderColor(parsed.cardBorderColor);
        if (parsed.cardBorderType) setCardBorderType(parsed.cardBorderType);
        if (parsed.cardRoundedness) setCardRoundedness(parsed.cardRoundedness);
        if (parsed.cardShadow) setCardShadow(parsed.cardShadow);
        if (parsed.cardHeightPx !== undefined) setCardHeightPx(parsed.cardHeightPx);
        if (parsed.cardPadding) setCardPadding(parsed.cardPadding);
        if (parsed.leftColWidth !== undefined) setLeftColWidth(parsed.leftColWidth);
        if (parsed.rightColWidth !== undefined) setRightColWidth(parsed.rightColWidth);
        if (parsed.showLeftDivider !== undefined) setShowLeftDivider(parsed.showLeftDivider);
        if (parsed.showRightDivider !== undefined) setShowRightDivider(parsed.showRightDivider);
        if (parsed.vLineColor) setVLineColor(parsed.vLineColor);
        if (parsed.vLineStyle) setVLineStyle(parsed.vLineStyle);
        if (parsed.vLineOpacity !== undefined) setVLineOpacity(parsed.vLineOpacity);
        if (parsed.vLineHeight) setVLineHeight(parsed.vLineHeight);
        if (parsed.selectedFont) setSelectedFont(parsed.selectedFont);
        if (parsed.headerAlign) setHeaderAlign(parsed.headerAlign);
        if (parsed.cardAlign) setCardAlign(parsed.cardAlign);
      } catch (e) {}
    } else if (routines.length > 0) {
      const type = routines[0].exam_type || 'MID';
      setHeaderTitle(`${type.toUpperCase()} - EXAM`);
      
      const sections = Array.from(new Set(routines.map(r => r.section).filter(Boolean)));
      if (sections.length > 0) {
        setFooterLeft(`SECTION - ${sections.join(' & ')}`);
      }
    }
  }, [routines, courses]);

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
    setActiveTab('exams');
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
    setActiveTab('exams');
    toast.success('Card duplicated');
  };

  // Delete card
  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    toast.success('Card removed from canvas');
  };

  // Edit item details & sync styles to localStorage
  const updateItemField = (id: string, field: keyof CanvasItem, value: string | boolean | any) => {
    setItems(prevItems => {
      const updated = prevItems.map(item => item.id === id ? { ...item, [field]: value } : item);
      try {
        const itemStylesMap: Record<string, any> = {};
        updated.forEach((item, idx) => {
          const key = item.id.startsWith('routine-') ? item.id : (item.courseCode.trim() || `index-${idx}`);
          const styleData = {
            courseCodeBold: item.courseCodeBold,
            courseCodeItalic: item.courseCodeItalic,
            courseCodeAlign: item.courseCodeAlign,
            courseCodeFontSize: item.courseCodeFontSize,
            examDateBold: item.examDateBold,
            examDateItalic: item.examDateItalic,
            examDateAlign: item.examDateAlign,
            examDateFontSize: item.examDateFontSize,
            courseNameBold: item.courseNameBold,
            courseNameItalic: item.courseNameItalic,
            courseNameAlign: item.courseNameAlign,
            courseNameFontSize: item.courseNameFontSize,
            examTimeBold: item.examTimeBold,
            examTimeItalic: item.examTimeItalic,
            examTimeAlign: item.examTimeAlign,
            examTimeFontSize: item.examTimeFontSize,
            roomsBold: item.roomsBold,
            roomsItalic: item.roomsItalic,
            roomsAlign: item.roomsAlign,
            roomsFontSize: item.roomsFontSize,
            accentColor: item.accentColor,
            cardHeightPx: item.cardHeightPx,
            cardPadding: item.cardPadding,
            leftColWidth: item.leftColWidth,
            rightColWidth: item.rightColWidth,
            showLeftDivider: item.showLeftDivider,
            showRightDivider: item.showRightDivider,
            vLineColor: item.vLineColor,
            vLineStyle: item.vLineStyle,
            vLineOpacity: item.vLineOpacity
          };
          itemStylesMap[key] = styleData;
          if (item.courseCode.trim()) {
            itemStylesMap[item.courseCode.trim()] = styleData;
          }
        });
        localStorage.setItem('exam_canva_item_styles', JSON.stringify(itemStylesMap));
      } catch (e) {}
      return updated;
    });
  };

  // Set predefined theme palette
  const applyThemePalette = (palette: typeof THEME_PALETTES[number]) => {
    setBgColor(palette.canvasBg);
    setBgGradient(palette.canvasGradient);
    setCardBg(palette.cardBg);
    setCardTextColor(palette.cardTextColor);
    setCardBorderType(palette.cardBorderType);
    setCardShadow(palette.cardShadow);
    setCardBorderColor(palette.cardBorderColor);
    toast.success(`Applied ${palette.name} theme!`);
  };

  // Select card on canvas
  const handleSelectCard = (id: string) => {
    setSelectedItemId(id);
    setActiveTab('exams'); // Automatically focus the exams editor tab
  };

  const selectedItem = items.find(item => item.id === selectedItemId);

  // Capture Canvas Node for exporting
  const captureCanvasBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    
    const origTransform = canvasRef.current.style.transform;
    const origWidth = canvasRef.current.style.width;
    
    canvasRef.current.style.transform = 'none';
    canvasRef.current.style.width = '550px';
    
    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2, 
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
      
      const uploadedFileRecord = await filesAPI.upload(file, null);
      
      const notesMarkdown = routineNotes ? htmlToWhatsappMarkdown(routineNotes) : '';
      const defaultBody = `📢 *Exam Routine Notice*\n\nThe exam routine for *${headerSubtitle}* (${footerLeft}) has been published. Please review the attached custom routine schedule card for details on dates, rooms, and sessions.\n\nGood luck with your preparations! 📝🎓`;
      const preFillBody = notesMarkdown ? `${defaultBody}\n\n📝 *Routine Notes & Instructions:*\n${notesMarkdown}` : defaultBody;

      navigate('/announcement/new', {
        state: {
          preFillTitle: `${headerTitle} - ${headerSubtitle}`,
          preFillBody,
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
    <div className="bg-canvas border border-hairline rounded-lg shadow-md overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full select-none">
      
      {/* 1. SIDEBAR: Controls & Settings (Left 4 cols) */}
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas-soft flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
        
        <div className="p-4 border-b border-hairline flex items-center bg-canvas flex-shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-bold text-ink">Routine Canva Editor</h2>
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
            <Sliders className="w-3.5 h-3.5" /> Style Theme
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
            onClick={() => setActiveTab('exams')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'exams' ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-canvas-soft'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Exams ({items.length})
            {selectedItemId && (
              <span className="w-1.5 h-1.5 bg-primary rounded-full absolute top-1 right-2"></span>
            )}
          </button>
        </div>

        {/* Settings Sections (Scrollable) */}
        <div className="p-4 space-y-6 flex-grow lg:flex-1 lg:overflow-y-auto bg-canvas-soft">

          {/* TAB 1: Theme & Style Settings */}
          {activeTab === 'theme' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Theme Palettes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Palette Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PALETTES.map((palette, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyThemePalette(palette)}
                      className="text-left p-2 rounded border border-hairline bg-canvas hover:border-primary transition-all duration-150 cursor-pointer text-xs font-medium space-y-1 shadow-sm hover:shadow"
                    >
                      <div className="truncate font-semibold text-ink-secondary">{palette.name}</div>
                      <div className="flex gap-1 h-3.5 items-center">
                        <span style={{ background: palette.canvasBg }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" />
                        <span style={{ backgroundColor: palette.cardBg }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" />
                        <span style={{ backgroundColor: palette.cardTextColor }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" />
                        {palette.cardBorderColor && (
                          <span style={{ backgroundColor: palette.cardBorderColor }} className="w-3.5 h-3.5 rounded-full border border-hairline shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="space-y-1.5 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Font Family</label>
                <CustomSelect
                  value={selectedFont}
                  onChange={(val) => setSelectedFont(val)}
                  options={FONTS.map(f => ({ value: f.family, label: f.name }))}
                />
              </div>

              {/* Text Alignment Customizer */}
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
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Card Content</label>
                    <div className="flex bg-canvas p-0.5 rounded border border-hairline">
                      <button 
                        onClick={() => handleCardAlignChange('left')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cardAlign === 'left' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleCardAlignChange('center')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cardAlign === 'center' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleCardAlignChange('right')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cardAlign === 'right' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Presets */}
              <div className="space-y-1.5 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Canvas Background</label>
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

              {/* Custom Colors */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Custom Colors</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Custom Card Bg</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={cardBg} 
                        onChange={e => setCardBg(e.target.value)} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink">{cardBg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Card Text Color</label>
                    <div className="flex gap-2 items-center bg-canvas p-1 rounded border border-hairline">
                      <input 
                        type="color" 
                        value={cardTextColor} 
                        onChange={e => setCardTextColor(e.target.value)} 
                        className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono font-semibold text-ink">{cardTextColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout styling overrides */}
              <div className="space-y-3 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Card Styles & Dimensions</label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Fixed Card Height (px)</label>
                    <CustomSelect
                      value={cardHeightPx.toString()}
                      onChange={(val) => handleCardHeightPxChange(parseInt(val, 10) || 0)}
                      size="sm"
                      options={[
                        { value: '0', label: 'Auto (Fit Content)' },
                        { value: '75', label: 'Fixed 75px (Compact)' },
                        { value: '85', label: 'Fixed 85px (Standard)' },
                        { value: '95', label: 'Fixed 95px (Medium)' },
                        { value: '110', label: 'Fixed 110px (Tall)' },
                        { value: '125', label: 'Fixed 125px (Extra Tall)' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Card Padding</label>
                    <CustomSelect
                      value={cardPadding}
                      onChange={(val) => handleCardPaddingChange(val)}
                      size="sm"
                      options={[
                        { value: 'p-2.5', label: 'Tight (10px)' },
                        { value: 'p-3.5', label: 'Compact (14px)' },
                        { value: 'p-5', label: 'Standard (20px)' },
                        { value: 'p-6.5', label: 'Spacious (26px)' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Corner Rounded</label>
                    <CustomSelect
                      value={cardRoundedness}
                      onChange={(val) => setCardRoundedness(val)}
                      size="sm"
                      options={[
                        { value: '0px', label: 'Sharp (0px)' },
                        { value: '4px', label: 'Small (4px)' },
                        { value: '8px', label: 'Medium (8px)' },
                        { value: '12px', label: 'Large (12px)' },
                        { value: '20px', label: 'Extra (20px)' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Card Shadow</label>
                    <CustomSelect
                      value={cardShadow}
                      onChange={(val) => setCardShadow(val)}
                      size="sm"
                      options={[
                        { value: 'shadow-none', label: 'None' },
                        { value: 'shadow-sm', label: 'Soft / Subtle' },
                        { value: 'shadow-md', label: 'Medium' },
                        { value: 'shadow-lg', label: 'Large' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Card Border</label>
                    <CustomSelect
                      value={cardBorderType}
                      onChange={(val) => setCardBorderType(val as any)}
                      size="sm"
                      options={[
                        { value: 'none', label: 'No Border' },
                        { value: 'hairline', label: 'Light Border' },
                        { value: 'accent', label: 'Match Accent Bar' },
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5 select-none">
                    <input 
                      type="checkbox" 
                      id="v-lines"
                      checked={showRightDivider || showLeftDivider}
                      onChange={e => {
                        handleLeftDividerToggle(e.target.checked);
                        handleRightDividerToggle(e.target.checked);
                      }}
                      className="rounded border-hairline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="v-lines" className="text-xs text-ink-secondary cursor-pointer font-semibold">Vertical Dividers</label>
                  </div>
                </div>
              </div>

              {/* Column Widths & Vertical Lines customization */}
              <div className="space-y-3 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Column Layout & Vertical Lines</label>
                
                {/* Column Widths Sliders/Inputs */}
                <div className="space-y-2 bg-canvas p-2.5 rounded border border-hairline">
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold mb-1">
                      <span>Left Column Width (Date & Time)</span>
                      <span className="font-mono text-primary font-bold">{leftColWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min={90} 
                      max={250} 
                      value={leftColWidth} 
                      onChange={e => handleLeftColWidthChange(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-canvas-soft rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold mb-1">
                      <span>Right Column Width (Rooms)</span>
                      <span className="font-mono text-primary font-bold">{rightColWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min={70} 
                      max={220} 
                      value={rightColWidth} 
                      onChange={e => handleRightColWidthChange(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-canvas-soft rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Vertical Lines Formatting */}
                <div className="space-y-2.5 bg-canvas p-2.5 rounded border border-hairline">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Vertical Line Controls</label>
                  
                  <div className="flex gap-4 items-center text-xs text-ink-secondary">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold select-none">
                      <input 
                        type="checkbox" 
                        checked={showLeftDivider}
                        onChange={e => handleLeftDividerToggle(e.target.checked)}
                        className="rounded border-hairline text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      Left Line
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold select-none">
                      <input 
                        type="checkbox" 
                        checked={showRightDivider}
                        onChange={e => handleRightDividerToggle(e.target.checked)}
                        className="rounded border-hairline text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      Right Line
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-0.5 font-semibold">Line Style</label>
                      <CustomSelect
                        value={vLineStyle}
                        onChange={(val) => handleVLineStyleChange(val as any)}
                        size="sm"
                        options={[
                          { value: 'solid', label: 'Solid Line' },
                          { value: 'dashed', label: 'Dashed Line' },
                          { value: 'dotted', label: 'Dotted Line' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-0.5 font-semibold">Line Height</label>
                      <CustomSelect
                        value={vLineHeight}
                        onChange={(val) => handleVLineHeightChange(val as any)}
                        size="sm"
                        options={[
                          { value: 'full', label: 'Full Height (100%)' },
                          { value: 'padded', label: 'Inset Padded (80%)' },
                          { value: 'short', label: 'Short Center (60%)' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-0.5 font-semibold">Line Color</label>
                      <div className="flex gap-1.5 items-center bg-canvas p-1 rounded border border-hairline h-8">
                        <input 
                          type="color" 
                          value={vLineColor} 
                          onChange={e => handleVLineColorChange(e.target.value)} 
                          className="w-5 h-5 rounded border border-hairline cursor-pointer p-0 shrink-0"
                        />
                        <span className="text-[9px] font-mono font-semibold text-ink">{vLineColor}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-[9px] text-gray-500 font-semibold mb-0.5">
                        <span>Opacity</span>
                        <span className="font-mono">{Math.round(vLineOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min={0.1} 
                        max={1} 
                        step={0.05}
                        value={vLineOpacity} 
                        onChange={e => handleVLineOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-canvas-soft rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Header & Footer Text Customization */}
          {activeTab === 'headers' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Header Configuration</label>
                <div className="space-y-3 bg-canvas border border-hairline rounded-md p-3.5">
                  <div>
                    <FieldFormattingToolbar
                      label="Header Main Title"
                      bold={headerTitleBold}
                      italic={headerTitleItalic}
                      align={headerTitleAlign}
                      fontSize={headerTitleFontSize}
                      defaultFontSize={24}
                      onToggleBold={() => setHeaderTitleBold(!headerTitleBold)}
                      onToggleItalic={() => setHeaderTitleItalic(!headerTitleItalic)}
                      onChangeAlign={(align) => setHeaderTitleAlign(align)}
                      onChangeFontSize={(size) => setHeaderTitleFontSize(size)}
                    />
                    <input 
                      type="text" 
                      value={headerTitle} 
                      onChange={e => setHeaderTitle(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <FieldFormattingToolbar
                      label="Header Subtitle"
                      bold={headerSubtitleBold}
                      italic={headerSubtitleItalic}
                      align={headerSubtitleAlign}
                      fontSize={headerSubtitleFontSize}
                      defaultFontSize={16}
                      onToggleBold={() => setHeaderSubtitleBold(!headerSubtitleBold)}
                      onToggleItalic={() => setHeaderSubtitleItalic(!headerSubtitleItalic)}
                      onChangeAlign={(align) => setHeaderSubtitleAlign(align)}
                      onChangeFontSize={(size) => setHeaderSubtitleFontSize(size)}
                    />
                    <input 
                      type="text" 
                      value={headerSubtitle} 
                      onChange={e => setHeaderSubtitle(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Footer Configuration</label>
                <div className="space-y-3 bg-canvas border border-hairline rounded-md p-3.5">
                  <div>
                    <FieldFormattingToolbar
                      label="Footer Left Text"
                      bold={footerLeftBold}
                      italic={footerLeftItalic}
                      align={footerLeftAlign}
                      fontSize={footerLeftFontSize}
                      defaultFontSize={13}
                      onToggleBold={() => setFooterLeftBold(!footerLeftBold)}
                      onToggleItalic={() => setFooterLeftItalic(!footerLeftItalic)}
                      onChangeAlign={(align) => setFooterLeftAlign(align)}
                      onChangeFontSize={(size) => setFooterLeftFontSize(size)}
                    />
                    <input 
                      type="text" 
                      value={footerLeft} 
                      onChange={e => setFooterLeft(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <FieldFormattingToolbar
                      label="Footer Right Text"
                      bold={footerRightBold}
                      italic={footerRightItalic}
                      align={footerRightAlign}
                      fontSize={footerRightFontSize}
                      defaultFontSize={12}
                      onToggleBold={() => setFooterRightBold(!footerRightBold)}
                      onToggleItalic={() => setFooterRightItalic(!footerRightItalic)}
                      onChangeAlign={(align) => setFooterRightAlign(align)}
                      onChangeFontSize={(size) => setFooterRightFontSize(size)}
                    />
                    <input 
                      type="text" 
                      value={footerRight} 
                      onChange={e => setFooterRight(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Routine Instructions / Notes (TipTap Rich Text Editor) */}
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
                <p className="text-[11px] text-gray-500">Format instructions or rules with custom fonts, bold, and lists!</p>
                <TipTapEditor 
                  value={routineNotes} 
                  onChange={(val) => {
                    setRoutineNotes(val);
                    if (val && val.trim() && val !== '<p></p>') {
                      setShowInstructions(true);
                    }
                  }} 
                  placeholder="e.g. 1. Bring student ID card. 2. Mobile phones strictly prohibited..." 
                />
              </div>
            </div>
          )}

          {/* TAB 3: Exams Cards and Selection Editor */}
          {activeTab === 'exams' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Selected Exam Editor Panel */}
              {selectedItem ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide flex items-center justify-between">
                    <span>Card Customizer</span>
                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">Editing Selected</span>
                  </label>

                  <div className="bg-canvas border border-hairline rounded-md p-3.5 space-y-3.5 shadow-sm">
                    
                    {/* Registered Course Autofill */}
                    {courses.length > 0 && (
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Autofill from Registered Courses</label>
                        <CustomSelect
                          value=""
                          onChange={(val) => {
                            if (!val) return;
                            const selected = courses.find(c => c.course_id === val);
                            if (selected) {
                              updateItemField(selectedItem.id, 'courseCode', selected.course_id);
                              updateItemField(selectedItem.id, 'courseName', selected.course_name.toUpperCase());
                            }
                          }}
                          placeholder="-- Select a registered course --"
                          options={[
                            { value: '', label: '-- Select a registered course --' },
                            ...courses.map(c => ({ value: c.course_id, label: `${c.course_id} - ${c.course_name}` })),
                          ]}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Code & Date */}
                    <div className="space-y-3">
                      <div>
                        <FieldFormattingToolbar
                          label="Course Code"
                          bold={selectedItem.courseCodeBold !== false}
                          italic={!!selectedItem.courseCodeItalic}
                          align={selectedItem.courseCodeAlign || 'left'}
                          fontSize={selectedItem.courseCodeFontSize}
                          defaultFontSize={14}
                          onToggleBold={() => updateItemField(selectedItem.id, 'courseCodeBold', selectedItem.courseCodeBold === false ? true : false)}
                          onToggleItalic={() => updateItemField(selectedItem.id, 'courseCodeItalic', !selectedItem.courseCodeItalic)}
                          onChangeAlign={(align) => updateItemField(selectedItem.id, 'courseCodeAlign', align)}
                          onChangeFontSize={(size) => updateItemField(selectedItem.id, 'courseCodeFontSize', size)}
                        />
                        <input 
                          type="text" 
                          value={selectedItem.courseCode} 
                          onChange={e => updateItemField(selectedItem.id, 'courseCode', e.target.value)}
                          className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <FieldFormattingToolbar
                          label="Exam Date"
                          bold={selectedItem.examDateBold !== false}
                          italic={!!selectedItem.examDateItalic}
                          align={selectedItem.examDateAlign || 'left'}
                          fontSize={selectedItem.examDateFontSize}
                          defaultFontSize={14}
                          onToggleBold={() => updateItemField(selectedItem.id, 'examDateBold', selectedItem.examDateBold === false ? true : false)}
                          onToggleItalic={() => updateItemField(selectedItem.id, 'examDateItalic', !selectedItem.examDateItalic)}
                          onChangeAlign={(align) => updateItemField(selectedItem.id, 'examDateAlign', align)}
                          onChangeFontSize={(size) => updateItemField(selectedItem.id, 'examDateFontSize', size)}
                        />
                        <input 
                          type="text" 
                          value={selectedItem.examDate} 
                          onChange={e => updateItemField(selectedItem.id, 'examDate', e.target.value)}
                          className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Course Name */}
                    <div>
                      <FieldFormattingToolbar
                        label="Course Name"
                        bold={selectedItem.courseNameBold !== false}
                        italic={!!selectedItem.courseNameItalic}
                        align={selectedItem.courseNameAlign || 'left'}
                        fontSize={selectedItem.courseNameFontSize}
                        defaultFontSize={10}
                        onToggleBold={() => updateItemField(selectedItem.id, 'courseNameBold', selectedItem.courseNameBold === false ? true : false)}
                        onToggleItalic={() => updateItemField(selectedItem.id, 'courseNameItalic', !selectedItem.courseNameItalic)}
                        onChangeAlign={(align) => updateItemField(selectedItem.id, 'courseNameAlign', align)}
                        onChangeFontSize={(size) => updateItemField(selectedItem.id, 'courseNameFontSize', size)}
                      />
                      <input 
                        type="text" 
                        value={selectedItem.courseName} 
                        onChange={e => updateItemField(selectedItem.id, 'courseName', e.target.value)}
                        className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Time & Accent Custom Color */}
                    <div className="space-y-3">
                      <div>
                        <FieldFormattingToolbar
                          label="Time"
                          bold={selectedItem.examTimeBold !== false}
                          italic={!!selectedItem.examTimeItalic}
                          align={selectedItem.examTimeAlign || 'left'}
                          fontSize={selectedItem.examTimeFontSize}
                          defaultFontSize={12}
                          onToggleBold={() => updateItemField(selectedItem.id, 'examTimeBold', selectedItem.examTimeBold === false ? true : false)}
                          onToggleItalic={() => updateItemField(selectedItem.id, 'examTimeItalic', !selectedItem.examTimeItalic)}
                          onChangeAlign={(align) => updateItemField(selectedItem.id, 'examTimeAlign', align)}
                          onChangeFontSize={(size) => updateItemField(selectedItem.id, 'examTimeFontSize', size)}
                        />
                        <input 
                          type="text" 
                          value={selectedItem.examTime} 
                          onChange={e => updateItemField(selectedItem.id, 'examTime', e.target.value)}
                          className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Accent Bar Color</label>
                        <div className="flex items-center gap-1.5 h-8 bg-canvas px-1.5 rounded border border-hairline">
                          <input 
                            type="color" 
                            value={selectedItem.accentColor} 
                            onChange={e => updateItemField(selectedItem.id, 'accentColor', e.target.value)}
                            className="w-6 h-6 rounded border border-hairline cursor-pointer p-0 shrink-0"
                          />
                          <span className="text-[10px] font-mono text-ink font-semibold">{selectedItem.accentColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rooms List */}
                    <div>
                      <FieldFormattingToolbar
                        label="Rooms & Seating Counts (one per line)"
                        bold={selectedItem.roomsBold !== false}
                        italic={!!selectedItem.roomsItalic}
                        align={selectedItem.roomsAlign || 'left'}
                        fontSize={selectedItem.roomsFontSize}
                        defaultFontSize={12}
                        onToggleBold={() => updateItemField(selectedItem.id, 'roomsBold', selectedItem.roomsBold === false ? true : false)}
                        onToggleItalic={() => updateItemField(selectedItem.id, 'roomsItalic', !selectedItem.roomsItalic)}
                        onChangeAlign={(align) => updateItemField(selectedItem.id, 'roomsAlign', align)}
                        onChangeFontSize={(size) => updateItemField(selectedItem.id, 'roomsFontSize', size)}
                      />
                      <textarea 
                        value={selectedItem.rooms} 
                        onChange={e => updateItemField(selectedItem.id, 'rooms', e.target.value)}
                        className="w-full p-1.5 text-xs border border-hairline bg-canvas rounded font-mono text-ink focus:border-primary focus:outline-none"
                        rows={3}
                      />
                    </div>

                    {/* Card Height Override for this item */}
                    <div className="pt-2 border-t border-hairline/60">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[9px] uppercase font-bold text-gray-500">Fixed Card Height (px)</label>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {selectedItem.cardHeightPx ? `${selectedItem.cardHeightPx}px` : (cardHeightPx ? `Global (${cardHeightPx}px)` : 'Auto')}
                        </span>
                      </div>
                      <CustomSelect
                        value={(selectedItem.cardHeightPx || 0).toString()}
                        onChange={(val) => updateItemField(selectedItem.id, 'cardHeightPx', parseInt(val, 10) || 0)}
                        size="sm"
                        options={[
                          { value: '0', label: 'Use Global Theme / Auto' },
                          { value: '75', label: 'Fixed 75px (Compact)' },
                          { value: '85', label: 'Fixed 85px (Standard)' },
                          { value: '95', label: 'Fixed 95px (Medium)' },
                          { value: '110', label: 'Fixed 110px (Tall)' },
                          { value: '125', label: 'Fixed 125px (Extra Tall)' },
                        ]}
                      />
                    </div>

                    {/* Color presets quick picker */}
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Color Accent Presets</label>
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

                    {/* Card Actions */}
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => {
                          const idx = items.findIndex(item => item.id === selectedItemId);
                          if (idx !== -1) handleDuplicateItem(idx);
                        }}
                        className="flex-1 py-1.5 px-2 border border-hairline rounded text-[10px] font-bold text-ink bg-canvas hover:bg-canvas-soft transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-ink-mute" /> Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        className="py-1.5 px-2 border border-accent-tomato/20 rounded text-[10px] font-bold text-accent-tomato bg-accent-tomato/5 hover:bg-accent-tomato/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-hairline rounded-md p-6 text-center text-xs text-gray-500 bg-canvas">
                  Click on any routine card on the right canvas to select it and edit its fields here.
                </div>
              )}

              {/* Cards Management list */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Exams Order ({items.length})</label>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`flex items-center justify-between p-2 rounded text-xs border transition-all cursor-pointer ${
                        selectedItemId === item.id 
                          ? 'bg-primary/10 border-primary text-ink' 
                          : 'bg-canvas border-hairline text-ink-secondary hover:bg-canvas-soft'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span style={{ backgroundColor: item.accentColor }} className="w-2.5 h-2.5 rounded shrink-0" />
                        <span className="font-bold shrink-0">{item.courseCode || 'New'}:</span>
                        <span className="truncate opacity-80">{item.courseName || 'Custom'}</span>
                      </div>
                      
                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); moveItem(idx, 'up'); }}
                          className="p-0.5 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          disabled={idx === items.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveItem(idx, 'down'); }}
                          className="p-0.5 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="p-0.5 hover:bg-canvas-soft rounded text-ink hover:text-accent-tomato cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions & Notes (TipTap Rich Text Editor) */}
              <div className="space-y-2 pt-3 border-t border-hairline">
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
                <p className="text-[11px] text-gray-500">Format instructions or rules with custom fonts, bold, italic, and lists!</p>
                <TipTapEditor 
                  value={routineNotes} 
                  onChange={(val) => {
                    setRoutineNotes(val);
                    if (val && val.trim() && val !== '<p></p>') {
                      setShowInstructions(true);
                    }
                  }} 
                  placeholder="e.g. 1. Bring student ID card. 2. Mobile phones strictly prohibited..." 
                />
              </div>

            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-hairline bg-canvas flex-shrink-0">
          <button
            onClick={handleAddItem}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-dashed border-primary hover:border-primary-deep rounded text-xs font-bold text-primary bg-canvas hover:bg-canvas-soft transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Custom Exam Row
          </button>
        </div>

      </div>

      {/* 2. MAIN CANVAS VIEW AREA (Right 8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-[550px] lg:h-full bg-[#e2e8f0] overflow-hidden">
        
        {/* Canvas Toolbar Controls */}
        <div className="p-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3 bg-canvas no-export flex-shrink-0">
          
          {/* Zoom and Grid Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer border ${
                isLocked 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                  : 'bg-canvas border-hairline text-gray-600 hover:bg-canvas-soft'
              }`}
              title={isLocked ? 'Unlock canvas for editing' : 'Lock canvas into design mode'}
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
                onClick={() => setZoom(Math.max(50, zoom - 10))} 
                className="p-1.5 hover:bg-canvas-soft border border-hairline rounded cursor-pointer text-gray-400 hover:text-ink"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-medium px-1.5 w-12 text-center text-ink">{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(150, zoom + 10))} 
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

        {/* Scrollable Workspace Container (Figma Dot Grid Style) */}
        <div 
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '16px 16px'
          }}
          className="flex-1 overflow-auto p-8 flex items-center justify-center min-h-[500px] bg-[#f8fafc]"
        >
          
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
                width: '550px',
                fontFamily: selectedFont,
                textAlign: headerAlign
              }}
              className="p-8 space-y-6 shadow-2xl relative select-none overflow-hidden transition-all duration-300 rounded border border-hairline"
            >
              
              {/* Header Box */}
              <div 
                style={{ 
                  backgroundColor: cardBg,
                  borderRadius: cardRoundedness,
                  color: cardTextColor
                }}
                className={`p-6 border border-hairline transition-all duration-300 ${cardShadow}`}
              >
                <h1 
                  style={{
                    fontWeight: headerTitleBold ? 'bold' : 'normal',
                    fontStyle: headerTitleItalic ? 'italic' : 'normal',
                    textAlign: headerTitleAlign || headerAlign,
                    fontSize: `${headerTitleFontSize || 24}px`
                  }}
                  className="tracking-tight leading-tight uppercase"
                >
                  <InlineInput 
                    value={headerTitle} 
                    onChange={setHeaderTitle} 
                    disabled={isLocked}
                  />
                </h1>
                <h2 
                  style={{
                    fontWeight: headerSubtitleBold ? 'bold' : 'normal',
                    fontStyle: headerSubtitleItalic ? 'italic' : 'normal',
                    textAlign: headerSubtitleAlign || headerAlign,
                    fontSize: `${headerSubtitleFontSize || 16}px`
                  }}
                  className="tracking-widest uppercase mt-1 opacity-80"
                >
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

                  const effectiveCardHeight = item.cardHeightPx !== undefined && item.cardHeightPx > 0
                    ? item.cardHeightPx
                    : cardHeightPx > 0
                      ? cardHeightPx
                      : null;

                  const effectivePadding = item.cardPadding || cardPadding || 'p-5';
                  const effectiveLeftWidth = item.leftColWidth || leftColWidth || 145;
                  const effectiveRightWidth = item.rightColWidth || rightColWidth || 115;
                  const effectiveShowLeftDiv = item.showLeftDivider !== undefined ? item.showLeftDivider : showLeftDivider;
                  const effectiveShowRightDiv = item.showRightDivider !== undefined ? item.showRightDivider : showRightDivider;
                  const effectiveVLineColor = item.vLineColor || vLineColor || '#dfdfdf';
                  const effectiveVLineStyle = item.vLineStyle || vLineStyle || 'solid';
                  const effectiveVLineOpacity = item.vLineOpacity !== undefined ? item.vLineOpacity : vLineOpacity;

                  let lineHeightPercent = '100%';
                  if (vLineHeight === 'padded') lineHeightPercent = '80%';
                  else if (vLineHeight === 'short') lineHeightPercent = '60%';

                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleSelectCard(item.id)}
                      style={{ 
                        backgroundColor: cardBg,
                        borderRadius: cardRoundedness,
                        color: cardTextColor,
                        borderColor: cardBorderType === 'accent' ? item.accentColor : cardBorderColor,
                        textAlign: cardAlign,
                        height: effectiveCardHeight ? `${effectiveCardHeight}px` : undefined,
                        maxHeight: effectiveCardHeight ? `${effectiveCardHeight}px` : undefined,
                        minHeight: effectiveCardHeight ? `${effectiveCardHeight}px` : undefined,
                      }}
                      className={`relative ${effectivePadding} flex items-stretch gap-2 group cursor-pointer transition-all duration-300 ${cardShadow} ${borderStyle} ${
                        effectiveCardHeight ? 'overflow-hidden' : ''
                      } ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2 scale-[1.01]' 
                          : 'hover:scale-[1.005] hover:shadow-md'
                      }`}
                    >
                      {/* Left Column: Date & Time + Accent color pill */}
                      <div 
                        style={{ width: `${effectiveLeftWidth}px` }} 
                        className="pr-3 flex flex-col justify-center select-text overflow-hidden shrink-0"
                      >
                        <div 
                          style={{
                            fontWeight: item.examDateBold !== false ? 'bold' : 'normal',
                            fontStyle: item.examDateItalic ? 'italic' : 'normal',
                            textAlign: item.examDateAlign || cardAlign || 'left',
                            fontSize: `${item.examDateFontSize || 14}px`
                          }}
                          className="leading-tight w-full"
                        >
                          <InlineInput 
                            value={item.examDate} 
                            onChange={val => updateItemField(item.id, 'examDate', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                        <div 
                          style={{
                            fontWeight: item.examTimeBold !== false ? '600' : 'normal',
                            fontStyle: item.examTimeItalic ? 'italic' : 'normal',
                            textAlign: item.examTimeAlign || cardAlign || 'left',
                            fontSize: `${item.examTimeFontSize || 12}px`
                          }}
                          className={`text-ink-mute mt-1.5 flex items-center gap-1.5 w-full ${
                            (item.examTimeAlign || cardAlign) === 'center' ? 'justify-center' : (item.examTimeAlign || cardAlign) === 'right' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <InlineInput 
                            value={item.examTime} 
                            onChange={val => updateItemField(item.id, 'examTime', val)} 
                            disabled={isLocked} 
                          />
                          {/* Accent pill style matching Reference Screenshot 3 */}
                          <div 
                            style={{ backgroundColor: item.accentColor }} 
                            className="w-5 h-2 rounded-sm shrink-0 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Left Vertical Divider Line & Drag Handle */}
                      <div className="relative group/div-left flex items-center shrink-0">
                        {effectiveShowLeftDiv && (
                          <div 
                            style={{ 
                              borderRight: `${effectiveVLineStyle === 'dashed' ? '1.5px' : effectiveVLineStyle === 'dotted' ? '2px' : '1px'} ${effectiveVLineStyle} ${effectiveVLineColor}`,
                              opacity: effectiveVLineOpacity,
                              height: lineHeightPercent
                            }} 
                            className="w-0 shrink-0 my-auto"
                          />
                        )}
                        {!isLocked && (
                          <div 
                            onMouseDown={(e) => handleStartDrag(e, item.id, 'col-left', effectiveLeftWidth)}
                            className="absolute -left-2.5 top-0 bottom-0 w-5 cursor-col-resize z-20 flex items-center justify-center hover:bg-primary/20 rounded transition-colors no-export group/handle"
                            title="Drag left/right to adjust Left Column width"
                          >
                            <div className="w-1 h-5 bg-primary/40 rounded-full group-hover/handle:bg-primary group-hover/handle:scale-125 transition-all" />
                          </div>
                        )}
                      </div>

                      {/* Middle Column: Course Code & Subject Name */}
                      <div className="flex-1 px-3 flex flex-col justify-center select-text overflow-hidden">
                        <div 
                          style={{
                            fontWeight: item.courseCodeBold !== false ? '800' : 'normal',
                            fontStyle: item.courseCodeItalic ? 'italic' : 'normal',
                            textAlign: item.courseCodeAlign || cardAlign || 'left',
                            fontSize: `${item.courseCodeFontSize || 14}px`
                          }}
                          className="leading-tight text-ink w-full"
                        >
                          <InlineInput 
                            value={item.courseCode} 
                            onChange={val => updateItemField(item.id, 'courseCode', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                        <div 
                          style={{
                            fontWeight: item.courseNameBold !== false ? 'bold' : 'normal',
                            fontStyle: item.courseNameItalic ? 'italic' : 'normal',
                            textAlign: item.courseNameAlign || cardAlign || 'left',
                            fontSize: `${item.courseNameFontSize || 10}px`
                          }}
                          className="leading-snug tracking-wide mt-1 uppercase opacity-80 w-full"
                        >
                          <InlineInput 
                            value={item.courseName} 
                            onChange={val => updateItemField(item.id, 'courseName', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                      </div>

                      {/* Right Vertical Divider Line & Drag Handle */}
                      <div className="relative group/div-right flex items-center shrink-0">
                        {effectiveShowRightDiv && (
                          <div 
                            style={{ 
                              borderRight: `${effectiveVLineStyle === 'dashed' ? '1.5px' : effectiveVLineStyle === 'dotted' ? '2px' : '1px'} ${effectiveVLineStyle} ${effectiveVLineColor}`,
                              opacity: effectiveVLineOpacity,
                              height: lineHeightPercent
                            }} 
                            className="w-0 shrink-0 my-auto"
                          />
                        )}
                        {!isLocked && (
                          <div 
                            onMouseDown={(e) => handleStartDrag(e, item.id, 'col-right', effectiveRightWidth)}
                            className="absolute -left-2.5 top-0 bottom-0 w-5 cursor-col-resize z-20 flex items-center justify-center hover:bg-primary/20 rounded transition-colors no-export group/handle"
                            title="Drag left/right to adjust Right Column width"
                          >
                            <div className="w-1 h-5 bg-primary/40 rounded-full group-hover/handle:bg-primary group-hover/handle:scale-125 transition-all" />
                          </div>
                        )}
                      </div>

                      {/* Right Column: Rooms & Capacities */}
                      <div 
                        style={{
                          width: `${effectiveRightWidth}px`,
                          fontWeight: item.roomsBold !== false ? 'bold' : 'normal',
                          fontStyle: item.roomsItalic ? 'italic' : 'normal',
                          textAlign: item.roomsAlign || cardAlign || 'left',
                          fontSize: `${item.roomsFontSize || 12}px`
                        }}
                        className="pl-3 flex flex-col justify-center font-mono leading-normal select-text whitespace-pre-line opacity-95 overflow-hidden shrink-0"
                      >
                        <InlineInput 
                          value={item.rooms} 
                          onChange={val => updateItemField(item.id, 'rooms', val)} 
                          isTextArea={true}
                          disabled={isLocked} 
                        />
                      </div>

                      {/* Bottom Drag Handle for Card Height */}
                      {!isLocked && (
                        <div 
                          onMouseDown={(e) => handleStartDrag(e, item.id, 'card-height', effectiveCardHeight || 85)}
                          className="absolute left-1/2 bottom-0 -translate-x-1/2 w-12 h-2.5 cursor-row-resize z-20 flex items-center justify-center bg-primary/20 hover:bg-primary border-t border-x border-primary/40 rounded-t-sm shadow-sm transition-all opacity-0 group-hover:opacity-100 no-export group/h-handle"
                          title="Drag up/down to adjust Card Height"
                        >
                          <div className="w-4 h-0.5 bg-primary group-hover/h-handle:bg-white rounded-full transition-colors" />
                        </div>
                      )}

                      {/* Hover controls (Reorder / Duplicate / Delete overlay) */}
                      {!isLocked && (
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur border border-hairline rounded-md shadow-md px-1.5 py-0.5 flex items-center gap-1 z-30 no-export">
                          
                          {/* Move Up */}
                          <button 
                            disabled={index === 0}
                            onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                            className="p-1 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary transition-colors"
                            title="Move Up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>

                          {/* Move Down */}
                          <button 
                            disabled={index === items.length - 1}
                            onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                            className="p-1 hover:bg-canvas-soft rounded disabled:opacity-30 cursor-pointer text-ink hover:text-primary transition-colors"
                            title="Move Down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>

                          <div className="w-px h-3 bg-hairline my-auto" />

                          {/* Duplicate */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicateItem(index); }}
                            className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-ink hover:text-primary transition-colors"
                            title="Duplicate Card"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                            className="p-1 hover:bg-accent-tomato/10 rounded cursor-pointer text-accent-tomato transition-colors"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3 h-3" />
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
                className={`p-4 border border-hairline transition-all duration-300 ${cardShadow}`}
              >
                <div 
                  style={{
                    fontWeight: footerLeftBold ? 'bold' : 'normal',
                    fontStyle: footerLeftItalic ? 'italic' : 'normal',
                    textAlign: footerLeftAlign || 'center',
                    fontSize: `${footerLeftFontSize || 13}px`
                  }}
                  className="tracking-wider uppercase"
                >
                  <InlineInput 
                    value={footerLeft} 
                    onChange={setFooterLeft} 
                    disabled={isLocked}
                  />
                </div>
                <div 
                  style={{
                    fontWeight: footerRightBold ? 'bold' : 'normal',
                    fontStyle: footerRightItalic ? 'italic' : 'normal',
                    textAlign: footerRightAlign || 'center',
                    fontSize: `${footerRightFontSize || 12}px`
                  }}
                  className="tracking-wide uppercase mt-1 opacity-80"
                >
                  <InlineInput 
                    value={footerRight} 
                    onChange={setFooterRight} 
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Optional Routine Notes & Instructions Box */}
              {showInstructions && routineNotes && routineNotes !== '<p></p>' && (
                <div 
                  onClick={() => { if (!isLocked) setActiveTab('headers'); }}
                  style={{ 
                    backgroundColor: cardBg,
                    borderRadius: cardRoundedness,
                    color: cardTextColor
                  }}
                  className={`p-4 border border-hairline text-left transition-all duration-300 ${cardShadow} space-y-2 cursor-pointer hover:ring-2 hover:ring-primary/40 relative group`}
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

export default ExamCanvaEditor;
