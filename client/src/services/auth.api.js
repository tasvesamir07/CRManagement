import api from './http-client';
import { OfflineCache } from './offline';

const cacheCoursesAndPlatforms = () => {
  Promise.all([
    api.get('/courses').then(r => OfflineCache.set('/courses', r.data)),
    api.get('/platforms').then(r => OfflineCache.set('/platforms', r.data))
  ]).catch(() => {});
};

export const authAPI = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data && !res.data.requiresTwoFactor) {
      cacheCoursesAndPlatforms();
    }
    return res.data;
  },
  login2FA: async (userId, token) => {
    const res = await api.post('/auth/login-2fa', { userId, token });
    if (res.data) {
      cacheCoursesAndPlatforms();
    }
    return res.data;
  },
  register: async (username, email, password, displayName) => {
    const res = await api.post('/auth/register', { username, email, password, displayName });
    if (res.data) {
      cacheCoursesAndPlatforms();
    }
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
