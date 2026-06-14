import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { filesAPI, coursesAPI, bulkAPI } from '../../services/api';
import { 
  Search, Download, Trash2, Upload, File, Image, FileText, 
  FileArchive, ChevronLeft, ChevronRight, Send, Check, X, 
  UploadCloud, Folder, FolderPlus, ArrowLeft, FolderClosed,
  Eye, Calendar, FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpload } from '../../context/UploadContext';

const TYPE_ICONS = {
  'image': Image,
  'application/pdf': FileText,
  'application/zip': FileArchive,
  'application/x-rar-compressed': FileArchive,
  'default': File,
};

const getFileIcon = (type) => {
  const Icon = Object.entries(TYPE_ICONS).find(([key]) => type?.startsWith(key))?.[1] || TYPE_ICONS.default;
  return Icon;
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const FilesManager = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });
  const [deleting, setDeleting] = useState(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const { uploadFiles, uploads } = useUpload();
  const prevCompletedCountRef = useRef(0);

  const [storageUsage, setStorageUsage] = useState({ usedBytes: 0, limitBytes: 104857600, percentage: 0 });

  // Folder and Course States
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderName, setCurrentFolderName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCourseId, setNewFolderCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Filter and Sort states
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Drag and drop folder target state
  const [draggedOverFolderId, setDraggedOverFolderId] = useState(null);

  // Lightbox Preview states
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [previewTextError, setPreviewTextError] = useState(false);

  // Expiry Modification states
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryFile, setExpiryFile] = useState(null);
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // ZIP Compression states
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [compressArchiveName, setCompressArchiveName] = useState('archive.zip');
  const [compressing, setCompressing] = useState(false);

  // ZIP Extraction states
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractFile, setExtractFile] = useState(null);
  const [deleteOriginalZip, setDeleteOriginalZip] = useState(true);
  const [extracting, setExtracting] = useState(false);

  const handleFileDragStart = (e, file) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      fileId: file.id,
      selectedIds: selectedFileIds.has(file.id) ? Array.from(selectedFileIds) : [file.id]
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragEnter = (e, folderId) => {
    e.preventDefault();
    setDraggedOverFolderId(folderId);
  };

  const handleFolderDragLeave = (e, folderId) => {
    e.preventDefault();
    setDraggedOverFolderId(null);
  };

  const handleFolderDrop = async (e, folderId) => {
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

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const data = await filesAPI.getDownloadUrl(file.id);
      setPreviewUrl(data.url);
    } catch (err) {
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

  const handleUpdateExpiry = async (fileId, newExpiresAt) => {
    try {
      const updatedFile = await filesAPI.updateExpiry(fileId, newExpiresAt);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, expires_at: updatedFile.expires_at } : f));
      toast.success('Expiry date updated successfully');
      setShowExpiryModal(false);
      setExpiryFile(null);
    } catch (err) {
      toast.error('Failed to update expiry date');
    }
  };

  const getExpiryLabel = (expiresAt) => {
    if (!expiresAt) return 'Permanent';
    const diffTime = new Date(expiresAt) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const handleCompressFiles = async () => {
    if (selectedFileIds.size === 0) return;
    setCompressing(true);
    try {
      const archiveName = compressArchiveName.trim() || 'archive.zip';
      await filesAPI.compressFiles(Array.from(selectedFileIds), archiveName, currentFolderId);
      toast.success(`Successfully compressed files into ${archiveName}`);
      setSelectedFileIds(new Set());
      setShowCompressModal(false);
      fetchFiles();
      fetchStorageUsage();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to compress files');
    } finally {
      setCompressing(false);
    }
  };

  const handleExtractZip = async () => {
    if (!extractFile) return;
    setExtracting(true);
    try {
      const res = await filesAPI.extractZip(extractFile.id, deleteOriginalZip, currentFolderId);
      toast.success(res.message || 'Successfully extracted ZIP archive');
      if (deleteOriginalZip) {
        setSelectedFileIds(prev => {
          const next = new Set(prev);
          next.delete(extractFile.id);
          return next;
        });
      }
      setShowExtractModal(false);
      setExtractFile(null);
      fetchFiles();
      fetchStorageUsage();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to extract ZIP file');
    } finally {
      setExtracting(false);
    }
  };

  const matchesFilter = (file, currentFilter) => {
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

  const sortFiles = (a, b, currentSortBy) => {
    if (currentSortBy === 'newest') {
      return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    }
    if (currentSortBy === 'oldest') {
      return new Date(a.uploaded_at) - new Date(b.uploaded_at);
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

  const handleToggleSelect = (id) => {
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

  const handleShareFiles = (ids) => {
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

  // Fetch Courses once on mount
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
    } catch (e) {
      toast.error('Failed to load files');
    }
    setLoading(false);
  }, [page, search, currentFolderId, fetchStorageUsage]);

  useEffect(() => { 
    fetchFiles(); 
  }, [fetchFiles]);

  // Refresh files list when a global upload finishes for the current folder
  useEffect(() => {
    const completedUploadsCount = uploads.filter(
      u => u.status === 'completed' && u.folderId === currentFolderId
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

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const processFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    await uploadFiles(fileList, currentFolderId);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e) => {
    await processFiles(e.target.files);
  };

  const handleDownload = async (file) => {
    try {
      const { url } = await filesAPI.getDownloadUrl(file.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (id) => {
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
    } catch (e) {
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
    } catch (e) {
      toast.error('Bulk deletion failed');
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handlePerformMove = async (targetFolderId) => {
    try {
      await filesAPI.moveFiles([...selectedFileIds], targetFolderId);
      toast.success('Files moved successfully');
      setShowMoveModal(false);
      setSelectedFileIds(new Set());
      fetchFiles();
    } catch (err) {
      toast.error('Failed to move files');
    }
  };

  const handleShareFolder = async (folderId) => {
    try {
      const result = await filesAPI.list({ limit: 200, folderId });
      const ids = result.files.map(f => f.id);
      if (ids.length === 0) {
        toast.error('This folder is empty');
        return;
      }
      navigate(`/announcement/new?file_ids=${ids.join(',')}`);
    } catch (e) {
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
                onClick={() => {
                  setCompressArchiveName('archive.zip');
                  setShowCompressModal(true);
                }}
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

      {/* Storage Space Indicator */}
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

      {/* Breadcrumbs for navigated folder */}
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

      {/* Folders Section */}
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
              {/* Create Folder Card */}
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
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e) => handleFolderDragEnter(e, folder.id)}
                    onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareFolder(folder.id);
                        }}
                        className="p-1.5 text-ink-mute hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-sm transition-all duration-150 cursor-pointer"
                        title="Share All Files in Folder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
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

      {/* Drag & Drop Zone */}
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

      {/* Filters & Sorting */}
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
            onChange={(e) => setSortBy(e.target.value)}
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

      {/* Files Table */}
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
                        onDragStart={(e) => handleFileDragStart(e, file)}
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
                                    setCustomExpiryDate(file.expires_at ? file.expires_at.split('T')[0] : '');
                                    setShowExpiryModal(true);
                                  }}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm hover:underline cursor-pointer ${
                                    !file.expires_at 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400' 
                                      : new Date(file.expires_at) - new Date() < 3 * 24 * 60 * 60 * 1000 
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
                                  setDeleteOriginalZip(true);
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
            {/* Pagination */}
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

      {/* Create Folder Modal */}
      {showCreateFolderModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <FolderPlus className="text-primary w-5 h-5" />
                  Create New Folder
                </h3>
                <button
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                    setNewFolderCourseId('');
                  }}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shared Documents, Assignment Instructions"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder-ink-mute/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">
                    Associate with Course (Optional)
                  </label>
                  <select
                    value={newFolderCourseId}
                    onChange={(e) => setNewFolderCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Personal / General (No Course)</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.course_id} - {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                    setNewFolderCourseId('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-sm transition-colors border border-hairline cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newFolderName.trim()) {
                      toast.error('Folder name is required');
                      return;
                    }
                    try {
                      await filesAPI.createFolder(newFolderName.trim(), newFolderCourseId || null);
                      toast.success('Folder created successfully');
                      setShowCreateFolderModal(false);
                      setNewFolderName('');
                      setNewFolderCourseId('');
                      fetchFolders();
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to create folder');
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded-sm shadow-sm transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && folderToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <Trash2 className="text-red-500 w-5 h-5" />
                  Delete Folder
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setFolderToDelete(null);
                  }}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-ink font-sans">
                  Are you sure you want to delete the folder <span className="font-bold text-primary">"{folderToDelete.name}"</span>?
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-xs text-red-600 dark:text-red-400 font-sans">
                    Choose what to do with the files currently inside this folder:
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={async () => {
                    try {
                      await filesAPI.deleteFolder(folderToDelete.id, true);
                      toast.success('Folder and files deleted');
                      setShowDeleteFolderModal(false);
                      setFolderToDelete(null);
                      fetchFolders();
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to delete folder');
                    }
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-on-primary bg-red-600 hover:bg-red-700 rounded-sm shadow-sm transition-colors text-center cursor-pointer"
                >
                  Delete Folder & All Files Inside
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      await filesAPI.deleteFolder(folderToDelete.id, false);
                      toast.success('Folder deleted, files kept');
                      setShowDeleteFolderModal(false);
                      setFolderToDelete(null);
                      fetchFolders();
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to delete folder');
                    }
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-ink bg-canvas-soft hover:bg-canvas-soft-strong border border-hairline rounded-sm transition-colors text-center cursor-pointer"
                >
                  Delete Folder Only (Keep files and move to Root)
                </button>

                <button
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setFolderToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-medium text-ink-mute hover:text-ink transition-colors text-center cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Move Files Modal */}
      {showMoveModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <Folder className="text-primary w-5 h-5" />
                  Move Files
                </h3>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                  }}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-ink-mute font-sans">
                Select target folder for the {selectedFileIds.size} selected file(s):
              </p>

              <div className="max-h-60 overflow-y-auto border border-hairline rounded-md divide-y divide-hairline">
                <div
                  onClick={() => handlePerformMove(null)}
                  className="p-3 text-sm text-ink hover:bg-canvas-soft cursor-pointer transition-colors flex items-center gap-2.5 font-sans"
                >
                  <FolderClosed className="w-4.5 h-4.5 text-ink-mute" />
                  <span className="font-medium">Root Level / Uncategorized</span>
                </div>
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => handlePerformMove(folder.id)}
                    className="p-3 text-sm text-ink hover:bg-canvas-soft cursor-pointer transition-colors flex items-center gap-2.5 justify-between font-sans"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderClosed className="w-4.5 h-4.5 text-primary" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {folder.course_code && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm uppercase shrink-0">
                        {folder.course_code}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-sm transition-colors border border-hairline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Expiry Customization Modal */}
      {showExpiryModal && expiryFile && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <Calendar className="text-primary w-5 h-5" />
                  Customize Expiry Date
                </h3>
                <button
                  onClick={() => {
                    setShowExpiryModal(false);
                    setExpiryFile(null);
                  }}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-ink-mute font-sans">
                  Set how long <span className="font-semibold text-ink">"{expiryFile.original_name}"</span> remains active in database storage.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateExpiry(expiryFile.id, null)}
                    className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer"
                  >
                    Make Permanent
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 7);
                      handleUpdateExpiry(expiryFile.id, date.toISOString());
                    }}
                    className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer"
                  >
                    Extend 7 Days
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 15);
                      handleUpdateExpiry(expiryFile.id, date.toISOString());
                    }}
                    className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer"
                  >
                    Extend 15 Days
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 30);
                      handleUpdateExpiry(expiryFile.id, date.toISOString());
                    }}
                    className="py-2 px-3 text-xs font-semibold rounded border border-hairline hover:bg-canvas-soft bg-canvas text-ink transition-colors cursor-pointer"
                  >
                    Extend 30 Days
                  </button>
                </div>

                <div className="border-t border-hairline pt-3 mt-3">
                  <label className="block text-[10px] font-bold text-ink-mute uppercase tracking-wider mb-1 font-sans">
                    Custom Date Selection
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customExpiryDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-hairline rounded bg-canvas text-ink focus:outline-none focus:border-primary transition-colors font-sans"
                    />
                    <button
                      disabled={!customExpiryDate}
                      onClick={() => handleUpdateExpiry(expiryFile.id, new Date(customExpiryDate).toISOString())}
                      className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => {
                    setShowExpiryModal(false);
                    setExpiryFile(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded transition-colors border border-hairline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ZIP Compression Modal */}
      {showCompressModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <FileArchive className="text-primary w-5 h-5" />
                  Compress Selected Files
                </h3>
                <button
                  onClick={() => setShowCompressModal(false)}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-ink-mute font-sans">
                  Pack the {selectedFileIds.size} selected file(s) into a compressed ZIP archive.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1 font-sans">
                    Archive File Name
                  </label>
                  <input
                    type="text"
                    placeholder="archive.zip"
                    value={compressArchiveName}
                    onChange={(e) => setCompressArchiveName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-canvas text-ink focus:outline-none focus:border-primary transition-colors font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  disabled={compressing}
                  onClick={() => setShowCompressModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded transition-colors border border-hairline cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={compressing || !compressArchiveName.trim()}
                  onClick={handleCompressFiles}
                  className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {compressing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Compressing...
                    </>
                  ) : (
                    'Compress'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ZIP Extraction Modal */}
      {showExtractModal && extractFile && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                  <FolderOpen className="text-amber-500 w-5 h-5" />
                  Extract ZIP Archive
                </h3>
                <button
                  onClick={() => {
                    setShowExtractModal(false);
                    setExtractFile(null);
                  }}
                  className="text-ink-mute hover:text-ink transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-ink font-sans">
                  Are you sure you want to extract the files from <span className="font-bold text-primary">"{extractFile.original_name}"</span> directly into the current folder?
                </p>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-sans">
                    Extracted folders and subfolders will be automatically recreated in your virtual folder system.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-2 font-sans">
                  <input
                    type="checkbox"
                    id="delete-original-zip"
                    checked={deleteOriginalZip}
                    onChange={(e) => setDeleteOriginalZip(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer rounded-sm"
                  />
                  <label htmlFor="delete-original-zip" className="text-xs font-semibold text-ink-mute hover:text-ink cursor-pointer select-none font-sans">
                    Auto-delete original ZIP file after extraction
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  disabled={extracting}
                  onClick={() => {
                    setShowExtractModal(false);
                    setExtractFile(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded transition-colors border border-hairline cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={extracting}
                  onClick={handleExtractZip}
                  className="px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep rounded shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Extracting...
                    </>
                  ) : (
                    'Extract'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Preview Modal */}
      {previewFile && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-canvas border border-hairline w-full max-w-4xl h-[85vh] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-hairline flex items-center justify-between bg-canvas">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-ink truncate font-sans">{previewFile.original_name}</h3>
                <p className="text-xs text-ink-mute font-sans">
                  {formatSize(previewFile.file_size)} • {previewFile.file_type}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewUrl(null);
                }}
                className="text-ink-mute hover:text-ink transition-colors p-1.5 hover:bg-canvas-soft rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 bg-canvas-soft flex items-center justify-center overflow-auto p-4">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-xs text-ink-mute font-sans">Loading preview...</p>
                </div>
              ) : previewUrl ? (
                <>
                  {previewFile.file_type?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={previewFile.original_name}
                      className="max-w-full max-h-full object-contain rounded shadow-md"
                    />
                  ) : previewFile.file_type === 'application/pdf' ? (
                    <iframe
                      src={`${previewUrl}#toolbar=0`}
                      title={previewFile.original_name}
                      className="w-full h-full border-0 rounded"
                    />
                  ) : (
                    previewFile.file_type?.includes('officedocument') ||
                    previewFile.file_type?.includes('ms-excel') ||
                    previewFile.file_type?.includes('ms-powerpoint') ||
                    previewFile.file_type?.includes('msword') ||
                    previewFile.original_name.endsWith('.docx') ||
                    previewFile.original_name.endsWith('.doc') ||
                    previewFile.original_name.endsWith('.xlsx') ||
                    previewFile.original_name.endsWith('.xls') ||
                    previewFile.original_name.endsWith('.pptx') ||
                    previewFile.original_name.endsWith('.ppt')
                  ) ? (
                    (previewUrl.includes('localhost') || previewUrl.includes('127.0.0.1')) ? (
                      <div className="text-center p-8 max-w-sm">
                        <File className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-ink font-sans mb-1">Local Preview Limitation</p>
                        <p className="text-xs text-ink-mute font-sans mb-4">Office documents (.docx, .xlsx, .pptx) cannot be previewed when running on localhost. Please download the file to view it.</p>
                        <a
                          href={previewUrl}
                          download={previewFile.original_name}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download to View
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                        title={previewFile.original_name}
                        className="w-full h-full border-0 rounded bg-canvas"
                      />
                    )
                  ) : (
                    previewFile.file_type?.startsWith('text/') ||
                    previewFile.original_name.toLowerCase().endsWith('.csv') ||
                    previewFile.original_name.toLowerCase().endsWith('.txt')
                  ) ? (
                    previewTextError ? (
                      <div className="text-center p-8 max-w-sm">
                        <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                        <p className="text-xs text-ink-mute font-sans mb-4">Could not load file content. Please download to view.</p>
                        <a
                          href={previewUrl}
                          download={previewFile.original_name}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download to View
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col bg-canvas border border-hairline rounded overflow-hidden shadow-inner">
                        <div className="overflow-auto flex-1 font-mono text-[11px] text-ink p-4 bg-canvas-soft select-text whitespace-pre-wrap leading-relaxed max-w-full text-left">
                          {previewTextContent || 'Loading content...'}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center p-8 max-w-sm">
                      <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                      <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                      <p className="text-xs text-ink-mute font-sans mb-4">This file type ({previewFile.file_type}) cannot be previewed directly in the browser.</p>
                      <a
                        href={previewUrl}
                        download={previewFile.original_name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download to View
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-mute font-sans">Failed to load preview.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FilesManager;
