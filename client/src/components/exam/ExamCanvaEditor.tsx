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
  examDateBold?: boolean;
  examDateItalic?: boolean;
  courseNameBold?: boolean;
  courseNameItalic?: boolean;
  examTimeBold?: boolean;
  examTimeItalic?: boolean;
  roomsBold?: boolean;
  roomsItalic?: boolean;
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
        className="w-full bg-transparent border-b border-primary text-inherit focus:outline-none p-0 font-inherit text-inherit text-center"
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
  const [headerSubtitleBold, setHeaderSubtitleBold] = useState(true);
  const [headerSubtitleItalic, setHeaderSubtitleItalic] = useState(false);
  const [footerLeftBold, setFooterLeftBold] = useState(true);
  const [footerLeftItalic, setFooterLeftItalic] = useState(false);
  const [footerRightBold, setFooterRightBold] = useState(true);
  const [footerRightItalic, setFooterRightItalic] = useState(false);
  
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
  
  // Custom font & text alignment state
  const [selectedFont, setSelectedFont] = useState("'Montserrat', sans-serif");
  const [headerAlign, setHeaderAlign] = useState<'left' | 'center' | 'right'>('center');
  const [cardAlign, setCardAlign] = useState<'left' | 'center' | 'right'>('left');

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

  // Initialize Canvas items from prop routines
  useEffect(() => {
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

      return {
        id: `routine-${r.id || Math.random().toString(36).substr(2, 9)}`,
        courseCode: code,
        courseName: r.course_name || matchedCourse?.course_name || '',
        examDate: formatDateToShort(r.exam_date),
        examTime: formatTimeTo12Hour(r.start_time),
        rooms: rooms,
        accentColor: accentColor
      };
    });

    setItems(formattedItems);

    if (routines.length > 0) {
      const type = routines[0].exam_type || 'MID';
      setHeaderTitle(`${type.toUpperCase()} - EXAM`);
      
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

  // Edit item details
  const updateItemField = (id: string, field: keyof CanvasItem, value: string | boolean | any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
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
                        onClick={() => setHeaderAlign('left')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${headerAlign === 'left' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setHeaderAlign('center')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${headerAlign === 'center' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setHeaderAlign('right')} 
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
                        onClick={() => setCardAlign('left')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cardAlign === 'left' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCardAlign('center')} 
                        className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${cardAlign === 'center' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCardAlign('right')} 
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
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Card Styles</label>
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
                      checked={showVerticalLines}
                      onChange={e => setShowVerticalLines(e.target.checked)}
                      className="rounded border-hairline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="v-lines" className="text-xs text-ink-secondary cursor-pointer font-semibold">Vertical Dividers</label>
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">Header Main Title</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setHeaderTitleBold(!headerTitleBold)}
                          className={`p-1 rounded cursor-pointer transition-colors ${headerTitleBold ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setHeaderTitleItalic(!headerTitleItalic)}
                          className={`p-1 rounded cursor-pointer transition-colors ${headerTitleItalic ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={headerTitle} 
                      onChange={e => setHeaderTitle(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">Header Subtitle</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setHeaderSubtitleBold(!headerSubtitleBold)}
                          className={`p-1 rounded cursor-pointer transition-colors ${headerSubtitleBold ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setHeaderSubtitleItalic(!headerSubtitleItalic)}
                          className={`p-1 rounded cursor-pointer transition-colors ${headerSubtitleItalic ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">Footer Left Text</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setFooterLeftBold(!footerLeftBold)}
                          className={`p-1 rounded cursor-pointer transition-colors ${footerLeftBold ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFooterLeftItalic(!footerLeftItalic)}
                          className={`p-1 rounded cursor-pointer transition-colors ${footerLeftItalic ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={footerLeft} 
                      onChange={e => setFooterLeft(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-hairline bg-canvas text-ink rounded focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">Footer Right Text</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setFooterRightBold(!footerRightBold)}
                          className={`p-1 rounded cursor-pointer transition-colors ${footerRightBold ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFooterRightItalic(!footerRightItalic)}
                          className={`p-1 rounded cursor-pointer transition-colors ${footerRightItalic ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-canvas-soft'}`}
                          title="Toggle Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] uppercase font-bold text-gray-500">Course Code</label>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'courseCodeBold', selectedItem.courseCodeBold === false ? true : false)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.courseCodeBold !== false ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Bold"
                            >
                              <Bold className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'courseCodeItalic', !selectedItem.courseCodeItalic)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.courseCodeItalic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Italic"
                            >
                              <Italic className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={selectedItem.courseCode} 
                          onChange={e => updateItemField(selectedItem.id, 'courseCode', e.target.value)}
                          className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] uppercase font-bold text-gray-500">Exam Date</label>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'examDateBold', selectedItem.examDateBold === false ? true : false)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.examDateBold !== false ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Bold"
                            >
                              <Bold className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'examDateItalic', !selectedItem.examDateItalic)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.examDateItalic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Italic"
                            >
                              <Italic className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
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
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-gray-500">Course Name</label>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => updateItemField(selectedItem.id, 'courseNameBold', selectedItem.courseNameBold === false ? true : false)}
                            className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.courseNameBold !== false ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                            title="Toggle Bold"
                          >
                            <Bold className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(selectedItem.id, 'courseNameItalic', !selectedItem.courseNameItalic)}
                            className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.courseNameItalic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                            title="Toggle Italic"
                          >
                            <Italic className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        value={selectedItem.courseName} 
                        onChange={e => updateItemField(selectedItem.id, 'courseName', e.target.value)}
                        className="w-full h-8 px-1.5 text-xs border border-hairline bg-canvas rounded text-ink focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Time & Accent Custom Color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] uppercase font-bold text-gray-500">Time</label>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'examTimeBold', selectedItem.examTimeBold === false ? true : false)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.examTimeBold !== false ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Bold"
                            >
                              <Bold className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemField(selectedItem.id, 'examTimeItalic', !selectedItem.examTimeItalic)}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.examTimeItalic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                              title="Toggle Italic"
                            >
                              <Italic className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
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
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-gray-500">Rooms & Seating Counts (one per line)</label>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => updateItemField(selectedItem.id, 'roomsBold', selectedItem.roomsBold === false ? true : false)}
                            className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.roomsBold !== false ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                            title="Toggle Bold"
                          >
                            <Bold className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(selectedItem.id, 'roomsItalic', !selectedItem.roomsItalic)}
                            className={`p-0.5 rounded cursor-pointer transition-colors ${selectedItem.roomsItalic ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400 hover:bg-canvas-soft'}`}
                            title="Toggle Italic"
                          >
                            <Italic className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <textarea 
                        value={selectedItem.rooms} 
                        onChange={e => updateItemField(selectedItem.id, 'rooms', e.target.value)}
                        className="w-full p-1.5 text-xs border border-hairline bg-canvas rounded font-mono text-ink focus:border-primary focus:outline-none"
                        rows={3}
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
                className={`p-6 text-center border border-hairline transition-all duration-300 ${cardShadow}`}
              >
                <h1 
                  style={{
                    fontWeight: headerTitleBold ? 'bold' : 'normal',
                    fontStyle: headerTitleItalic ? 'italic' : 'normal'
                  }}
                  className="text-2xl tracking-tight leading-tight uppercase"
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
                    fontStyle: headerSubtitleItalic ? 'italic' : 'normal'
                  }}
                  className="text-base tracking-widest uppercase mt-1 opacity-80"
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

                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleSelectCard(item.id)}
                      style={{ 
                        backgroundColor: cardBg,
                        borderRadius: cardRoundedness,
                        color: cardTextColor,
                        borderColor: cardBorderType === 'accent' ? item.accentColor : cardBorderColor,
                        textAlign: cardAlign
                      }}
                      className={`relative p-5 flex items-stretch gap-2 group cursor-pointer transition-all duration-300 ${cardShadow} ${borderStyle} ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2 scale-[1.01]' 
                          : 'hover:scale-[1.005] hover:shadow-md'
                      }`}
                    >
                      {/* Left Column: Date & Time + Accent color pill (aligned perfectly) */}
                      <div className="w-[145px] pr-3 flex flex-col justify-center select-text border-r border-[#dfdfdf]/60">
                        <div 
                          style={{
                            fontWeight: item.examDateBold !== false ? 'bold' : 'normal',
                            fontStyle: item.examDateItalic ? 'italic' : 'normal'
                          }}
                          className="text-sm leading-tight"
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
                            fontStyle: item.examTimeItalic ? 'italic' : 'normal'
                          }}
                          className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5"
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

                      {/* Middle Column: Course Code & Subject Name */}
                      <div className="flex-1 px-4 flex flex-col justify-center select-text">
                        <div 
                          style={{
                            fontWeight: item.courseCodeBold !== false ? '800' : 'normal',
                            fontStyle: item.courseCodeItalic ? 'italic' : 'normal'
                          }}
                          className="text-sm leading-tight text-ink"
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
                            fontStyle: item.courseNameItalic ? 'italic' : 'normal'
                          }}
                          className="text-[10px] leading-snug tracking-wide mt-1 uppercase opacity-80"
                        >
                          <InlineInput 
                            value={item.courseName} 
                            onChange={val => updateItemField(item.id, 'courseName', val)} 
                            disabled={isLocked} 
                          />
                        </div>
                      </div>

                      {/* Vertical Divider (Before Rooms list) */}
                      {showVerticalLines && (
                        <div className="w-px shrink-0 self-stretch my-1 border-r border-[#dfdfdf]/60" />
                      )}

                      {/* Right Column: Rooms & Capacities */}
                      <div 
                        style={{
                          fontWeight: item.roomsBold !== false ? 'bold' : 'normal',
                          fontStyle: item.roomsItalic ? 'italic' : 'normal'
                        }}
                        className="w-[115px] pl-3 flex flex-col justify-center text-xs font-mono leading-normal select-text whitespace-pre-line opacity-95"
                      >
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

                          <div className="w-px h-3 bg-hairline" />

                          {/* Duplicate */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicateItem(index); }}
                            className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-ink hover:text-primary transition-colors"
                            title="Duplicate Card"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                            className="p-1 hover:bg-canvas-soft rounded cursor-pointer text-accent-tomato hover:bg-accent-tomato/10 transition-colors"
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
                className={`p-4 border border-hairline text-center transition-all duration-300 ${cardShadow}`}
              >
                <div 
                  style={{
                    fontWeight: footerLeftBold ? 'bold' : 'normal',
                    fontStyle: footerLeftItalic ? 'italic' : 'normal'
                  }}
                  className="text-[13px] tracking-wider uppercase"
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
                    fontStyle: footerRightItalic ? 'italic' : 'normal'
                  }}
                  className="text-[12px] tracking-wide uppercase mt-1 opacity-80"
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
