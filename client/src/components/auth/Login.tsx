import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { Shield, ArrowRight, Smartphone, Loader2, Sparkles, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordInput from '../ui/PasswordInput';

const Login = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [err, setErr] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const [requires2FA, setRequires2FA] = useState<boolean>(false);
    const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState<string>('');
    const [verifying2FA, setVerifying2FA] = useState<boolean>(false);

    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
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
                console.log('[LOGIN] response data:', { hasToken: !!data.token, hasUser: !!data.user, keys: Object.keys(data) });
                localStorage.setItem('cr_token', data.token);
                localStorage.setItem('cr_user', JSON.stringify(data.user));
                setUser(data.user);
                toast.success(`Welcome back, ${data.user.display_name || data.user.username}!`);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Login failed:', err.response?.data || err.message);
            setErr(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handle2FAVerify: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        if (!twoFactorCode) {
            setErr('Please enter the 2FA code');
            return;
        }
        setVerifying2FA(true);
        setErr('');
        try {
            const data = await authAPI.login2FA(twoFactorUserId!, twoFactorCode);
            localStorage.setItem('cr_token', data.token);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
            setUser(data.user);
            toast.success('2FA verified successfully!');
            navigate('/dashboard');
        } catch (err: any) {
            setErr(err.response?.data?.error || 'Invalid 2FA code');
        } finally {
            setVerifying2FA(false);
        }
    };

    if (requires2FA) {
        return (
            <div className="min-h-screen bg-canvas cyber-grid text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[140px] pointer-events-none animate-float-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-violet/20 rounded-full blur-[140px] pointer-events-none animate-float-reverse"></div>

                <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-violet to-accent-indigo flex items-center justify-center shadow-xl shadow-accent-violet/30 text-white">
                            <Smartphone className="w-7 h-7" />
                        </div>
                    </div>
                    <h2 className="text-center text-3xl font-extrabold text-ink tracking-tight">Two-Factor Authentication</h2>
                    <p className="mt-2 text-center text-sm text-ink-mute">
                        Enter the 6-digit verification code from your authenticator app.
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                    <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl animate-slide-up">
                        {err && (
                            <div className="mb-4 bg-accent-tomato/15 border border-accent-tomato/30 text-accent-tomato text-sm p-3.5 rounded-xl font-medium">
                                {err}
                            </div>
                        )}
                        <form className="space-y-6" onSubmit={handle2FAVerify}>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">
                                    Authentication Code
                                </label>
                                <input
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTwoFactorCode(e.target.value)}
                                    className="glass-input block w-full px-4 py-3.5 rounded-xl text-2xl text-ink text-center tracking-[0.5em] font-mono font-bold"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifying2FA}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
                            >
                                {verifying2FA ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Shield className="w-5 h-5 mr-2" />
                                )}
                                Verify & Access Dashboard
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
                                    className="text-xs font-semibold text-ink-mute hover:text-primary transition-colors cursor-pointer"
                                >
                                    ← Return to Sign In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

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
                    Welcome Back
                </h2>
                <p className="mt-2 text-sm text-ink-mute">
                    Sign in to access your futuristic announcement console
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl animate-slide-up">
                    {err && (
                        <div className="mb-4 bg-accent-tomato/15 border border-accent-tomato/30 text-accent-tomato text-sm p-3.5 rounded-xl font-medium">
                            {err}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        <div>
                            <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="glass-input block w-full px-4 py-3 rounded-xl text-sm text-ink font-medium"
                                placeholder="Enter your CR username"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="glass-input block w-full px-4 py-3 rounded-xl text-sm text-ink font-medium"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-hairline text-center">
                        <p className="text-sm text-ink-mute font-medium">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-bold text-primary hover:underline">
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

