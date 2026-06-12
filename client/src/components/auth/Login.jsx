import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { Shield, ArrowRight, Smartphone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordInput from '../ui/PasswordInput';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFactorUserId, setTwoFactorUserId] = useState(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [verifying2FA, setVerifying2FA] = useState(false);
    
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setErr('Please fill in all fields');
            return;
        }
        
        setSubmitting(true);
        setErr('');
        try {
            const data = await authAPI.login(username, password);
            if (data.requiresTwoFactor) {
                setRequires2FA(true);
                setTwoFactorUserId(data.userId);
            } else {
                localStorage.setItem('cr_token', data.token);
                setUser(data.user);
                toast.success(`Welcome back, ${data.user.display_name || data.user.username}!`);
                navigate('/dashboard');
            }
        } catch (error) {
            setErr(error.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        if (!twoFactorCode) {
            setErr('Please enter the 2FA code');
            return;
        }
        setVerifying2FA(true);
        setErr('');
        try {
            const data = await authAPI.login2FA(twoFactorUserId, twoFactorCode);
            localStorage.setItem('cr_token', data.token);
                setUser(data.user);
                toast.success('2FA verified successfully!');
                navigate('/dashboard');
        } catch (error) {
            setErr(error.response?.data?.error || 'Invalid 2FA code');
        } finally {
            setVerifying2FA(false);
        }
    };

    if (requires2FA) {
        return (
            <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex justify-center">
                        <div className="w-14 h-14 rounded-sm bg-accent-violet/15 flex items-center justify-center">
                            <Smartphone className="w-7 h-7 text-accent-violet" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-2xl font-semibold text-ink">Two-Factor Authentication</h2>
                    <p className="mt-2 text-center text-sm text-ink-mute">
                        Enter the 6-digit code from your authenticator app.
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-canvas py-8 px-4 border border-hairline rounded-lg sm:px-10 shadow-sm">
                        {err && (
                            <div className="mb-4 bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm">
                                {err}
                            </div>
                        )}
                        <form className="space-y-6" onSubmit={handle2FAVerify}>
                            <div>
                                <label className="block text-sm font-medium text-ink-secondary mb-2">
                                    Authentication Code
                                </label>
                                <input
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 border border-hairline rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xl text-ink text-center tracking-[0.5em] font-mono"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifying2FA}
                                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                            >
                                {verifying2FA ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Shield className="w-4 h-4 mr-2" />
                                )}
                                Verify & Sign In
                            </button>
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequires2FA(false);
                                        setTwoFactorUserId(null);
                                        setTwoFactorCode('');
                                        setErr('');
                                    }}
                                    className="text-sm text-ink-mute hover:text-ink transition-colors cursor-pointer"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center items-center gap-2">
                    <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-lg">
                        CR
                    </div>
                    <span className="text-xl font-semibold tracking-tight text-ink">CR Dashboard</span>
                </div>
                <h2 className="mt-6 text-center text-3xl font-medium tracking-tight text-ink font-sans">
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-ink-mute">
                    Sign in to manage your course announcements
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-canvas py-8 px-4 border border-hairline rounded-lg sm:px-10 shadow-sm">
                    {err && (
                        <div className="mb-4 bg-accent-tomato/10 border border-accent-tomato/20 text-accent-tomato text-sm p-3 rounded-sm">
                            {err}
                        </div>
                    )}
                    
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-ink-secondary">
                                Username
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="Enter your CR username"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-ink-secondary">
                                Password
                            </label>
                            <div className="mt-1">
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                            >
                                {submitting ? 'Signing in...' : 'Sign In'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <p className="text-sm text-ink-mute">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-ink hover:underline">
                                Register as a CR
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
