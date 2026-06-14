import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Shield, Mail, KeyRound, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const OTP_EXPIRY_SECONDS = 900;

const OtpTimer = ({ expiresAt, onExpired }) => {
  const [remaining, setRemaining] = useState(OTP_EXPIRY_SECONDS);
  const expiredRef = useRef(false);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
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
            className={`transition-all duration-1000 ease-linear ${remaining > 120 ? 'text-primary' : remaining > 30 ? 'text-accent-yellow' : 'text-accent-tomato'}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-mono font-medium ${remaining > 120 ? 'text-ink' : 'text-accent-tomato'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="text-xs text-ink-mute">OTP expires in</span>
    </div>
  );
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const otpInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
    if (step === 'password' && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [step]);

  const handleSendOtp = async (e) => {
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

  const handleVerifyOtp = async (e) => {
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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
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
    } catch (err) {
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
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-sm bg-ink flex items-center justify-center">
            <span className="text-primary font-bold text-xl">CR</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-semibold text-ink">
          {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Verify OTP' : 'Set New Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-ink-mute">
          {step === 'email' && "Enter your email address and we'll send you an OTP."}
          {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
          {step === 'password' && 'Choose a new password for your account.'}
          {step === 'expired' && 'The OTP has expired.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-canvas border border-hairline rounded-lg px-6 py-8 shadow-sm">
          {step === 'email' ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@university.edu"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send OTP
              </button>
            </form>
          ) : step === 'expired' ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent-tomato/10 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-accent-tomato" />
              </div>
              <p className="text-sm text-ink-mute">OTP has expired. Please request a new one.</p>
              <button
                type="button"
                onClick={handleRequestNewOtp}
                className="px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer"
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
                <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">OTP Code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-3 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center tracking-[0.5em] text-xl"
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Verify OTP
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OTP verified</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">New Password</label>
                  <PasswordInput
                    ref={passwordInputRef}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-hairline rounded-sm text-sm text-ink bg-canvas placeholder-ink-mute focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
          )}
        </div>

        <div className="mt-6 text-center">
          {step === 'email' || step === 'expired' ? (
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Back to Sign In
            </Link>
          ) : step === 'otp' ? (
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setExpiresAt(null); }}
              className="text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Back to Email
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setStep('otp'); setNewPassword(''); setConfirmPassword(''); }}
              className="text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Back to OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
