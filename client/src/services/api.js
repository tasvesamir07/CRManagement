import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/+$/, '') + '/api';
}

const api = axios.create({
    baseURL: API_URL
});

// Request interceptor to add Authorization token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('cr_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        return res.data;
    },
    login2FA: async (userId, token) => {
        const res = await api.post('/auth/login-2fa', { userId, token });
        return res.data;
    },
    register: async (username, email, password, displayName) => {
        const res = await api.post('/auth/register', { username, email, password, displayName });
        return res.data;
    },
    me: async () => {
        const res = await api.get('/auth/me');
        return res.data;
    },
    changePassword: async (currentPassword, newPassword) => {
        const res = await api.put('/auth/password', { currentPassword, newPassword });
        return res.data;
    },
    updateProfile: async (displayName) => {
        const res = await api.put('/auth/profile', { displayName });
        return res.data;
    },
    changeUsername: async (newUsername, password) => {
        const res = await api.put('/auth/username', { newUsername, password });
        return res.data;
    },
    changeEmail: async (newEmail, password) => {
        const res = await api.put('/auth/email', { newEmail, password });
        return res.data;
    },
    forgotPassword: async (email) => {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
    },
    verifyOtp: async (email, otp) => {
        const res = await api.post('/auth/verify-otp', { email, otp });
        return res.data;
    },
    resetPassword: async (email, otp, newPassword) => {
        const res = await api.post('/auth/reset-password', { email, otp, newPassword });
        return res.data;
    },
    setup2FA: async () => {
        const res = await api.post('/auth/2fa/setup');
        return res.data;
    },
    enable2FA: async (token) => {
        const res = await api.post('/auth/2fa/enable', { token });
        return res.data;
    },
    disable2FA: async (password) => {
        const res = await api.post('/auth/2fa/disable', { password });
        return res.data;
    }
};

export const adminAPI = {
    listUsers: async () => {
        const res = await api.get('/admin/users');
        return res.data;
    },
    createUser: async (userData) => {
        const res = await api.post('/admin/users', userData);
        return res.data;
    },
    updateUser: async (id, userData) => {
        const res = await api.put(`/admin/users/${id}`, userData);
        return res.data;
    },
    deleteUser: async (id) => {
        const res = await api.delete(`/admin/users/${id}`);
        return res.data;
    }
};

export const coursesAPI = {
    list: async () => {
        const res = await api.get('/courses');
        return res.data;
    },
    get: async (id) => {
        const res = await api.get(`/courses/${id}`);
        return res.data;
    },
    create: async (courseData) => {
        const res = await api.post('/courses', courseData);
        return res.data;
    },
    update: async (id, courseData) => {
        const res = await api.put(`/courses/${id}`, courseData);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/courses/${id}`);
        return res.data;
    },
    getMembers: async (courseId) => {
        const res = await api.get(`/courses/${courseId}/members`);
        return res.data;
    },
    assignMember: async (courseId, userId, role = 'cr') => {
        const res = await api.post(`/courses/${courseId}/members`, { userId, role });
        return res.data;
    },
    removeMember: async (courseId, userId) => {
        const res = await api.delete(`/courses/${courseId}/members/${userId}`);
        return res.data;
    },
    setDefaultPlatforms: async (courseId, platformIds) => {
        const res = await api.put(`/courses/${courseId}/default-platforms`, { platform_ids: platformIds });
        return res.data;
    }
};

export const routinesAPI = {
    list: async (courseId = '') => {
        const res = await api.get('/routines', { params: { course_id: courseId } });
        return res.data;
    },
    create: async (routineData) => {
        const res = await api.post('/routines', routineData);
        return res.data;
    },
    update: async (id, routineData) => {
        const res = await api.put(`/routines/${id}`, routineData);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/routines/${id}`);
        return res.data;
    }
};

