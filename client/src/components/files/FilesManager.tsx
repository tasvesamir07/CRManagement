import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI, coursesAPI, bulkAPI } from '../../services/api';
import {
  Search, Download, Trash2, Upload, File, Image, FileText,
  FileArchive, ChevronLeft, ChevronRight, Send,
  UploadCloud, Folder, FolderPlus, ArrowLeft, FolderClosed,
  Eye, FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpload } from '../../context/UploadContext';
import { formatSize, formatDate } from '../../lib/announcementPresets';
import LightboxPreviewModal from '../announcement/LightboxPreviewModal';
import CreateFolderModal from './CreateFolderModal';
import DeleteFolderModal from './DeleteFolderModal';
import MoveFilesModal from './MoveFilesModal';
import ExpiryModal from './ExpiryModal';
import CompressModal from './CompressModal';
import ExtractZipModal from './ExtractZipModal';

interface FileItem {
  id: string;
  original_name: string;
  file_type?: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by_name?: string;
  uploaded_by_username?: string;
  expires_at?: string;
}

interface FolderItem {
  id: string;
  name: string;
  course_code?: string;
  created_at?: string;
}

interface CourseItem {
  id: string;
  course_id: string;
  course_name: string;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

interface StorageUsageInfo {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  breakdown?: {
    images: number;
    documents: number;
    archives: number;
    others: number;
  };
  storageType?: string;
}

const TYPE_ICONS: Record<string, typeof File> = {
  'image': Image,
  'application/pdf': FileText,
  'application/zip': FileArchive,
  'application/x-rar-compressed': FileArchive,
  'default': File,
};

const getFileIcon = (type?: string) => {
  const Icon = Object.entries(TYPE_ICONS).find(([key]) => type?.startsWith(key))?.[1] || TYPE_ICONS.default;
  return Icon;
};

const FilesManager = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, totalPages: 1, total: 0, limit: 50 });
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, uploads } = useUpload();
  const prevCompletedCountRef = useRef(0);

  const [storageUsage, setStorageUsage] = useState<StorageUsageInfo>({ usedBytes: 0, limitBytes: 104857600, percentage: 0 });

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [draggedOverFolderId, setDraggedOverFolderId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [previewTextError, setPreviewTextError] = useState(false);

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryFile, setExpiryFile] = useState<FileItem | null>(null);

  const [showCompressModal, setShowCompressModal] = useState(false);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractFile, setExtractFile] = useState<FileItem | null>(null);

  const handleFileDragStart = (e: React.DragEvent, file: FileItem) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      fileId: file.id,
      selectedIds: selectedFileIds.has(file.id) ? Array.from(selectedFileIds) : [file.id]
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDraggedOverFolderId(folderId);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverFolderId(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDraggedOverFolderId(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { selectedIds } = JSON.parse(dataStr);
      
      await filesAPI.moveFiles(selectedIds, folderId);
      toast.success(`Successfully moved ${selectedIds.length} file(s)`);
      setSelectedFileIds(new Set());
      fetchFiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to move files');
    }
  };

  const handlePreview = async (file: FileItem) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const data = await filesAPI.getDownloadUrl(file.id);
      setPreviewUrl(data.url);
    } catch {
      toast.error('Failed to load file preview');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!previewFile || !previewUrl) {
      setPreviewTextContent('');
      setPreviewTextError(false);
      return;
    }
    const isText = (previewFile.file_type && previewFile.file_type.startsWith('text/')) ||
                   previewFile.original_name.toLowerCase().endsWith('.csv') ||
                   previewFile.original_name.toLowerCase().endsWith('.txt');
    if (isText) {
      setPreviewTextContent('');
      setPreviewTextError(false);
      fetch(previewUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch text content');
          return res.text();
        })
        .then(text => {
          setPreviewTextContent(text);
        })
        .catch(err => {
          console.error('[Preview] Text fetch failed:', err);
          setPreviewTextError(true);
        });
    }
  }, [previewFile, previewUrl]);

  const getExpiryLabel = (expiresAt?: string) => {
    if (!expiresAt) return 'Permanent';
    const diffTime = new Date(expiresAt).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const matchesFilter = (file: FileItem, currentFilter: string) => {
    if (currentFilter === 'all') return true;
    const mime = (file.file_type || '').toLowerCase();
    if (currentFilter === 'images') {
      return mime.startsWith('image/');
    }
    if (currentFilter === 'documents') {
      return (
        mime.includes('pdf') || 
        mime.includes('word') || 
        mime.includes('excel') || 
        mime.includes('powerpoint') || 
        mime.includes('presentation') || 
        mime.includes('sheet') || 
        mime.includes('text/') || 
        mime.includes('csv') ||
        mime.includes('msword') ||
        mime.includes('officedocument') ||
        mime.includes('epub')
      );
    }
    if (currentFilter === 'archives') {
      return (
        mime.includes('zip') || 
        mime.includes('rar') || 
        mime.includes('tar') || 
        mime.includes('compressed') ||
        mime.includes('7z')
      );
    }
    if (currentFilter === 'others') {
      return !(
        mime.startsWith('image/') ||
        mime.includes('pdf') || 
        mime.includes('word') || 
        mime.includes('excel') || 
        mime.includes('powerpoint') || 
        mime.includes('presentation') || 
        mime.includes('sheet') || 
        mime.includes('text/') || 
        mime.includes('csv') ||
        mime.includes('msword') ||
        mime.includes('officedocument') ||
        mime.includes('epub') ||
        mime.includes('zip') || 
        mime.includes('rar') || 
        mime.includes('tar') || 
        mime.includes('compressed') ||
        mime.includes('7z')
      );
    }
    return true;
  };

  const sortFiles = (a: FileItem, b: FileItem, currentSortBy: string) => {
    if (currentSortBy === 'newest') {
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    }
    if (currentSortBy === 'oldest') {
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    }
    if (currentSortBy === 'size-large') {
      return (b.file_size || 0) - (a.file_size || 0);
    }
    if (currentSortBy === 'size-small') {
      return (a.file_size || 0) - (b.file_size || 0);
    }
    if (currentSortBy === 'name-asc') {
      return (a.original_name || '').localeCompare(b.original_name || '');
    }
    if (currentSortBy === 'name-desc') {
      return (b.original_name || '').localeCompare(a.original_name || '');
    }
    return 0;
  };

  const displayedFiles = files
    .filter(file => matchesFilter(file, filter))
    .sort((a, b) => sortFiles(a, b, sortBy));

  const handleToggleSelect = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (displayedFiles.length === 0) return;
    const allSelected = displayedFiles.every(f => selectedFileIds.has(f.id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        displayedFiles.forEach(f => next.delete(f.id));
      } else {
        displayedFiles.forEach(f => next.add(f.id));
      }
      return next;
    });
  };

  const handleShareFiles = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    navigate(`/announcement/new?file_ids=${ids.join(',')}`);
  };

  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [page, search, currentFolderId]);

  const fetchStorageUsage = useCallback(async () => {
    try {
      const usage = await filesAPI.getStorageUsage();
      setStorageUsage(usage);
    } catch (e) {
      console.error('Failed to load storage usage:', e);
    }
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const list = await coursesAPI.list();
        setCourses(list);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
    fetchStorageUsage();
  }, [fetchStorageUsage]);

  const fetchFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const result = await filesAPI.listFolders();
      setFolders(result);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load folders');
    }
    setFoldersLoading(false);
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await filesAPI.list({ 
        page, 
        limit: 50, 
        search, 
        folderId: currentFolderId || '' 
      });
      setFiles(result.files);
      setPagination(result.pagination);
      fetchStorageUsage();
    } catch {
      toast.error('Failed to load files');
    }
    setLoading(false);
  }, [page, search, currentFolderId, fetchStorageUsage]);

  useEffect(() => { 
    fetchFiles(); 
  }, [fetchFiles]);

  useEffect(() => {
    const completedUploadsCount = uploads.filter(
      (u: any) => u.status === 'completed' && u.folderId === currentFolderId
    ).length;
    
    if (prevCompletedCountRef.current !== completedUploadsCount) {
      prevCompletedCountRef.current = completedUploadsCount;
      fetchFiles();
      fetchStorageUsage();
    }
  }, [uploads, currentFolderId, fetchFiles, fetchStorageUsage]);

  useEffect(() => {
    if (currentFolderId === null) {
      fetchFolders();
    }
  }, [currentFolderId, fetchFolders]);

  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [currentFolderId, filter, search, page]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;
    await uploadFiles(fileList, currentFolderId as any);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { url } = await filesAPI.getDownloadUrl(file.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this file permanently?')) return;
    setDeleting(prev => new Set(prev).add(id));
    try {
      await filesAPI.delete(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('File deleted');
      fetchStorageUsage();
    } catch {
      toast.error('Delete failed');
    }
    setDeleting(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedFileIds.size} selected file(s)?`)) return;
    
    const idsToDelete = [...selectedFileIds];
    setDeleting(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.add(id));
      return next;
    });
    
    try {
      await bulkAPI.deleteFiles(idsToDelete);
      setFiles(prev => prev.filter(f => !selectedFileIds.has(f.id)));
      setSelectedFileIds(new Set());
      toast.success('Selected files deleted successfully');
      fetchFiles();
      fetchStorageUsage();
    } catch {
      toast.error('Bulk deletion failed');
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleShareFolder = async (folderId: string) => {
    try {
      const result = await filesAPI.list({ limit: 200, folderId });
      const ids = result.files.map((f: FileItem) => f.id);
      if (ids.length === 0) {
        toast.error('This folder is empty');
        return;
      }
      navigate(`/announcement/new?file_ids=${ids.join(',')}`);
    } catch {
      toast.error('Failed to prepare folder files');
    }
  };

  const totalLimit = storageUsage.limitBytes || 104857600;
  const breakImages = storageUsage.breakdown?.images || 0;
  const breakDocs = storageUsage.breakdown?.documents || 0;
  const breakArcs = storageUsage.breakdown?.archives || 0;
  const breakOthers = storageUsage.breakdown?.others || 0;
  
  const pctImages = (breakImages / totalLimit) * 100;
  const pctDocs = (breakDocs / totalLimit) * 100;
  const pctArcs = (breakArcs / totalLimit) * 100;
  const pctOthers = (breakOthers / totalLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-sans">Uploaded Files</h1>
          <p className="text-xs text-ink-mute mt-1.5 font-sans">Manage uploaded assets and files used across broadcast channels.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder-ink-mute/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {selectedFileIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShareFiles([...selectedFileIds])}
                className="flex items-center justify-center h-9 px-4 border border-transparent rounded-sm shadow-sm text-xs font-semibold text-on-primary bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors duration-150 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Share Selected ({selectedFileIds.size})
              </button>
              <button
                onClick={() => setShowMoveModal(true)}
                className="flex items-center justify-center h-9 px-4 border border-hairline rounded-sm shadow-sm text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft-strong focus:outline-none transition-colors duration-150 cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5 mr-1.5" />
                Move Selected ({selectedFileIds.size})
              </button>
              <button
                onClick={() => setShowCompressModal(true)}
                className="flex items-center justify-center h-9 px-4 border border-hairline rounded-sm shadow-sm text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft-strong focus:outline-none transition-colors duration-150 cursor-pointer"
              >
                <FileArchive className="w-3.5 h-3.5 mr-1.5" />
                Compress Selected ({selectedFileIds.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center justify-center h-9 px-4 border border-transparent rounded-sm shadow-sm text-xs font-semibold text-on-primary bg-red-600 hover:bg-red-700 focus:outline-none transition-colors duration-150 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected ({selectedFileIds.size})
              </button>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center h-9 px-4 border border-transparent rounded-sm shadow-sm text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors duration-150 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="bg-canvas-soft/60 border border-hairline rounded-lg p-4 max-w-lg">
        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-mute mb-2">
          <span>{storageUsage.storageType || 'Storage Space'}</span>
          <span>{(storageUsage.usedBytes / 1024 / 1024).toFixed(2)} MB / {(storageUsage.limitBytes / 1024 / 1024).toFixed(0)} MB ({storageUsage.percentage}%)</span>
        </div>
        <div className="w-full bg-hairline rounded-full h-2.5 overflow-hidden flex">
          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${pctImages}%` }} title={`Images: ${(breakImages / 1024 / 1024).toFixed(2)} MB`} />
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${pctDocs}%` }} title={`Documents: ${(breakDocs / 1024 / 1024).toFixed(2)} MB`} />
          <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${pctArcs}%` }} title={`Archives: ${(breakArcs / 1024 / 1024).toFixed(2)} MB`} />
          <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${pctOthers}%` }} title={`Others: ${(breakOthers / 1024 / 1024).toFixed(2)} MB`} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 pt-2 border-t border-hairline/40 text-[10px] font-semibold font-sans">
          <div className="flex items-center gap-1.5 text-ink-mute">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span>Images: {(breakImages / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-mute">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Documents: {(breakDocs / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-mute">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>Archives: {(breakArcs / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-mute">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
            <span>Others: {(breakOthers / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
        {storageUsage.percentage >= 100 && <p className="text-[10px] text-accent-tomato font-semibold mt-1 flex items-center gap-1">⚠️ Storage limit reached. Remove files to upload more.</p>}
      </div>

      {currentFolderId !== null && (
        <div className="flex items-center gap-3 py-1 font-sans">
          <button
            onClick={() => {
              setCurrentFolderId(null);
              setCurrentFolderName('');
              setPage(1);
            }}
            className="flex items-center justify-center gap-2 h-9 px-4 border border-hairline rounded-sm shadow-sm text-xs font-semibold text-ink bg-canvas hover:bg-canvas-soft focus:outline-none transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            Back to Folders
          </button>
          <span className="text-hairline-strong text-lg">/</span>
          <div className="text-sm font-semibold text-ink bg-canvas-soft/60 px-3 py-2 rounded-lg border border-hairline truncate max-w-md">
            {currentFolderName}
          </div>
        </div>
      )}

      {currentFolderId === null && !search && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-ink-mute uppercase tracking-wider font-sans">Folders</h2>
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>
          
          {foldersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-24 bg-canvas-soft border border-hairline rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setShowCreateFolderModal(true)}
                className="group flex flex-col justify-center items-center h-24 p-4 border-2 border-dashed border-hairline hover:border-primary/50 bg-canvas-soft/40 hover:bg-canvas-soft/80 rounded-lg cursor-pointer transition-all duration-200"
              >
                <FolderPlus className="w-6 h-6 text-ink-mute group-hover:text-primary transition-colors mb-1.5" />
                <span className="text-xs font-semibold text-ink-mute group-hover:text-primary transition-colors font-sans">Create Folder</span>
              </div>

              {folders.map(folder => {
                const isOver = draggedOverFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setCurrentFolderId(folder.id);
                      setCurrentFolderName(folder.name);
                      setPage(1);
                    }}
                    onDragOver={(e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e: React.DragEvent) => handleFolderDragEnter(e, folder.id)}
                    onDragLeave={(e: React.DragEvent) => handleFolderDragLeave(e)}
                    onDrop={(e: React.DragEvent) => handleFolderDrop(e, folder.id)}
                    className={`group relative flex flex-col justify-between h-24 p-4 bg-canvas border rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-[2px] ${
                      isOver 
                        ? 'border-primary bg-primary/10 scale-102 shadow-md' 
                        : 'border-hairline hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <FolderClosed className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-ink group-hover:text-primary transition-colors truncate block font-sans" title={folder.name}>
                          {folder.name}
                        </span>
                        {folder.course_code ? (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 mt-1 bg-primary/10 text-primary rounded-sm uppercase tracking-wider font-sans">
                            {folder.course_code}
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 mt-1 bg-canvas-soft text-ink-mute rounded-sm font-sans">
                            Personal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-ink-mute font-sans">
                      {folder.created_at ? new Date(folder.created_at).toLocaleDateString() : ''}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleShareFolder(folder.id);
                        }}
                        className="p-1.5 text-ink-mute hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-sm transition-all duration-150 cursor-pointer"
                        title="Share All Files in Folder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                          setShowDeleteFolderModal(true);
                        }}
                        className="p-1.5 text-ink-mute hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-sm transition-all duration-150 cursor-pointer"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer bg-canvas-soft flex flex-col items-center justify-center min-h-[120px] ${
          dragActive 
            ? 'border-primary bg-primary/5 shadow-inner scale-[1.005]' 
            : 'border-hairline-strong hover:border-primary/50 hover:bg-canvas-soft/80'
        }`}
      >
        <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${dragActive ? 'text-primary' : 'text-ink-mute/70'}`} />
        <p className="text-sm font-semibold text-ink font-sans">
          Drag & drop files here, or <span className="text-primary hover:underline">browse</span>
        </p>
        <p className="text-xs text-ink-mute mt-1 font-sans">
          Max 50MB per file — JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT, CSV
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-canvas-soft/40 border border-hairline p-3 rounded-lg font-sans">
        <div className="flex flex-wrap gap-1.5">
          {['all', 'images', 'documents', 'archives', 'others'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer capitalize ${
                filter === t 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-canvas hover:bg-canvas-soft border border-hairline text-ink-mute hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-mute font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="size-large">Size: Large to Small</option>
            <option value="size-small">Size: Small to Large</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
            {search ? 'No files match your search.' : 'No files uploaded yet.'}
          </div>
        ) : displayedFiles.length === 0 ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
            No files match the selected type filter.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-canvas-soft">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={displayedFiles.length > 0 && displayedFiles.every(f => selectedFileIds.has(f.id))}
                        onChange={handleToggleSelectAll}
                        className="accent-primary w-4 h-4 cursor-pointer rounded-sm"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider hidden md:table-cell">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider hidden md:table-cell">Uploaded By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink-mute uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {displayedFiles.map((file) => {
                    const Icon = getFileIcon(file.file_type);
                    const isDeleting = deleting.has(file.id);
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <tr 
                        key={file.id} 
                        draggable="true"
                        onDragStart={(e: React.DragEvent) => handleFileDragStart(e, file)}
                        className={`hover:bg-canvas-soft transition-colors cursor-grab active:cursor-grabbing ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(file.id)}
                            className="accent-primary w-4 h-4 cursor-pointer rounded-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-ink font-medium truncate max-w-[200px] sm:max-w-xs block" title={file.original_name}>{file.original_name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <button
                                  onClick={() => {
                                    setExpiryFile(file);
                                    setShowExpiryModal(true);
                                  }}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm hover:underline cursor-pointer ${
                                    !file.expires_at 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400' 
                                      : new Date(file.expires_at).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                                  }`}
                                  title="Click to customize expiry date"
                                >
                                  {getExpiryLabel(file.expires_at)}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-mute hidden sm:table-cell">{file.file_type || '—'}</td>
                        <td className="px-4 py-3 text-ink-mute hidden md:table-cell">{formatSize(file.file_size)}</td>
                        <td className="px-4 py-3 text-ink-mute hidden md:table-cell">{file.uploaded_by_name || file.uploaded_by_username || '—'}</td>
                        <td className="px-4 py-3 text-ink-mute hidden lg:table-cell">{formatDate(file.uploaded_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreview(file)}
                              className="p-1.5 text-ink-mute hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-sm transition-colors cursor-pointer"
                              title="Quick Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShareFiles([file.id])}
                              className="p-1.5 text-ink-mute hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-sm transition-colors cursor-pointer"
                              title="Share in Announcement"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-1.5 text-ink-mute hover:text-primary hover:bg-primary/10 rounded-sm transition-colors cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {(file.file_type === 'application/zip' || file.original_name.toLowerCase().endsWith('.zip')) && (
                              <button
                                onClick={() => {
                                  setExtractFile(file);
                                  setShowExtractModal(true);
                                }}
                                className="p-1.5 text-ink-mute hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-sm transition-colors cursor-pointer"
                                title="Extract ZIP Contents"
                              >
                                <FolderOpen className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(file.id)}
                              disabled={isDeleting}
                              className="p-1.5 text-ink-mute hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer disabled:opacity-40"
                              title="Delete"
                            >
                              {isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-b border-red-400"></div> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-canvas-soft text-sm text-ink-mute">
                <span>{pagination.total} file{pagination.total !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 text-ink-mute hover:text-ink disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs">Page {page} of {pagination.totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-1.5 text-ink-mute hover:text-ink disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateFolderModal
        show={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        courses={courses}
        onCreated={fetchFolders}
      />

      <DeleteFolderModal
        show={showDeleteFolderModal}
        folder={folderToDelete}
        onClose={() => { setShowDeleteFolderModal(false); setFolderToDelete(null); }}
        onDeleted={() => { fetchFolders(); fetchFiles(); fetchStorageUsage(); }}
      />

      <MoveFilesModal
        show={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        folders={folders}
        selectedFileIds={selectedFileIds}
        onMoved={() => { setSelectedFileIds(new Set()); fetchFiles(); }}
      />

      <ExpiryModal
        show={showExpiryModal}
        file={expiryFile}
        onClose={() => { setShowExpiryModal(false); setExpiryFile(null); }}
        onUpdated={(updatedFile: any) => setFiles(prev => prev.map(f => f.id === updatedFile.id ? { ...f, expires_at: updatedFile.expires_at } : f))}
      />

      <CompressModal
        show={showCompressModal}
        onClose={() => setShowCompressModal(false)}
        selectedFileIds={selectedFileIds}
        currentFolderId={currentFolderId}
        onCompressed={() => { setSelectedFileIds(new Set()); fetchFiles(); fetchStorageUsage(); }}
      />

      <ExtractZipModal
        show={showExtractModal}
        file={extractFile}
        onClose={() => { setShowExtractModal(false); setExtractFile(null); }}
        currentFolderId={currentFolderId}
        onExtracted={(removedFileId: string | null) => {
          if (removedFileId) {
            setSelectedFileIds(prev => { const next = new Set(prev); next.delete(removedFileId); return next; });
          }
          fetchFiles();
          fetchStorageUsage();
        }}
      />

      <LightboxPreviewModal
        previewFile={previewFile as any}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        previewTextContent={previewTextContent}
        previewTextError={previewTextError}
        onClose={() => {
          setPreviewFile(null);
          setPreviewUrl(null);
        }}
      />
    </div>
  );
};

export default FilesManager;
