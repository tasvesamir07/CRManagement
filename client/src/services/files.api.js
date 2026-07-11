import api from './http-client';

export const filesAPI = {
  upload: async (fileObject, folderIdOrProgress, onUploadProgress, signal) => {
    let folderId = null;
    let progressCallback = onUploadProgress;
    if (typeof folderIdOrProgress === 'function') {
      progressCallback = folderIdOrProgress;
    } else {
      folderId = folderIdOrProgress;
    }
    const formData = new FormData();
    formData.append('file', fileObject);
    if (folderId) {
      formData.append('folderId', folderId);
    }
    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressCallback,
      signal: signal
    });
    return res.data;
  },
  uploadWithOverwrite: async (fileObject, folderIdOrProgress, onUploadProgress, signal) => {
    let folderId = null;
    let progressCallback = onUploadProgress;
    if (typeof folderIdOrProgress === 'function') {
      progressCallback = folderIdOrProgress;
    } else {
      folderId = folderIdOrProgress;
    }
    const formData = new FormData();
    formData.append('file', fileObject);
    if (folderId) {
      formData.append('folderId', folderId);
    }
    const res = await api.post('/files/upload?overwrite=true', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressCallback,
      signal: signal
    });
    return res.data;
  },
  getDownloadUrl: async (id) => {
    const res = await api.get(`/files/${id}`);
    return res.data;
  },
  getStorageUsage: async () => {
    const res = await api.get('/files/storage-usage');
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/files/${id}`);
    return res.data;
  },
  list: async (params = {}) => {
    const res = await api.get('/files', { params });
    return res.data;
  },
  checkDuplicate: async (filename, folderId = null) => {
    const res = await api.post('/files/check-duplicate', { filename, folderId });
    return res.data;
  },
  listFolders: async () => {
    const res = await api.get('/files/folders');
    return res.data;
  },
  createFolder: async (name, courseId = null) => {
    const res = await api.post('/files/folders', { name, courseId });
    return res.data;
  },
  deleteFolder: async (id, deleteFiles = false) => {
    const res = await api.delete(`/files/folders/${id}`, { params: { deleteFiles } });
    return res.data;
  },
  moveFiles: async (ids, folderId) => {
    const res = await api.post('/files/move', { ids, folderId });
    return res.data;
  },
  compressFiles: async (ids, archiveName = 'archive.zip', folderId = null) => {
    const res = await api.post('/files/compress', { ids, archiveName, folderId });
    return res.data;
  },
  extractZip: async (id, deleteOriginal = false, targetFolderId = null) => {
    const res = await api.post(`/files/extract/${id}`, { deleteOriginal, targetFolderId });
    return res.data;
  },
  updateExpiry: async (id, expiresAt) => {
    const res = await api.patch(`/files/${id}/expiry`, { expiresAt });
    return res.data;
  }
};
