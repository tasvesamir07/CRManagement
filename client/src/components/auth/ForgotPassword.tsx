import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Shield, Mail, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const OTP_EXPIRY_SECONDS = 900;

interface OtpTimerProps {
  expiresAt: number | null;
  onExpired: () => void;
}

const OtpTimer = ({ expiresAt, onExpired }: OtpTimerProps) => {
  const [remaining, setRemaining] = useState<number>(OTP_EXPIRY_SECONDS);
  const expiredRef = useRef<boolean>(false);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const diff = Math.max(0, Math.floor(((expiresAt ?? 0) - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const progress = remaining / OTP_EXPIRY_SECONDS;
  const offset = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-hairline" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none" stroke="currentColor" strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-linear ${remaining > 120 ? 'text-primary' : remaining > 30 ? 'text-amber-400' : 'text-rose-500'}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-mono font-bold ${remaining > 120 ? 'text-ink' : 'text-rose-500'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="text-xs text-ink-mute font-mono">OTP expires in</span>
    </div>
  );
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<string>('email');
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [, setOtpVerified] = useState<boolean>(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
    if (step === 'password' && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [step]);

  const handleSendOtp: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await authAPI.forgotPassword(email);
      setExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch {
      setExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      setStep('otp');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.verifyOtp(email, otp);
      setOtpVerified(true);
      setStep('password');
      toast.success('OTP verified successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
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

  const handleOtpExpired = () => {
    toast.error('OTP has expired. Please request a new one.');
    setStep('expired');
  };

  const handleRequestNewOtp = () => {
    setStep('email');
    setOtp('');
    setExpiresAt(null);
    setOtpVerified(false);
  };

  return (
    <div className="min-h-screen bg-canvas cyber-grid text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-[450px] h-[450px] bg-primary/20 rounded-full blur-[150px] pointer-events-none animate-float-slow"></div>
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-accent-violet/20 rounded-full blur-[160px] pointer-events-none animate-float-reverse"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up text-center">
        <Link to="/" className="inline-flex items-center gap-3 group mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary via-emerald-400 to-accent-cyan flex items-center justify-center text-on-primary font-extrabold text-xl shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            CR
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-ink">CR Dashboard</span>
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">
          {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Verify OTP' : 'Set New Password'}
        </h2>
        <p className="mt-2 text-sm text-ink-mute">
          {step === 'email' && "Enter your email address and we'll send you an OTP code."}
          {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
          {step === 'password' && 'Choose a new password for your account.'}
          {step === 'expired' && 'The OTP has expired.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl animate-slide-up">
          {step === 'email' ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="glass-input block w-full px-4 py-3 rounded-xl text-sm text-ink font-medium"
                  placeholder="you@university.edu"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5 mr-2" />
                )}
                Send Verification OTP
              </button>
            </form>
          ) : step === 'expired' ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mx-auto text-rose-500">
                <Shield className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-ink-mute">OTP has expired. Please request a new one.</p>
              <button
                type="button"
                onClick={handleRequestNewOtp}
                className="px-6 py-3 bg-gradient-to-r from-primary to-accent-cyan text-on-primary text-xs font-bold rounded-xl shadow-lg shadow-primary/25 hover:scale-105 transition-all cursor-pointer"
              >
                Request New OTP
              </button>
            </div>
          ) : step === 'otp' ? (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div className="flex justify-center">
                <OtpTimer expiresAt={expiresAt} onExpired={handleOtpExpired} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">OTP Code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  required
                  value={otp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="glass-input block w-full px-4 py-3.5 rounded-xl text-2xl text-ink font-mono font-bold text-center tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                Verify OTP
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleReset}>
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OTP Verified</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">New Password</label>
                  <PasswordInput
                    ref={passwordInputRef}
                    required
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">Confirm Password</label>
                  <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="w-5 h-5 mr-2" />
                )}
                Reset Password
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-hairline text-center">
          {step === 'email' || step === 'expired' ? (
            <Link to="/login" className="text-xs font-bold text-primary hover:underline">
              ← Return to Sign In
            </Link>
          ) : step === 'otp' ? (
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setExpiresAt(null); }}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              ← Back to Email Step
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setStep('otp'); setNewPassword(''); setConfirmPassword(''); }}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              ← Back to OTP Step
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

