import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI } from '../../services/api';
import { Search, Download, Trash2, Upload, File, Image, FileText, FileArchive, ChevronLeft, ChevronRight, RefreshCw, Send } from 'lucide-react';
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
  const fileInputRef = useRef(null);

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
  }, [page, search]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await filesAPI.list({ page, limit: 50, search });
      setFiles(result.files);
      setPagination(result.pagination);
    } catch (e) {
      toast.error('Failed to load files');
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleUpload = async (e) => {
    const fileList = e.target.files;
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

    setUploading(true);
    let uploadedCount = 0;

    for (const file of Array.from(fileList)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB limit.`);
        continue;
      }

      try {
        setUploadProgress(0);
        const dupCheck = await filesAPI.checkDuplicate(file.name);
        let overwrite = false;
        if (dupCheck.duplicate) {
          if (!window.confirm(`A file named "${file.name}" already exists. Do you want to overwrite it?`)) {
            continue;
          }
          overwrite = true;
        }

        const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
        await uploadFn(file, (pe) => {
          setUploadProgress(Math.round((pe.loaded * 100) / pe.total));
        });
        uploadedCount++;
      } catch (err) {
        toast.error(`Upload failed for "${file.name}": ${err.response?.data?.error || err.message}`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Successfully uploaded ${uploadedCount} file(s)!`);
      fetchFiles();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      {uploading && (
        <div className="w-full bg-hairline rounded-full h-1.5 overflow-hidden animate-pulse">
          <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

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
                              className="p-1.5 text-ink-mute hover:text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors cursor-pointer"
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
                              className="p-1.5 text-ink-mute hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors cursor-pointer disabled:opacity-40"
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
    </div>
  );
};

export default FilesManager;
