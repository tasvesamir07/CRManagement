import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { KeyRound, Loader2 } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.resetPassword(email, otp, newPassword);
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-sm bg-ink flex items-center justify-center">
            <span className="text-primary font-bold text-xl">CR</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-semibold text-ink">Reset Password</h2>
        <p className="mt-2 text-center text-sm text-ink-mute">
          Enter the OTP sent to your email along with your new password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-canvas border border-hairline rounded-lg px-6 py-8 shadow-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">OTP Code</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">New Password</label>
                <PasswordInput
                  required
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Confirm Password</label>
                <PasswordInput
                  required
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Reset Password
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
