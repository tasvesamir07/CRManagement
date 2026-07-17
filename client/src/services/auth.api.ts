import api from './http-client';
import { OfflineCache } from './offline';

const cacheCoursesAndPlatforms = () => {
  Promise.all([
    api.get('/courses').then(r => OfflineCache.set('/courses', r.data)),
    api.get('/platforms').then(r => OfflineCache.set('/platforms', r.data))
  ]).catch(() => {});
};

export const authAPI = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data && !res.data.requiresTwoFactor) {
      cacheCoursesAndPlatforms();
    }
    return res.data;
  },
  login2FA: async (userId: string, token: string) => {
    const res = await api.post('/auth/login-2fa', { userId, token });
    if (res.data) {
      cacheCoursesAndPlatforms();
    }
    return res.data;
  },
  register: async (username: string, email: string, password: string, displayName: string) => {
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
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put('/auth/password', { currentPassword, newPassword });
    return res.data;
  },
  updateProfile: async (displayName: string) => {
    const res = await api.put('/auth/profile', { displayName });
    return res.data;
  },
  changeUsername: async (newUsername: string, password: string) => {
    const res = await api.put('/auth/username', { newUsername, password });
    return res.data;
  },
  changeEmail: async (newEmail: string, password: string) => {
    const res = await api.put('/auth/email', { newEmail, password });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  verifyOtp: async (email: string, otp: string) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    return res.data;
  },
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  },
  setup2FA: async () => {
    const res = await api.post('/auth/2fa/setup');
    return res.data;
  },
  enable2FA: async (token: string) => {
    const res = await api.post('/auth/2fa/enable', { token });
    return res.data;
  },
  disable2FA: async (password: string) => {
    const res = await api.post('/auth/2fa/disable', { password });
    return res.data;
  }
};
