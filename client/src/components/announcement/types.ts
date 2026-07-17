export interface Section {
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  mode: 'Offline' | 'Online';
  timeOption: 'select' | 'custom' | 'tbd' | 'none';
  hasEndTime?: boolean;
}

export interface NoteItem {
  text: string;
  type: 'note' | 'instruction' | 'important';
}

export interface Notice {
  id: number;
  titlePreset: string;
  title: string;
  category: string;
  selectedCourseId: string;
  selectedDate: string;
  sections: Section[];
  topics: string[];
  notes: (string | NoteItem)[];
  makeupStatus: string;
  customMakeupText: string;
  currentTopic: string;
  currentNote: string;
  noteType: 'note' | 'instruction' | 'important';
  isExpanded: boolean;
}

export interface Platform {
  id: number;
  platform_type: 'whatsapp' | 'telegram' | 'messenger';
  platform_name: string;
  chat_id: string;
  service_available?: boolean;
  is_active?: boolean;
}

export interface Course {
  id: number;
  course_id: string;
  course_name: string;
}

export interface UploadedFile {
  id: number;
  original_name: string;
  file_size: number;
  file_type?: string;
  uploaded_at?: string;
}

export interface Folder {
  id: number;
  name: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  status: string;
  category: string;
  c_id?: string;
  created_by_name?: string;
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
  delivery: DeliveryItem[];
  files: UploadedFile[];
}

export interface DeliveryItem {
  platform_type: 'whatsapp' | 'telegram' | 'messenger';
  platform_name: string;
  platform_id?: number;
  chat_id?: string;
  platform_status: string;
  error_message?: string;
}
