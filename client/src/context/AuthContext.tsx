import { createContext, useState, useEffect, useContext, useCallback, type ReactNode } from 'react';
import { authAPI } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  role: string;
  two_factor_enabled?: boolean;
  [key: string]: any;
}

interface LoginData {
  token: string;
  user: User;
  requiresTwoFactor?: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<LoginData>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('cr_token');
            const cachedUserStr = localStorage.getItem('cr_user');

            if (token) {
                let expired = false;
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp && Date.now() >= payload.exp * 1000) {
                        expired = true;
                    }
                } catch {
                    expired = true;
                }

                if (expired) {
                    localStorage.removeItem('cr_token');
                    localStorage.removeItem('cr_user');
                    setUser(null);
                    setLoading(false);
                    return;
                }

                if (cachedUserStr) {
                    try {
                        setUser(JSON.parse(cachedUserStr));
                    } catch { /* ignore */ }
                }

                setLoading(false);

                if (navigator.onLine === false && cachedUserStr) {
                    return;
                }

                try {
                    const data = await authAPI.me();
                    setUser(data.user);
                    localStorage.setItem('cr_user', JSON.stringify(data.user));
                } catch (err: any) {
                    console.error('Session restore failed:', err.message);
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        localStorage.removeItem('cr_token');
                        localStorage.removeItem('cr_user');
                        setUser(null);
                    }
                }
            } else {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (username: string, password: string): Promise<LoginData> => {
        setLoading(true);
        setError(null);
        try {
            const data: LoginData = await authAPI.login(username, password);
            if (data.requiresTwoFactor) {
                setLoading(false);
                return data;
            }
            localStorage.setItem('cr_token', data.token);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return data;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Login failed');
            setLoading(false);
            throw err;
        }
    };

    const register = async (username: string, email: string, password: string, displayName: string): Promise<User> => {
        setLoading(true);
        setError(null);
        try {
            const data = await authAPI.register(username, email, password, displayName);
            localStorage.setItem('cr_token', data.token);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return data.user;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Registration failed');
            setLoading(false);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('cr_token');
        localStorage.removeItem('cr_user');
        setUser(null);
    };

    const refreshUser = useCallback(async () => {
        try {
            const data = await authAPI.me();
            setUser(data.user);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
        } catch (err: any) {
            console.error('Failed to refresh user:', err.message);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
