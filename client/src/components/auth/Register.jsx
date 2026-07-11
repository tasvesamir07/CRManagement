import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [err, setErr] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
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
        } catch (error) {
            setErr(error.response?.data?.error || 'Registration failed. Try a different username/email.');
        } finally {
            setSubmitting(false);
        }
    };

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
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-ink-mute">
                    Register to start managing notices and routines
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
                                Username <span className="text-accent-tomato">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="cr_jack"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-ink-secondary">
                                Email address <span className="text-accent-tomato">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="jack@university.edu"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-ink-secondary">
                                Display Name (Optional)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="displayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="Jack (CR SWE)"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-ink-secondary">
                                Password <span className="text-accent-tomato">*</span>
                            </label>
                            <div className="mt-1">
                                <PasswordInput
                                    id="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                            >
                                {submitting ? 'Registering...' : 'Register'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-ink-mute">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-ink hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
