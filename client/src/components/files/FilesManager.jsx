import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { filesAPI, coursesAPI } from '../../services/api';
import { 
  Search, Download, Trash2, Upload, File, Image, FileText, 
  FileArchive, ChevronLeft, ChevronRight, Send, Check, X, 
  UploadCloud, Folder, FolderPlus, ArrowLeft, FolderClosed 
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const fileInputRef = useRef(null);

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
    if (files.length === 0) return;
    const allSelected = files.every(f => selectedFileIds.has(f.id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        files.forEach(f => next.delete(f.id));
      } else {
        files.forEach(f => next.add(f.id));
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
  }, []);

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
    } catch (e) {
      toast.error('Failed to load files');
    }
    setLoading(false);
  }, [page, search, currentFolderId]);

  useEffect(() => { 
    fetchFiles(); 
  }, [fetchFiles]);

  useEffect(() => {
    if (currentFolderId === null) {
      fetchFolders();
    }
  }, [currentFolderId, fetchFolders]);

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

    let currentUsage = { usedBytes: 0, limitBytes: 104857600 };
    try {
      currentUsage = await filesAPI.getStorageUsage();
    } catch (err) {
      console.error(err);
    }

    if (currentUsage.usedBytes >= currentUsage.limitBytes) {
      toast.error('Upload failed: Storage limit reached.');
      return;
    }

    const filesArray = Array.from(fileList);
    setQueueTotal(filesArray.length);
    setQueueCurrent(1);
    setUploading(true);

    const initialQueue = filesArray.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending'
    }));
    setQueue(initialQueue);

    let uploadedCount = 0;

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setQueueCurrent(i + 1);

      setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB limit.`);
        setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed' } : item));
        continue;
      }

      try {
        setUploadProgress(0);
        const dupCheck = await filesAPI.checkDuplicate(file.name, currentFolderId);
        let overwrite = false;
        if (dupCheck.duplicate) {
          if (!window.confirm(`A file named "${file.name}" already exists in this folder. Do you want to overwrite it?`)) {
            setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed' } : item));
            continue;
          }
          overwrite = true;
        }

        const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
        await uploadFn(file, currentFolderId, (pe) => {
          const pct = Math.round((pe.loaded * 100) / pe.total);
          setUploadProgress(pct);
          setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
        });

        setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'completed', progress: 100 } : item));
        uploadedCount++;
      } catch (err) {
        toast.error(`Upload failed for "${file.name}": ${err.response?.data?.error || err.message}`);
        setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed' } : item));
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Successfully uploaded ${uploadedCount} file(s)!`);
      fetchFiles();
    }
    
    setTimeout(() => {
      setUploading(false);
      setQueue([]);
    }, 4000);

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
      toast.success('File deleted');
    } catch (e) {
      toast.error('Delete failed');
    }
    setDeleting(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

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
            <button
              onClick={() => handleShareFiles([...selectedFileIds])}
              className="flex items-center justify-center h-9 px-4 border border-transparent rounded-sm shadow-sm text-xs font-semibold text-on-primary bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors duration-150 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Share Selected ({selectedFileIds.size})
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center h-9 px-4 border border-transparent rounded-sm shadow-sm text-xs font-semibold text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload File'}
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

      {/* Breadcrumbs for navigated folder */}
      {currentFolderId !== null && (
        <div className="flex items-center gap-2 text-sm text-ink-mute font-sans bg-canvas-soft/50 py-2 px-3 rounded-lg border border-hairline w-fit">
          <button
            onClick={() => {
              setCurrentFolderId(null);
              setCurrentFolderName('');
              setPage(1);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Root
          </button>
          <span className="text-hairline-strong">/</span>
          <span className="text-ink font-semibold truncate max-w-xs">{currentFolderName}</span>
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

              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setCurrentFolderName(folder.name);
                    setPage(1);
                  }}
                  className="group relative flex flex-col justify-between h-24 p-4 bg-canvas border border-hairline hover:border-primary/40 hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-[2px]"
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                        setShowDeleteFolderModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-mute hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-sm transition-all duration-150 cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
          Max 50MB per file — JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, PPT, PPTX, TXT, CSV
        </p>
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
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-canvas-soft">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={files.length > 0 && files.every(f => selectedFileIds.has(f.id))}
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
                  {files.map((file) => {
                    const Icon = getFileIcon(file.file_type);
                    const isDeleting = deleting.has(file.id);
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <tr key={file.id} className={`hover:bg-canvas-soft transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
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
                            <span className="text-ink font-medium truncate max-w-[200px] sm:max-w-xs block">{file.original_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-mute hidden sm:table-cell">{file.file_type || '—'}</td>
                        <td className="px-4 py-3 text-ink-mute hidden md:table-cell">{formatSize(file.file_size)}</td>
                        <td className="px-4 py-3 text-ink-mute hidden md:table-cell">{file.uploaded_by_name || file.uploaded_by_username || '—'}</td>
                        <td className="px-4 py-3 text-ink-mute hidden lg:table-cell">{formatDate(file.uploaded_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
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

      {/* Upload Queue Overlay */}
      {uploading && queue.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-canvas/95 backdrop-blur-md border border-hairline shadow-2xl rounded-lg w-80 overflow-hidden font-sans flex flex-col transition-all duration-300">
          <div className="bg-canvas-soft/80 border-b border-hairline p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Uploading files ({queueCurrent}/{queueTotal})
            </span>
            <span className="text-xs text-ink-mute font-bold">
              {Math.round(queue.reduce((acc, curr) => acc + curr.progress, 0) / queueTotal)}%
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-hairline p-2 space-y-1">
            {queue.map((item) => {
              const radius = 10;
              const stroke = 2;
              const normalizedRadius = radius - stroke * 2;
              const circumference = normalizedRadius * 2 * Math.PI;
              const strokeDashoffset = circumference - (item.progress / 100) * circumference;

              return (
                <div key={item.id} className="flex items-center justify-between p-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.status === 'uploading' && (
                      <svg className="w-5 h-5 shrink-0 -rotate-90">
                        <circle
                          stroke="var(--color-hairline)"
                          fill="transparent"
                          strokeWidth={stroke}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                        />
                        <circle
                          stroke="var(--color-primary)"
                          fill="transparent"
                          strokeWidth={stroke}
                          strokeDasharray={circumference + ' ' + circumference}
                          style={{ strokeDashoffset }}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                        />
                      </svg>
                    )}
                    {item.status === 'completed' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                        <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="w-5 h-5 rounded-full bg-hairline flex items-center justify-center shrink-0 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-mute"></span>
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-ink-mute">
                        {(item.size / 1024).toFixed(0)} KB • {item.status}
                      </p>
                    </div>
                  </div>
                  <span className="text-ink-mute font-semibold shrink-0 pl-2">
                    {item.progress}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesManager;
