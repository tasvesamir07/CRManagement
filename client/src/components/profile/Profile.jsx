import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { User, Save, KeyRound, Shield, Smartphone, Loader2 } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [changingUsername, setChangingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setNewEmail(user.email || '');
      setNewUsername(user.username || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(displayName);
      toast.success('Profile updated');
      user.display_name = displayName;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setChangingEmail(true);
    try {
      const data = await authAPI.changeEmail(newEmail, emailPassword);
      toast.success('Email changed');
      user.email = newEmail;
      setEmailPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change email');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    if (!newUsername || !usernamePassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setChangingUsername(true);
    try {
      const data = await authAPI.changeUsername(newUsername, usernamePassword);
      localStorage.setItem('cr_token', data.token);
      toast.success('Username changed');
      user.username = newUsername;
      setUsernamePassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change username');
    } finally {
      setChangingUsername(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSetup2FA = async () => {
    setSettingUp2FA(true);
    try {
      const data = await authAPI.setup2FA();
      setTwoFactorSecret(data.secret);
      setTwoFactorQrUrl(data.otpauth_url);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setSettingUp2FA(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFactorToken) {
      toast.error('Please enter the 2FA code from your authenticator app');
      return;
    }
    try {
      await authAPI.enable2FA(twoFactorToken);
      toast.success('2FA enabled successfully');
      setUser({ ...user, two_factor_enabled: true });
      setTwoFactorSecret('');
      setTwoFactorQrUrl('');
      setTwoFactorToken('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FAPassword) {
      toast.error('Please enter your password');
      return;
    }
    try {
      await authAPI.disable2FA(disable2FAPassword);
      toast.success('2FA disabled successfully');
      setUser({ ...user, two_factor_enabled: false, two_factor_secret: null });
      setDisable2FAPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disable 2FA');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-md tracking-tight font-sans text-ink">Profile Settings</h1>
        <p className="text-sm text-ink-mute mt-1.5">Manage your account details, security, and preferences.</p>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-hairline-cool pb-4">
          <div className="w-12 h-12 rounded-full bg-hairline-strong flex items-center justify-center">
            <User className="w-6 h-6 text-ink-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-ink">{user.display_name || user.username}</h2>
            <p className="text-sm text-ink-mute">{user.email} · {user.role}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink-mute bg-canvas-soft cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </button>
        </form>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-hairline-cool pb-4">
          <User className="w-5 h-5 text-ink-mute" />
          <h2 className="text-lg font-medium text-ink">Change Email</h2>
        </div>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">New Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Confirm Password</label>
            <PasswordInput
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter your password to confirm"
            />
          </div>
          <button
            type="submit"
            disabled={changingEmail}
            className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
          >
            {changingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Change Email
          </button>
        </form>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-hairline-cool pb-4">
          <KeyRound className="w-5 h-5 text-ink-mute" />
          <h2 className="text-lg font-medium text-ink">Change Username</h2>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">New Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Confirm Password</label>
            <PasswordInput
              value={usernamePassword}
              onChange={(e) => setUsernamePassword(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter your password to confirm"
            />
          </div>
          <button
            type="submit"
            disabled={changingUsername}
            className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
          >
            {changingUsername ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Change Username
          </button>
        </form>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-hairline-cool pb-4">
          <Shield className="w-5 h-5 text-ink-mute" />
          <h2 className="text-lg font-medium text-ink">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Current Password</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">New Password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Confirm Password</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Change Password
          </button>
        </form>
      </div>

      <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-hairline-cool pb-4">
          <Smartphone className="w-5 h-5 text-ink-mute" />
          <h2 className="text-lg font-medium text-ink">Two-Factor Authentication</h2>
        </div>

        {!twoFactorSecret && !user.two_factor_enabled && (
          <div>
            <p className="text-sm text-ink-mute mb-4">Add an extra layer of security to your account by enabling 2FA.</p>
            <button
              onClick={handleSetup2FA}
              disabled={settingUp2FA}
              className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
            >
              {settingUp2FA ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Set Up 2FA
            </button>
          </div>
        )}

        {twoFactorSecret && (
          <div className="space-y-4 bg-canvas-soft p-4 rounded-sm border border-hairline">
            <p className="text-sm font-medium text-ink">Scan this QR code with your authenticator app:</p>
            {twoFactorQrUrl && (
              <div className="bg-white p-4 inline-block rounded-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQrUrl)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            <div>
              <p className="text-xs text-ink-mute mb-1">Or enter this key manually:</p>
              <code className="text-sm bg-hairline px-2 py-1 rounded font-mono">{twoFactorSecret}</code>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">
                Enter the 6-digit code from your authenticator app
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  className="flex-1 px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
                <button
                  onClick={handleEnable2FA}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {user.two_factor_enabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">2FA is currently enabled</span>
            </div>
            <div className="flex gap-2">
            <PasswordInput
              value={disable2FAPassword}
              onChange={(e) => setDisable2FAPassword(e.target.value)}
              className="flex-1 px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary max-w-xs"
              placeholder="Enter password to disable"
            />
              <button
                onClick={handleDisable2FA}
                className="px-4 py-2 border border-accent-tomato/20 text-accent-tomato text-sm font-medium rounded-sm hover:bg-accent-tomato/5 transition-colors cursor-pointer"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
