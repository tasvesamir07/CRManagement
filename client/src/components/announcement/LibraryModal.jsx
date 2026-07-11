import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderClosed, Eye } from 'lucide-react';
import { filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function LibraryModal({ show, onClose, onAttach, uploadedFiles, onPreview }) {
  const [libFiles, setLibFiles] = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libPage, setLibPage] = useState(1);
  const [libSelectedIds, setLibSelectedIds] = useState([]);
  const [libCurrentFolderId, setLibCurrentFolderId] = useState(null);
  const [libCurrentFolderName, setLibCurrentFolderName] = useState('');
  const [libFolders, setLibFolders] = useState([]);

  const fetchLibFolders = useCallback(async () => {
    try {
      const folders = await filesAPI.listFolders();
      setLibFolders(folders);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load folders');
    }
  }, []);

  const fetchLibFiles = useCallback(async () => {
    setLibLoading(true);
    try {
      const res = await filesAPI.list({
        page: libPage,
        limit: 30,
        search: libSearch || undefined,
        folderId: libCurrentFolderId || undefined
      });
      setLibFiles(res.files || []);
    } catch {
      toast.error('Failed to load library files');
    } finally {
      setLibLoading(false);
    }
  }, [libPage, libSearch, libCurrentFolderId]);

  useEffect(() => {
    if (!show) return;
    fetchLibFiles();
  }, [show, fetchLibFiles]);

  useEffect(() => {
    if (show && libCurrentFolderId === null) {
      fetchLibFolders();
    }
  }, [show, libCurrentFolderId, fetchLibFolders]);

  const handleAttachFromLibrary = () => {
    const selectedFiles = libFiles.filter(f => libSelectedIds.includes(f.id));
    const newFiles = selectedFiles.filter(sf => !uploadedFiles.some(uf => uf.id === sf.id));
    onAttach(newFiles);
    setLibSelectedIds([]);
    toast.success(`${newFiles.length} file(s) attached!`);
  };

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-canvas border border-hairline rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-md font-semibold text-ink font-sans">Choose from Uploaded Files</h3>
          <button type="button" onClick={onClose} className="text-ink-mute hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-hairline">
          <input
            type="text"
            placeholder="Search uploaded files..."
            value={libSearch}
            onChange={(e) => { setLibSearch(e.target.value); setLibPage(1); }}
            className="w-full px-3 py-2 text-sm border border-hairline rounded-sm bg-canvas text-ink placeholder-ink-mute/60 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[250px] space-y-2">
          {libCurrentFolderId !== null && (
            <div className="flex items-center gap-1.5 text-xs text-ink-mute font-sans bg-canvas-soft border border-hairline rounded px-2.5 py-1 mb-2.5 w-fit">
              <button
                type="button"
                onClick={() => {
                  setLibCurrentFolderId(null);
                  setLibCurrentFolderName('');
                  setLibPage(1);
                }}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Root
              </button>
              <span>/</span>
              <span className="font-semibold text-ink">{libCurrentFolderName}</span>
            </div>
          )}

          {libCurrentFolderId === null && !libSearch && libFolders.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-[10px] font-semibold text-ink-mute uppercase tracking-wider font-sans">Folders</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {libFolders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setLibCurrentFolderId(folder.id);
                      setLibCurrentFolderName(folder.name);
                      setLibPage(1);
                    }}
                    className="flex items-center gap-2.5 p-2 bg-canvas border border-hairline hover:border-primary/40 hover:bg-canvas-soft rounded-sm cursor-pointer transition-all duration-150"
                  >
                    <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderClosed className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate block font-sans">{folder.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {libCurrentFolderId === null && !libSearch && libFolders.length > 0 && (
            <h4 className="text-[10px] font-semibold text-ink-mute uppercase tracking-wider font-sans mt-4 mb-2">Files</h4>
          )}

          {libLoading ? (
            <div className="flex justify-center items-center h-full py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : libFiles.length === 0 ? (
            <div className="text-center py-12 text-ink-mute text-sm">No files found.</div>
          ) : (
            <div className="space-y-2">
              {libFiles.map(file => {
                const isSelected = libSelectedIds.includes(file.id);
                const isAlreadyAttached = uploadedFiles.some(f => f.id === file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (isAlreadyAttached) return;
                      setLibSelectedIds(prev =>
                        prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                      );
                    }}
                    className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-colors ${
                      isAlreadyAttached
                        ? 'bg-canvas-soft border-hairline opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-hairline hover:bg-canvas-soft'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        disabled={isAlreadyAttached}
                        checked={isAlreadyAttached || isSelected}
                        onChange={() => {}}
                        className="accent-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{file.original_name}</p>
                        <p className="text-xs text-ink-mute">
                          {(file.file_size / 1024).toFixed(1)} KB &bull; {new Date(file.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onPreview(file)}
                        className="p-1.5 text-ink-mute hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-sm transition-colors cursor-pointer"
                        title="Quick Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isAlreadyAttached && (
                        <span className="text-[10px] font-bold text-ink-mute bg-hairline px-2 py-0.5 rounded-full shrink-0">Already Attached</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-hairline flex items-center justify-between bg-canvas-soft">
          <span className="text-xs text-ink-mute">{libSelectedIds.length} file(s) selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft cursor-pointer">Cancel</button>
            <button
              type="button"
              onClick={handleAttachFromLibrary}
              disabled={libSelectedIds.length === 0}
              className="px-4 py-2 rounded-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer disabled:opacity-50"
            >
              Attach Selected
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
