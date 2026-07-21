import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderPlus, X } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import CustomSelect from '../ui/custom-select';

interface Course {
  id: string;
  course_id: string;
  course_name: string;
}

interface CreateFolderModalProps {
  show: boolean;
  onClose: () => void;
  courses: Course[];
  onCreated?: () => void;
}

export default function CreateFolderModal({ show, onClose, courses, onCreated }: CreateFolderModalProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCourseId, setNewFolderCourseId] = useState('');

  if (!show) return null;

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }
    try {
      await filesAPI.createFolder(newFolderName.trim(), newFolderCourseId || null);
      toast.success('Folder created successfully');
      setNewFolderName('');
      setNewFolderCourseId('');
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create folder');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
              <FolderPlus className="text-primary w-5 h-5" />
              Create New Folder
            </h3>
            <button onClick={() => { setNewFolderName(''); setNewFolderCourseId(''); onClose(); }} className="text-ink-mute hover:text-ink transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">Folder Name</label>
              <input type="text" placeholder="e.g. Shared Documents, Assignment Instructions" value={newFolderName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)} className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder-ink-mute/50 focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">Associate with Course (Optional)</label>
              <CustomSelect
                value={newFolderCourseId}
                onChange={(val) => setNewFolderCourseId(val)}
                placeholder="Personal / General (No Course)"
                options={[
                  { value: '', label: 'Personal / General (No Course)' },
                  ...courses.map((course) => ({ value: String(course.id), label: `${course.course_id} - ${course.course_name}` })),
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => { setNewFolderName(''); setNewFolderCourseId(''); onClose(); }} className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-sm transition-colors border border-hairline cursor-pointer">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded-sm shadow-sm transition-colors cursor-pointer">Create</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