export const platformsAPI = {
    list: async (courseId) => {
        const params = courseId ? { course_id: courseId } : {};
        const res = await api.get('/platforms', { params });
        return res.data;
    },
    create: async (platformData) => {
        const res = await api.post('/platforms', platformData);
        return res.data;
    },
    update: async (id, platformData) => {
        const res = await api.put(`/platforms/${id}`, platformData);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/platforms/${id}`);
        return res.data;
    },
    getWhatsAppStatus: async () => {
        const res = await api.get('/platforms/whatsapp/status');
        return res.data;
    },
    getTelegramStatus: async () => {
        const res = await api.get('/platforms/telegram/status');
        return res.data;
    },
    getMessengerStatus: async () => {
        const res = await api.get('/platforms/messenger/status');
        return res.data;
    },
    getWhatsAppGroups: async () => {
        const res = await api.get('/platforms/whatsapp/groups');
        return res.data;
    },
    restartWhatsApp: async () => {
        const res = await api.post('/platforms/whatsapp/restart');
        return res.data;
    },
    clearWhatsAppSession: async () => {
        const res = await api.post('/platforms/whatsapp/clear-session');
        return res.data;
    },
    pairWhatsApp: async (phoneNumber) => {
        const res = await api.post('/platforms/whatsapp/pair', { phoneNumber });
        return res.data;
    },
    saveMessengerAppState: async (appstate) => {
        const res = await api.post('/platforms/messenger/appstate', { appstate });
        return res.data;
    }
};

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
            headers: {
                'Content-Type': 'multipart/form-data'
            },
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
            headers: {
                'Content-Type': 'multipart/form-data'
            },
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

export const announcementsAPI = {
    list: async (params = {}) => {
        const res = await api.get('/announcements', { params });
        return res.data;
    },
    get: async (id) => {
        const res = await api.get(`/announcements/${id}`);
        return res.data;
    },
    create: async (announcementData) => {
        const res = await api.post('/announcements', announcementData);
        return res.data;
    },
    update: async (id, announcementData) => {
        const res = await api.put(`/announcements/${id}`, announcementData);
        return res.data;
    },
    send: async (id, data = { confirmed: true }) => {
        const res = await api.post(`/announcements/${id}/send`, data);
        return res.data;
    },
    schedule: async (id, scheduledAt) => {
        const res = await api.post(`/announcements/${id}/schedule`, { scheduled_at: scheduledAt });
        return res.data;
    },
    draftAI: async (prompt, category = null) => {
        const res = await api.post('/announcements/draft-ai', { prompt, category });
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/announcements/${id}`);
        return res.data;
    }
};

export const templatesAPI = {
    list: async () => {
        const res = await api.get('/templates');
        return res.data;
    },
    get: async (id) => {
        const res = await api.get(`/templates/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await api.post('/templates', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await api.put(`/templates/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/templates/${id}`);
        return res.data;
    }
};

export const bulkAPI = {
    deleteCourses: async (ids) => {
        const res = await api.post('/bulk/courses/delete', { ids });
        return res.data;
    },
    deletePlatforms: async (ids) => {
        const res = await api.post('/bulk/platforms/delete', { ids });
        return res.data;
    },
    deleteAnnouncements: async (ids) => {
        const res = await api.post('/bulk/announcements/delete', { ids });
        return res.data;
    },
    deleteFiles: async (ids) => {
        const res = await api.post('/bulk/files/delete', { ids });
        return res.data;
    },
    testConnections: async () => {
        const res = await api.post('/bulk/platforms/test-connections');
        return res.data;
    },
    batchCreateRoutines: async (course_id, days) => {
        const res = await api.post('/bulk/routines/batch', { course_id, days });
        return res.data;
    }
};

export const adminAPI_ext = {
    getAuditLogs: async (params = {}) => {
        const res = await api.get('/admin/audit-logs', { params });
        return res.data;
    }
};

export const logsAPI = {
    list: async (params = {}) => {
        const res = await api.get('/logs', { params });
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/logs/${id}`);
        return res.data;
    },
    clear: async () => {
        const res = await api.delete('/logs');
        return res.data;
    }
};

export default api;
