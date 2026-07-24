import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Loader2 } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const Register = () => {
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [err, setErr] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        if (!username || !email || !password) {
            setErr('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        setErr('');
        try {
            await register(username, email, password, displayName);
            navigate('/dashboard');
        } catch (err: any) {
            setErr(err.response?.data?.error || 'Registration failed. Try a different username/email.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas cyber-grid text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-primary/20 rounded-full blur-[150px] pointer-events-none animate-float-slow"></div>
            <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-accent-violet/20 rounded-full blur-[160px] pointer-events-none animate-float-reverse"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up text-center">
                <Link to="/" className="inline-flex items-center gap-3 group mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary via-emerald-400 to-accent-cyan flex items-center justify-center text-on-primary font-extrabold text-xl shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                        CR
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-ink">CR Dashboard</span>
                </Link>
                <h2 className="text-3xl font-extrabold tracking-tight text-ink">
                    Create CR Account
                </h2>
                <p className="mt-2 text-sm text-ink-mute">
                    Register to manage class announcements & routines
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl animate-slide-up">
                    {err && (
                        <div className="mb-4 bg-accent-tomato/15 border border-accent-tomato/30 text-accent-tomato text-sm p-3.5 rounded-xl font-medium">
                            {err}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                                Username <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                                placeholder="cr_alex"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                                Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                                placeholder="alex@university.edu"
                            />
                        </div>

                        <div>
                            <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                                Display Name <span className="text-ink-mute text-[10px] font-normal">(Optional)</span>
                            </label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                                className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                                placeholder="Alex (CR CSE Batch 28)"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                                Password <span className="text-rose-500">*</span>
                            </label>
                            <PasswordInput
                                id="password"
                                required
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="glass-input block w-full px-4 py-2.5 rounded-xl text-sm text-ink font-medium"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-on-primary bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-50 transition-all duration-150 cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Register Now
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-hairline text-center">
                        <p className="text-sm text-ink-mute font-medium">
                            Already registered?{' '}
                            <Link to="/login" className="font-bold text-primary hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

