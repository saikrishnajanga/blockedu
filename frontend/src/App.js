import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

// Auth Provider Component
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return user;
    };

    const walletLogin = async (walletAddress) => {
        const response = await api.post('/auth/wallet-login', { walletAddress });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return user;
    };

    const register = async (data) => {
        const response = await api.post('/auth/register', data);
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, walletLogin, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

// Protected Route Component
function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

    return children;
}

// Loading Spinner Component
function LoadingSpinner() {
    return (
        <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );
}

// Sidebar Component
function Sidebar({ isOpen, onToggle }) {
    const { user, logout } = useAuth();
    const location = window.location.pathname;

    const isActive = (path) => location === path || location.startsWith(path + '/');

    // Student links - includes all features
    const studentLinks = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/analytics', icon: '📈', label: 'Analytics' },
        { path: '/notifications', icon: '🔔', label: 'Notifications' },
        { path: '/schedule', icon: '🗓️', label: 'Schedule' },
        { path: '/assignments', icon: '📝', label: 'Assignments' },
        { path: '/results', icon: '📊', label: 'Results' },
        { path: '/attendance', icon: '📅', label: 'Attendance' },
        { path: '/papers', icon: '📚', label: 'Papers' },
        { path: '/events', icon: '📢', label: 'Events' },
        { path: '/grievances', icon: '💬', label: 'Grievances' },
        { path: '/certificates', icon: '🏆', label: 'Certificates' },
        { path: '/idcard', icon: '📱', label: 'ID Card' },
        { path: '/payments', icon: '💳', label: 'Pay Fees' },
        { path: '/settings', icon: '⚙️', label: 'Settings' },
    ];

    // Admin links - includes student management, NO system admin
    const adminLinks = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/admin', icon: '👥', label: 'Students & Records' },
        { path: '/admin/analytics', icon: '📊', label: 'Analytics' },
        { path: '/admin/certificates', icon: '🎓', label: 'Certificates' },
        { path: '/admin/workflows', icon: '📋', label: 'Workflows' },
        { path: '/settings', icon: '🔧', label: 'Settings' },
    ];

    // Institution links
    const institutionLinks = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/admin', icon: '👥', label: 'Students & Records' },
        { path: '/settings', icon: '⚙️', label: 'Settings' },
    ];

    const getLinks = () => {
        if (!user) return [];
        if (user.role === 'admin') return adminLinks;
        if (user.role === 'institution') return institutionLinks;
        return studentLinks;
    };

    const links = getLinks();

    // Don't show sidebar on landing/student portal pages when not logged in
    if (!user && (location === '/' || location === '/student' || location === '/verify')) {
        return null;
    }

    return (
        <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
            <div className="sidebar-header">
                <span className="logo-icon">🔗</span>
                <h2 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BlockEdu</h2>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <Link key={link.path} to={link.path} className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}>
                        <span className="nav-icon">{link.icon}</span>
                        <span className="nav-text">{link.label}</span>
                    </Link>
                ))}
            </nav>

            {user && (
                <div className="sidebar-section">
                    <div className="sidebar-link" style={{ cursor: 'default' }}>
                        <span className="nav-icon">👤</span>
                        <span className="nav-text">{user.name}</span>
                    </div>
                    <button onClick={logout} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                        <span className="nav-icon">🚪</span>
                        <span className="nav-text">Logout</span>
                    </button>
                </div>
            )}
        </aside>
    );
}

// Top Bar Component
function TopBar({ onToggleSidebar, sidebarOpen }) {
    const { user, logout } = useAuth();
    const [walletAddress, setWalletAddress] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setWalletAddress(accounts[0]);
            } catch (error) {
                console.error('Wallet connection failed:', error);
            }
        } else {
            alert('Please install MetaMask to use wallet features!');
        }
    };

    return (
        <div className="top-bar">
            <button className="toggle-btn" onClick={onToggleSidebar}>
                {sidebarOpen ? '◀' : '☰'}
            </button>

            <div className="navbar-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Language Selector */}
                <select
                    className="form-control"
                    style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    onChange={(e) => {
                        localStorage.setItem('language', e.target.value);
                        window.location.reload();
                    }}
                    defaultValue={localStorage.getItem('language') || 'en'}
                >
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 हिंदी</option>
                    <option value="te">🇮🇳 తెలుగు</option>
                    <option value="ta">🇮🇳 தமிழ்</option>
                </select>

                {/* Dark Mode Toggle */}
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                        const newTheme = theme === 'dark' ? 'light' : 'dark';
                        document.documentElement.setAttribute('data-theme', newTheme);
                        localStorage.setItem('theme', newTheme);
                        setTheme(newTheme);
                    }}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '1.2rem' }}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {walletAddress ? (
                    <div className="wallet-address">
                        <span className="dot"></span>
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                ) : (
                    <button onClick={connectWallet} className="btn btn-secondary btn-sm">
                        🦊 Connect Wallet
                    </button>
                )}

                {/* Logout Button for Students */}
                {user && user.role === 'student' && (
                    <button
                        onClick={logout}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.4rem 0.8rem' }}
                        title="Logout"
                    >
                        🚪 Logout
                    </button>
                )}
            </div>
        </div>
    );
}

// Navbar Component (kept for backwards compatibility, now minimal)
function Navbar() {
    return null; // Navbar replaced by Sidebar + TopBar
}

// Home Page Component - Role Selection Landing
function HomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const roles = [
        { id: 'student', icon: '🎓', title: 'Student', desc: 'Register, login and pay fees', color: '#667eea', path: '/student' },
        { id: 'admin', icon: '👨‍💼', title: 'Admin', desc: 'Manage students and records', color: '#f59e0b', path: '/login?role=admin' }
    ];

    if (user) {
        navigate('/dashboard');
        return null;
    }

    return (
        <div className="role-selection-page">
            <div className="role-hero">
                <div className="logo-large">🔗</div>
                <h1>Welcome to BlockEdu</h1>
                <p>Secure Blockchain-Based Student Records Management</p>
            </div>
            <div className="role-cards">
                {roles.map((role) => (
                    <div key={role.id} className="role-card" onClick={() => navigate(role.path)} style={{ '--accent': role.color }}>
                        <div className="role-icon">{role.icon}</div>
                        <h3>{role.title}</h3>
                        <p>{role.desc}</p>
                        <button className="btn btn-primary">Continue →</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Student Portal Page - Register/Login/Pay
function StudentPortalPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('login');

    if (user && user.role === 'student') {
        navigate('/dashboard');
        return null;
    }

    return (
        <div className="student-portal">
            <div className="portal-header">
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button>
                <h1>🎓 Student Portal</h1>
            </div>
            <div className="portal-tabs">
                <button className={`tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Login</button>
                <button className={`tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</button>
            </div>
            <div className="portal-content">
                {activeTab === 'login' ? <StudentLoginForm /> : <StudentRegisterForm />}
            </div>
        </div>
    );
}

// Student Login Form
function StudentLoginForm() {
    const { login, walletLogin } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleMetaMaskLogin = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to use wallet login!');
            return;
        }
        setWalletLoading(true);
        setError('');
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const walletAddress = accounts[0];
            await walletLogin(walletAddress);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'MetaMask login failed');
        } finally {
            setWalletLoading(false);
        }
    };

    return (
        <div className="auth-form">
            {error && <div className="alert alert-error">{error}</div>}

            <button type="button" onClick={handleMetaMaskLogin} disabled={walletLoading} className="btn btn-metamask" style={{ width: '100%', marginBottom: '1.5rem' }}>
                {walletLoading ? 'Connecting...' : '🦊 Sign in with MetaMask'}
            </button>

            <div className="divider"><span>or use email</span></div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

// Student Register Form (inline version)
function StudentRegisterForm() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', studentId: '', department: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.post('/student/self-register', formData);
            localStorage.setItem('token', response.data.token);
            setMessage({ type: 'success', text: 'Registration successful! You can now login.' });
            setFormData({ name: '', email: '', password: '', studentId: '', department: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Student ID</label>
                    <input type="text" className="form-control" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" className="form-control" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
            </div>
            <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Registering...' : 'Register'}
            </button>
        </form>
    );
}

// Login Page Component
function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, walletLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleWalletLogin = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask!');
            return;
        }
        setLoading(true);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            await walletLogin(accounts[0]);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Wallet login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container flex-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-2">
                    <h2>Welcome Back</h2>
                    <p className="text-muted">Sign in to access your records</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@university.edu"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center mt-2">
                    <p className="text-muted">or continue with</p>
                    <button onClick={handleWalletLogin} className="btn btn-secondary" style={{ width: '100%' }} disabled={loading}>
                        🦊 Connect with MetaMask
                    </button>
                </div>

                <div className="text-center mt-2">
                    <p className="text-muted">
                        Demo: admin@university.edu / admin123
                    </p>
                </div>
            </div>
        </div>
    );
}

// Dashboard Page Component
function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Welcome, {user?.name}!</h1>
                <p className="text-muted">Role: {user?.role?.toUpperCase()}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats?.totalStudents || 0}</div>
                    <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-value">{stats?.totalRecords || 0}</div>
                    <div className="stat-label">Total Records</div>
                </div>
                <div className="stat-card info">
                    <div className="stat-value">{stats?.totalTransactions || 0}</div>
                    <div className="stat-label">Blockchain Transactions</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-value">{stats?.totalInstitutions || 0}</div>
                    <div className="stat-label">Institutions</div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Recent Transactions</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Transaction Hash</th>
                                <th>Action</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentTransactions?.length > 0 ? (
                                stats.recentTransactions.map((tx, idx) => (
                                    <tr key={idx}>
                                        <td><code className="hash-display">{tx.txHash}</code></td>
                                        <td><span className="badge badge-info">{tx.action}</span></td>
                                        <td>{new Date(tx.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="text-center text-muted">No transactions yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {(user?.role === 'admin' || user?.role === 'institution') && (
                <div className="grid-2">
                    <StudentForm onSuccess={fetchStats} />
                    <RecordForm onSuccess={fetchStats} />
                </div>
            )}
        </div>
    );
}

// Student Registration Form
function StudentForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        email: '',
        course: '',
        department: '',
        enrollmentYear: new Date().getFullYear(),
        walletAddress: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.post('/student/register', formData);
            setMessage({ type: 'success', text: 'Student registered successfully!' });
            setFormData({ studentId: '', name: '', email: '', course: '', department: '', enrollmentYear: new Date().getFullYear(), walletAddress: '' });
            if (onSuccess) onSuccess();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Register New Student</h3>
            </div>
            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Student ID</label>
                        <input type="text" className="form-control" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Course</label>
                        <input type="text" className="form-control" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department</label>
                        <input type="text" className="form-control" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Wallet Address (Optional)</label>
                    <input type="text" className="form-control" value={formData.walletAddress} onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })} placeholder="0x..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Student'}
                </button>
            </form>
        </div>
    );
}

// Record Upload Form
function RecordForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        studentId: '',
        type: 'transcript',
        title: '',
        data: {}
    });
    const [pdfFile, setPdfFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setMessage({ type: 'error', text: 'Please upload a PDF file only' });
                setPdfFile(null);
                e.target.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setMessage({ type: 'error', text: 'File size must be less than 10MB' });
                setPdfFile(null);
                e.target.value = '';
                return;
            }
            setPdfFile(file);
            setMessage({ type: '', text: '' });
        }
    };

    const handleRemoveFile = () => {
        setPdfFile(null);
        const fileInput = document.getElementById('pdf-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        setResult(null);
        try {
            // Create form data for file upload
            const submitData = {
                ...formData,
                pdfFileName: pdfFile?.name || null,
                pdfSize: pdfFile?.size || null
            };
            const response = await api.post('/student/uploadRecord', submitData);
            setMessage({ type: 'success', text: 'Record uploaded to blockchain!' });
            setResult(response.data);
            setFormData({ studentId: '', type: 'transcript', title: '', data: {} });
            setPdfFile(null);
            const fileInput = document.getElementById('pdf-upload');
            if (fileInput) fileInput.value = '';
            if (onSuccess) onSuccess();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Upload failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">📄 Upload Record to Blockchain</h3>
            </div>
            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}
            {result && (
                <div className="alert alert-info">
                    <div>
                        <strong>Transaction Hash:</strong><br />
                        <code className="hash-display">{result.blockchain?.txHash}</code>
                    </div>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Student ID</label>
                    <input type="text" className="form-control" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} placeholder="e.g., STU2024001" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Record Type</label>
                    <select className="form-control" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                        <option value="transcript">Transcript</option>
                        <option value="certificate">Certificate</option>
                        <option value="marksheet">Mark Sheet</option>
                        <option value="degree">Degree</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Title</label>
                    <input type="text" className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Semester 1 Transcript" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Upload PDF Document</label>
                    <input
                        type="file"
                        id="pdf-upload"
                        className="form-control"
                        accept=".pdf,application/pdf"
                        onChange={handleFileChange}
                        style={{ padding: '0.5rem' }}
                    />
                    <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                        Accepted format: PDF only (Max 10MB)
                    </small>
                    {pdfFile && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <span>📎 {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                            <button type="button" className="btn btn-sm btn-error" onClick={handleRemoveFile}>✕ Remove</button>
                        </div>
                    )}
                </div>
                <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Uploading...' : '🔗 Upload to Blockchain'}
                </button>
            </form>
        </div>
    );
}

// Verification Page Component
function VerifyPage() {
    const [studentId, setStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await api.get(`/student/verify/${studentId}`);
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">
            <div className="text-center mb-2">
                <h1>Verify Student Records</h1>
                <p className="text-muted">Enter a student ID to verify their records on the blockchain</p>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleVerify}>
                    <div className="form-group">
                        <label className="form-label">Student ID</label>
                        <input
                            type="text"
                            className="form-control"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="Enter Student ID (e.g., STU2024001)"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Verifying...' : '🔍 Verify Records'}
                    </button>
                </form>

                <div className="text-center mt-1">
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Demo: Try "STU2024001"</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
                    <div className="card">
                        <div className="flex-between mb-2">
                            <h3>Verification Result</h3>
                            <div className={`verification-badge ${result.verified ? 'verified' : 'unverified'}`}>
                                {result.verified ? '✓ Verified' : '✗ Not Verified'}
                            </div>
                        </div>

                        <div className="alert alert-info">
                            {result.message}
                        </div>

                        <h4 className="mb-1">Student Information</h4>
                        <div className="grid-2 mb-2">
                            <div><strong>Name:</strong> {result.student?.name}</div>
                            <div><strong>Student ID:</strong> {result.student?.studentId}</div>
                            <div><strong>Course:</strong> {result.student?.course}</div>
                            <div><strong>Department:</strong> {result.student?.department}</div>
                            <div><strong>Enrollment Year:</strong> {result.student?.enrollmentYear}</div>
                            <div><strong>Institution:</strong> {result.student?.institution}</div>
                        </div>

                        <h4 className="mb-1">Records ({result.records?.length || 0})</h4>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Blockchain TX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.records?.map((record, idx) => (
                                        <tr key={idx}>
                                            <td>{record.title}</td>
                                            <td><span className="badge badge-info">{record.type}</span></td>
                                            <td>
                                                {record.verified ? (
                                                    <span className="badge badge-success">✓ Verified</span>
                                                ) : (
                                                    <span className="badge badge-error">⚠ Tampered</span>
                                                )}
                                            </td>
                                            <td><code className="hash-display">{record.blockchainTxHash?.slice(0, 20)}...</code></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Admin Page Component
function AdminPage() {
    const [students, setStudents] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('students');
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    // Excel upload states
    const [excelData, setExcelData] = useState([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, txRes] = await Promise.all([
                api.get('/students'),
                api.get('/blockchain/transactions')
            ]);
            setStudents(studentsRes.data.students || []);
            setTransactions(txRes.data.transactions || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyStudent = async (e) => {
        e.preventDefault();
        if (!verifyId.trim()) return;
        setVerifyLoading(true);
        setVerifyError('');
        setVerifyResult(null);
        try {
            const response = await api.get(`/student/verify/${verifyId}`);
            setVerifyResult(response.data);
        } catch (error) {
            setVerifyError(error.response?.data?.error || 'Student not found');
        } finally {
            setVerifyLoading(false);
        }
    };

    // Handle Excel file upload
    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setUploadError('Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Map Excel columns to student fields
                const mappedData = jsonData.map(row => ({
                    studentId: row['Student ID'] || row['studentId'] || row['Roll Number'] || row['rollNumber'] || '',
                    name: row['Name'] || row['name'] || row['Student Name'] || '',
                    email: row['Email'] || row['email'] || row['E-mail'] || '',
                    course: row['Course'] || row['course'] || row['Program'] || '',
                    department: row['Department'] || row['department'] || row['Dept'] || '',
                    enrollmentYear: row['Enrollment Year'] || row['enrollmentYear'] || row['Year'] || new Date().getFullYear()
                }));

                setExcelData(mappedData);
                setUploadError('');
                setUploadResult(null);
            } catch (err) {
                setUploadError('Error parsing Excel file: ' + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Submit bulk upload
    const handleBulkUpload = async () => {
        if (excelData.length === 0) {
            setUploadError('No data to upload');
            return;
        }

        setUploadLoading(true);
        setUploadError('');
        setUploadResult(null);

        try {
            const response = await api.post('/student/bulk-upload', { students: excelData });
            setUploadResult(response.data);
            fetchData(); // Refresh student list
        } catch (error) {
            setUploadError(error.response?.data?.error || 'Upload failed');
        } finally {
            setUploadLoading(false);
        }
    };

    const clearExcelData = () => {
        setExcelData([]);
        setUploadResult(null);
        setUploadError('');
        const fileInput = document.getElementById('excel-upload');
        if (fileInput) fileInput.value = '';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Admin Panel</h1>
                <p className="text-muted">Manage students, records, and view blockchain transactions</p>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
                    👥 Students
                </button>
                <button className={`tab ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
                    📊 Bulk Upload
                </button>
                <button className={`tab ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>
                    🔍 Verify
                </button>
                <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
                    🔗 Transactions
                </button>
            </div>

            {activeTab === 'bulk' && (
                <div className="section">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">📊 Bulk Upload Students from Excel</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Upload Excel File (.xlsx, .xls)</label>
                            <input
                                type="file"
                                id="excel-upload"
                                className="form-control"
                                accept=".xlsx,.xls"
                                onChange={handleExcelUpload}
                                style={{ padding: '0.5rem' }}
                            />
                            <small className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>
                                Excel columns: Student ID, Name, Email, Course, Department, Enrollment Year
                            </small>
                        </div>

                        {uploadError && (
                            <div className="alert alert-error">{uploadError}</div>
                        )}

                        {excelData.length > 0 && (
                            <>
                                <div className="alert alert-info">
                                    📋 Found {excelData.length} students in the Excel file
                                </div>

                                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Student ID</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Course</th>
                                                <th>Department</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {excelData.slice(0, 10).map((student, idx) => (
                                                <tr key={idx}>
                                                    <td>{student.studentId}</td>
                                                    <td>{student.name}</td>
                                                    <td>{student.email}</td>
                                                    <td>{student.course}</td>
                                                    <td>{student.department}</td>
                                                </tr>
                                            ))}
                                            {excelData.length > 10 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-muted">
                                                        ... and {excelData.length - 10} more students
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn btn-success"
                                        onClick={handleBulkUpload}
                                        disabled={uploadLoading}
                                    >
                                        {uploadLoading ? 'Uploading...' : `✅ Upload ${excelData.length} Students`}
                                    </button>
                                    <button className="btn btn-secondary" onClick={clearExcelData}>
                                        ✕ Clear
                                    </button>
                                </div>
                            </>
                        )}

                        {uploadResult && (
                            <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                                <strong>✅ {uploadResult.message}</strong>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <span className="badge badge-success" style={{ marginRight: '0.5rem' }}>
                                        {uploadResult.results.success.length} Successful
                                    </span>
                                    {uploadResult.results.failed.length > 0 && (
                                        <span className="badge badge-error">
                                            {uploadResult.results.failed.length} Failed
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'verify' && (
                <div className="section">
                    <div className="card" style={{ maxWidth: '600px' }}>
                        <div className="card-header">
                            <h3 className="card-title">🔍 Verify Student by Roll Number</h3>
                        </div>
                        <form onSubmit={handleVerifyStudent}>
                            <div className="form-group">
                                <label className="form-label">Enter Student ID / Roll Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={verifyId}
                                    onChange={(e) => setVerifyId(e.target.value)}
                                    placeholder="e.g., STU2024001"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={verifyLoading}>
                                {verifyLoading ? 'Searching...' : '🔍 Search Student'}
                            </button>
                        </form>
                    </div>

                    {verifyError && (
                        <div className="alert alert-error" style={{ maxWidth: '600px', marginTop: '1rem' }}>
                            {verifyError}
                        </div>
                    )}

                    {verifyResult && (
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <div className="flex-between mb-2">
                                <h3>📋 Student Details</h3>
                                <div className={`verification-badge ${verifyResult.verified ? 'verified' : 'unverified'}`}>
                                    {verifyResult.verified ? '✓ Verified' : '✗ Unverified'}
                                </div>
                            </div>

                            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                                <div className="stat-card">
                                    <div className="stat-label">Student ID</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verifyResult.student?.studentId}</div>
                                </div>
                                <div className="stat-card success">
                                    <div className="stat-label">Full Name</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verifyResult.student?.name}</div>
                                </div>
                                <div className="stat-card info">
                                    <div className="stat-label">Course</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verifyResult.student?.course || 'N/A'}</div>
                                </div>
                                <div className="stat-card warning">
                                    <div className="stat-label">Enrollment Year</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verifyResult.student?.enrollmentYear}</div>
                                </div>
                            </div>

                            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                                <div><strong>Department:</strong> {verifyResult.student?.department || 'N/A'}</div>
                                <div><strong>Institution:</strong> {verifyResult.student?.institution || 'N/A'}</div>
                            </div>

                            <h4 style={{ marginBottom: '1rem' }}>📄 Records ({verifyResult.records?.length || 0})</h4>
                            {verifyResult.records?.length > 0 ? (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Blockchain TX</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {verifyResult.records.map((record, idx) => (
                                                <tr key={idx}>
                                                    <td>{record.title}</td>
                                                    <td><span className="badge badge-info">{record.type}</span></td>
                                                    <td>
                                                        {record.verified ? (
                                                            <span className="badge badge-success">✓ Verified</span>
                                                        ) : (
                                                            <span className="badge badge-error">⚠ Tampered</span>
                                                        )}
                                                    </td>
                                                    <td><code className="hash-display">{record.blockchainTxHash?.slice(0, 16)}...</code></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📭</div>
                                    <p>No records found for this student</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'students' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">All Students ({students.length})</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Course</th>
                                    <th>Department</th>
                                    <th>Wallet</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => (
                                    <tr key={idx}>
                                        <td><strong>{student.studentId}</strong></td>
                                        <td>{student.name}</td>
                                        <td>{student.email}</td>
                                        <td>{student.course}</td>
                                        <td>{student.department}</td>
                                        <td>
                                            {student.walletAddress ? (
                                                <code className="hash-display">{student.walletAddress.slice(0, 10)}...</code>
                                            ) : (
                                                <span className="text-muted">Not connected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">Blockchain Transactions ({transactions.length})</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Transaction Hash</th>
                                    <th>Data Hash</th>
                                    <th>Action</th>
                                    <th>Block Number</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, idx) => (
                                    <tr key={idx}>
                                        <td><code className="hash-display">{tx.txHash?.slice(0, 20)}...</code></td>
                                        <td><code className="hash-display">{tx.dataHash?.slice(0, 16)}...</code></td>
                                        <td><span className="badge badge-info">{tx.action}</span></td>
                                        <td>{tx.blockNumber || 'Pending'}</td>
                                        <td>{new Date(tx.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Notifications Page Component
function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'urgent': return 'error';
            case 'important': return 'warning';
            case 'event': return 'success';
            default: return 'info';
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🔔 Notifications</h1>
                <p className="text-muted">Stay updated with college announcements</p>
            </div>

            <div className="section">
                {notifications.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-muted">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className="card"
                            style={{
                                marginBottom: '1rem',
                                borderLeft: `4px solid var(--${getTypeColor(notification.type)})`,
                                opacity: notification.read ? 0.7 : 1
                            }}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                                        {notification.title}
                                        {!notification.read && <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>New</span>}
                                    </h3>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{notification.message}</p>
                                    <small className="text-muted">
                                        {new Date(notification.date).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </small>
                                </div>
                                <span className={`badge badge-${getTypeColor(notification.type)}`}>{notification.type}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Results Page Component
function ResultsPage() {
    const [results, setResults] = useState([]);
    const [cgpa, setCgpa] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState(null);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const response = await api.get('/student/results');
            setResults(response.data.results || []);
            setCgpa(response.data.cgpa || 0);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return 'success';
        if (grade.startsWith('B')) return 'info';
        if (grade.startsWith('C')) return 'warning';
        return 'error';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📊 Academic Results</h1>
                <p className="text-muted">View your semester-wise academic performance</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card success">
                    <div className="stat-value">{cgpa}</div>
                    <div className="stat-label">CGPA</div>
                </div>
                <div className="stat-card info">
                    <div className="stat-value">{results.length}</div>
                    <div className="stat-label">Semesters Completed</div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Semester Results</h2>
                </div>

                {results.map(sem => (
                    <div key={sem.semester} className="card" style={{ marginBottom: '1rem' }}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setSelectedSemester(selectedSemester === sem.semester ? null : sem.semester)}
                        >
                            <h3 style={{ margin: 0 }}>📚 Semester {sem.semester} ({sem.year})</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span className="badge badge-success">SGPA: {sem.sgpa}</span>
                                <span>{selectedSemester === sem.semester ? '▲' : '▼'}</span>
                            </div>
                        </div>

                        {selectedSemester === sem.semester && (
                            <div style={{ marginTop: '1rem' }}>
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Subject</th>
                                                <th>Credits</th>
                                                <th>Grade</th>
                                                <th>Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sem.subjects.map((sub, idx) => (
                                                <tr key={idx}>
                                                    <td><code>{sub.code}</code></td>
                                                    <td>{sub.name}</td>
                                                    <td>{sub.credits}</td>
                                                    <td><span className={`badge badge-${getGradeColor(sub.grade)}`}>{sub.grade}</span></td>
                                                    <td>{sub.gradePoints}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Attendance Page Component
function AttendancePage() {
    const [attendance, setAttendance] = useState([]);
    const [overallPercentage, setOverallPercentage] = useState(0);
    const [totalPresent, setTotalPresent] = useState(0);
    const [totalDays, setTotalDays] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const response = await api.get('/student/attendance');
            setAttendance(response.data.attendance || []);
            setOverallPercentage(response.data.overallPercentage || 0);
            setTotalPresent(response.data.totalPresent || 0);
            setTotalDays(response.data.totalDays || 0);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPercentageColor = (percentage) => {
        if (percentage >= 90) return 'success';
        if (percentage >= 75) return 'info';
        if (percentage >= 60) return 'warning';
        return 'error';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📅 Attendance Report</h1>
                <p className="text-muted">View your monthly attendance breakdown</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Overall Attendance</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                            fontSize: '3rem',
                            fontWeight: 'bold',
                            color: `var(--${getPercentageColor(overallPercentage)})`
                        }}>
                            {overallPercentage}%
                        </div>
                        <p className="text-muted">
                            {totalPresent} days present out of {totalDays} working days
                        </p>
                    </div>
                    <div style={{ flex: 2, minWidth: '300px' }}>
                        <div style={{
                            height: '20px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${overallPercentage}%`,
                                background: `var(--${getPercentageColor(overallPercentage)})`,
                                transition: 'width 0.5s ease'
                            }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                            <small className="text-muted">0%</small>
                            <small style={{ color: overallPercentage >= 75 ? 'var(--success)' : 'var(--error)' }}>
                                {overallPercentage >= 75 ? '✅ Eligible for exams' : '⚠️ Below 75% - Shortage'}
                            </small>
                            <small className="text-muted">100%</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Monthly Breakdown</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Year</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Total Days</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendance.map((record, idx) => (
                                <tr key={idx}>
                                    <td><strong>{record.month}</strong></td>
                                    <td>{record.year}</td>
                                    <td><span className="badge badge-success">{record.presentDays}</span></td>
                                    <td><span className="badge badge-error">{record.absentDays}</span></td>
                                    <td>{record.totalDays}</td>
                                    <td>
                                        <span className={`badge badge-${getPercentageColor(record.percentage)}`}>
                                            {record.percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Previous Year Papers Page
function PapersPage() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        api.get('/papers').then(res => {
            setPapers(res.data.papers);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filteredPapers = papers.filter(p =>
        p.subject.toLowerCase().includes(filter.toLowerCase()) ||
        p.code.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📚 Previous Year Papers</h1>
                <p className="text-muted">Download question papers for exam preparation</p>
            </div>

            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Search by subject or code..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="grid-3">
                {filteredPapers.map((paper, idx) => (
                    <div key={idx} className="card" style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '2rem' }}>📄</span>
                            <div>
                                <h4 style={{ margin: 0 }}>{paper.subject}</h4>
                                <code style={{ color: 'var(--text-secondary)' }}>{paper.code}</code>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span className="badge badge-info">{paper.year}</span>
                            <span className="badge badge-secondary">{paper.semester}</span>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                            📥 Download PDF
                        </button>
                    </div>
                ))}
                {filteredPapers.length === 0 && <p className="text-muted">No papers found</p>}
            </div>
        </div>
    );
}

// Schedule/Timetable Page
function SchedulePage() {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/timetable').then(res => {
            setTimetable(res.data.timetable);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const groupedByDay = days.map(day => ({
        day,
        classes: timetable.filter(t => t.day === day).sort((a, b) => a.time.localeCompare(b.time))
    }));

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🗓️ Class Schedule</h1>
                <p className="text-muted">Your weekly timetable</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {groupedByDay.map((dayData, idx) => (
                    <div key={idx} className="card">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{dayData.day}</h3>
                        {dayData.classes.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                {dayData.classes.map((cls, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        minWidth: '200px',
                                        borderLeft: '4px solid var(--primary)'
                                    }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{cls.time}</div>
                                        <div style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>{cls.subject}</div>
                                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>{cls.faculty}</div>
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <span className="badge badge-info">📍 {cls.room}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">No classes</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Assignments Page
function AssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        api.get('/assignments').then(res => {
            setAssignments(res.data.assignments);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleSubmit = async (id) => {
        try {
            await api.post(`/assignments/${id}/submit`);
            setAssignments(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'submitted', submittedAt: new Date().toISOString().split('T')[0] } : a
            ));
        } catch (error) {
            alert('Failed to submit assignment');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'submitted': return 'info';
            case 'graded': return 'success';
            default: return 'secondary';
        }
    };

    const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📝 Assignments</h1>
                <p className="text-muted">View and submit your assignments</p>
            </div>

            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                {['all', 'pending', 'submitted', 'graded'].map(f => (
                    <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="section">
                {filtered.map((assignment, idx) => (
                    <div key={idx} className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{assignment.title}</h3>
                                <p className="text-muted" style={{ margin: '0.5rem 0' }}>{assignment.subject}</p>
                                <p style={{ margin: 0 }}>{assignment.description}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={`badge badge-${getStatusBadge(assignment.status)}`}>
                                    {assignment.status.toUpperCase()}
                                </span>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <small className="text-muted">Due: {assignment.dueDate}</small>
                                </div>
                                {assignment.grade && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <span className="badge badge-success">Grade: {assignment.grade}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {assignment.status === 'pending' && (
                            <div style={{ marginTop: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => handleSubmit(assignment.id)}>
                                    📤 Submit Assignment
                                </button>
                            </div>
                        )}
                        {assignment.feedback && (
                            <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                <strong>Feedback:</strong> {assignment.feedback}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && <p className="text-muted">No assignments found</p>}
            </div>
        </div>
    );
}

// Grievances Page
function GrievancesPage() {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ category: 'Academic', subject: '', description: '' });

    useEffect(() => {
        fetchGrievances();
    }, []);

    const fetchGrievances = async () => {
        try {
            const res = await api.get('/grievances');
            setGrievances(res.data.grievances);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/grievances', form);
            setGrievances([res.data.grievance, ...grievances]);
            setShowForm(false);
            setForm({ category: 'Academic', subject: '', description: '' });
        } catch {
            alert('Failed to submit grievance');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'success';
            case 'in-progress': return 'warning';
            default: return 'error';
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1>💬 Grievances</h1>
                        <p className="text-muted">Submit and track your complaints</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✕ Cancel' : '➕ New Grievance'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3>Submit New Grievance</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                <option>Academic</option>
                                <option>Hostel</option>
                                <option>Infrastructure</option>
                                <option>Transport</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            <input type="text" className="form-control" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-primary">Submit Grievance</button>
                    </form>
                </div>
            )}

            <div className="section">
                {grievances.map((g, idx) => (
                    <div key={idx} className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid var(--${getStatusColor(g.status)})` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <span className="badge badge-secondary">{g.category}</span>
                                <h4 style={{ margin: '0.5rem 0' }}>{g.subject}</h4>
                                <p className="text-muted">{g.description}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={`badge badge-${getStatusColor(g.status)}`}>{g.status.toUpperCase()}</span>
                                <div><small className="text-muted">Filed: {g.createdAt}</small></div>
                            </div>
                        </div>
                        {g.response && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                <strong>Response:</strong> {g.response}
                            </div>
                        )}
                    </div>
                ))}
                {grievances.length === 0 && <p className="text-muted">No grievances filed</p>}
            </div>
        </div>
    );
}

// Events Page
function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/events').then(res => {
            setEvents(res.data.events);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleRegister = async (id) => {
        try {
            await api.post(`/events/${id}/register`);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, isRegistered: true } : e));
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to register');
        }
    };

    const getCategoryColor = (cat) => {
        const colors = { Cultural: 'primary', Workshop: 'success', Placement: 'warning', Sports: 'info', Seminar: 'secondary' };
        return colors[cat] || 'secondary';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📢 Events</h1>
                <p className="text-muted">Upcoming events and workshops</p>
            </div>

            <div className="grid-2">
                {events.map((event, idx) => (
                    <div key={idx} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className={`badge badge-${getCategoryColor(event.category)}`}>{event.category}</span>
                            {event.isRegistered && <span className="badge badge-success">✓ Registered</span>}
                        </div>
                        <h3 style={{ margin: 0 }}>{event.title}</h3>
                        <p className="text-muted" style={{ margin: '0.5rem 0' }}>{event.description}</p>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            <span>📅 {event.date}</span>
                            <span>⏰ {event.time}</span>
                            <span>📍 {event.venue}</span>
                        </div>
                        {!event.isRegistered && event.registrationOpen && (
                            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => handleRegister(event.id)}>
                                Register Now
                            </button>
                        )}
                        {!event.registrationOpen && !event.isRegistered && (
                            <span className="text-muted" style={{ marginTop: '1rem', display: 'block' }}>Registration closed</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Certificates Page
function CertificatesPage() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/certificates').then(res => {
            setCertificates(res.data.certificates);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const getTypeColor = (type) => {
        const colors = { Achievement: 'success', Participation: 'info', Service: 'warning' };
        return colors[type] || 'secondary';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🏆 Certificates</h1>
                <p className="text-muted">Your achievements and certifications</p>
            </div>

            <div className="grid-2">
                {certificates.map((cert, idx) => (
                    <div key={idx} className="card" style={{ borderTop: `4px solid var(--${getTypeColor(cert.type)})` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className={`badge badge-${getTypeColor(cert.type)}`}>{cert.type}</span>
                            {cert.verified && <span className="badge badge-success">✓ Blockchain Verified</span>}
                        </div>
                        <h3 style={{ margin: 0 }}>{cert.title}</h3>
                        <p className="text-muted" style={{ margin: '0.5rem 0' }}>{cert.description}</p>
                        <div style={{ marginTop: '1rem' }}>
                            <small className="text-muted">Issued: {cert.issuedDate}</small>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            🔗 Hash: <code>{cert.blockchainHash}</code>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                            📥 Download Certificate
                        </button>
                    </div>
                ))}
                {certificates.length === 0 && <p className="text-muted">No certificates found</p>}
            </div>
        </div>
    );
}

// ID Card Page
function IDCardPage() {
    const [idCard, setIdCard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/student/idcard').then(res => {
            setIdCard(res.data.idCard);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!idCard) return <div className="dashboard"><p className="text-muted">Unable to load ID card</p></div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📱 Student ID Card</h1>
                <p className="text-muted">Your digital student identity card</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    width: '350px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #1a1a2e 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'white' }}>🎓 {idCard.institutionName}</h3>
                        <small style={{ opacity: 0.8 }}>Student Identity Card</small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            border: '3px solid white'
                        }}>
                            {idCard.profilePicture ?
                                <img src={idCard.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                : '👤'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{idCard.name}</h2>
                            <div style={{ opacity: 0.9, marginTop: '0.25rem' }}>{idCard.studentId}</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div><span style={{ opacity: 0.7 }}>Course:</span> {idCard.course}</div>
                            <div><span style={{ opacity: 0.7 }}>Dept:</span> {idCard.department}</div>
                            <div><span style={{ opacity: 0.7 }}>Year:</span> {idCard.enrollmentYear}</div>
                            <div><span style={{ opacity: 0.7 }}>Valid:</span> {idCard.validUntil}</div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'white', borderRadius: '8px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '3px', color: 'black' }}>
                            ||||| {idCard.barcode} |||||
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    📥 Download ID Card
                </button>
            </div>
        </div>
    );
}

// Performance Analytics Page
function AnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/performance').then(res => {
            setAnalytics(res.data.analytics);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!analytics) return <div className="dashboard"><p className="text-muted">No performance data available</p></div>;

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return '📈';
        if (trend === 'declining') return '📉';
        return '➡️';
    };

    const getTrendColor = (trend) => {
        if (trend === 'improving') return 'success';
        if (trend === 'declining') return 'error';
        return 'info';
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📈 Performance Analytics</h1>
                <p className="text-muted">AI-powered insights and predictions</p>
            </div>

            {/* Key Metrics */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <h3 style={{ margin: 0, opacity: 0.9 }}>Current CGPA</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0' }}>{analytics.cgpa}</div>
                    <div style={{ opacity: 0.9 }}>
                        <span className={`badge badge-${getTrendColor(analytics.trend)}`} style={{ background: 'rgba(255,255,255,0.2)' }}>
                            {getTrendIcon(analytics.trend)} {analytics.trend}
                        </span>
                    </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    <h3 style={{ margin: 0, opacity: 0.9 }}>Attendance</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0' }}>{analytics.attendancePercentage}%</div>
                    <div style={{ opacity: 0.9 }}>
                        {analytics.attendancePercentage >= 75 ? '✅ Eligible' : '⚠️ Shortage'}
                    </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                    <h3 style={{ margin: 0, opacity: 0.9 }}>Predicted SGPA</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0' }}>{analytics.predictions.nextSemesterSGPA}</div>
                    <div style={{ opacity: 0.9 }}>Next Semester</div>
                </div>
            </div>

            {/* Recommendations */}
            {analytics.recommendations.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>💡 Personalized Recommendations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {analytics.recommendations.map((rec, idx) => (
                            <div key={idx} className={`badge badge-${rec.type}`} style={{ padding: '0.75rem', fontSize: '0.95rem', textAlign: 'left' }}>
                                {rec.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Performance Trend */}
            <div className="grid-2">
                <div className="card">
                    <h3>📊 Semester Performance</h3>
                    <div style={{ marginTop: '1.5rem' }}>
                        {analytics.semesterPerformance.map((sem, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                                <div>
                                    <strong>Semester {sem.semester}</strong>
                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>{sem.year}</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {sem.sgpa}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3>⚠️ Weak Subjects</h3>
                    {analytics.weakSubjects.length > 0 ? (
                        <div style={{ marginTop: '1.5rem' }}>
                            {analytics.weakSubjects.map((sub, idx) => (
                                <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', borderLeft: '3px solid var(--warning)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <strong>{sub.name}</strong>
                                            <div className="text-muted" style={{ fontSize: '0.85rem' }}>{sub.code}</div>
                                        </div>
                                        <span className="badge badge-warning">{sub.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted" style={{ marginTop: '1rem' }}>No weak subjects - Great job! 🎉</p>
                    )}
                </div>
            </div>

            {/* Predictions */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <h3>🔮 Future Predictions</h3>
                <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div className="text-muted">Expected Next Semester SGPA</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0' }}>
                            {analytics.predictions.nextSemesterSGPA}
                        </div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div className="text-muted">Expected CGPA After Next Sem</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', margin: '0.5rem 0' }}>
                            {analytics.predictions.expectedCGPA}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// AI Study Buddy Chat Component
function StudyBuddyChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [subject, setSubject] = useState('General');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Load chat history
            api.get('/chat/history').then(res => {
                setMessages(res.data.history);
            }).catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        setLoading(true);
        try {
            const res = await api.post('/chat/message', { message: input, subject });
            setMessages([...messages, res.data.userMessage, res.data.aiMessage]);
            setInput('');
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.8rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                    zIndex: 1000,
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
                🤖
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '400px',
            height: '600px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            border: '1px solid var(--border-color)'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: 0 }}>🤖 AI Study Buddy</h3>
                    <small style={{ opacity: 0.9 }}>Ask me anything!</small>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            {/* Subject Selector */}
            <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <select
                    className="form-control"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                >
                    <option>General</option>
                    <option>Data Structures</option>
                    <option>OOP</option>
                    <option>Mathematics</option>
                    <option>Physics</option>
                    <option>Digital Electronics</option>
                </select>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                        <div style={{ fontSize: '3rem' }}>👋</div>
                        <p>Hi! I'm your AI Study Buddy. Ask me about subjects, grades, or study tips!</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}>
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-tertiary)',
                            color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.message}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </small>
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        style={{ minWidth: '60px' }}
                    >
                        {loading ? '...' : '📤'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Settings Page Component
function SettingsPage() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile-info');
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', walletAddress: user?.walletAddress || '' });
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [studentProfile, setStudentProfile] = useState(null);
    const [profilePicture, setProfilePicture] = useState(null);
    const [picturePreview, setPicturePreview] = useState(null);

    useEffect(() => {
        if (user?.role === 'student') {
            fetchStudentProfile();
        } else {
            setProfileLoading(false);
        }
    }, [user]);

    const fetchStudentProfile = async () => {
        try {
            const response = await api.get('/student/profile');
            setStudentProfile(response.data.profile);
            if (response.data.profile.profilePicture) {
                setPicturePreview(response.data.profile.profilePicture);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.put('/auth/update-profile', profileForm);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(file);
                setPicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePictureUpload = async () => {
        if (!picturePreview) return;
        setLoading(true);
        try {
            await api.put('/student/profile', { profilePicture: picturePreview });
            setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile picture' });
        } finally {
            setLoading(false);
        }
    };

    const isStudent = user?.role === 'student';

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>⚙️ Settings</h1>
                <p className="text-muted">Manage your account settings and preferences</p>
            </div>

            <div className="tabs">
                {isStudent && (
                    <button className={`tab ${activeTab === 'profile-info' ? 'active' : ''}`} onClick={() => setActiveTab('profile-info')}>
                        🎓 Profile Info
                    </button>
                )}
                {isStudent && (
                    <button className={`tab ${activeTab === 'picture' ? 'active' : ''}`} onClick={() => setActiveTab('picture')}>
                        📷 Profile Picture
                    </button>
                )}
                <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
                    🔐 Password
                </button>
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    👤 Edit Profile
                </button>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {activeTab === 'profile-info' && isStudent && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Student Information</h3>
                    </div>
                    {profileLoading ? (
                        <LoadingSpinner />
                    ) : studentProfile ? (
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setLoading(true);
                            try {
                                await api.put('/student/profile', {
                                    aadhaarNumber: studentProfile.aadhaarNumber,
                                    apaarId: studentProfile.apaarId,
                                    dob: studentProfile.dob,
                                    admissionType: studentProfile.admissionType
                                });
                                setMessage({ type: 'success', text: 'Student information updated successfully!' });
                            } catch (error) {
                                setMessage({ type: 'error', text: 'Failed to update student information' });
                            } finally {
                                setLoading(false);
                            }
                        }}>
                            <div className="grid-2" style={{ gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Student ID / Roll Number</label>
                                    <input type="text" className="form-control" value={studentProfile.studentId} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-control" value={studentProfile.name} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Aadhaar Number</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={studentProfile.aadhaarNumber || ''}
                                        onChange={(e) => setStudentProfile({ ...studentProfile, aadhaarNumber: e.target.value })}
                                        placeholder="Enter Aadhaar Number (XXXX-XXXX-XXXX)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">APAAR ID</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={studentProfile.apaarId || ''}
                                        onChange={(e) => setStudentProfile({ ...studentProfile, apaarId: e.target.value })}
                                        placeholder="Enter APAAR ID"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={studentProfile.dob || ''}
                                        onChange={(e) => setStudentProfile({ ...studentProfile, dob: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Admission Type</label>
                                    <select
                                        className="form-control"
                                        value={studentProfile.admissionType || ''}
                                        onChange={(e) => setStudentProfile({ ...studentProfile, admissionType: e.target.value })}
                                    >
                                        <option value="">Select Admission Type</option>
                                        <option value="counselling">Counselling</option>
                                        <option value="management">Management</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Course</label>
                                    <input type="text" className="form-control" value={studentProfile.course} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input type="text" className="form-control" value={studentProfile.department} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Enrollment Year</label>
                                    <input type="text" className="form-control" value={studentProfile.enrollmentYear} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="text" className="form-control" value={studentProfile.email} disabled style={{ background: 'var(--bg-secondary)' }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : '💾 Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-muted">Unable to load profile information</p>
                    )}
                </div>
            )}

            {activeTab === 'picture' && isStudent && (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <div className="card-header">
                        <h3 className="card-title">Profile Picture</h3>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            background: 'var(--bg-secondary)',
                            margin: '0 auto 1.5rem',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid var(--primary)'
                        }}>
                            {picturePreview ? (
                                <img src={picturePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '4rem' }}>👤</span>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                📁 Choose Photo
                                <input type="file" accept="image/*" onChange={handlePictureChange} style={{ display: 'none' }} />
                            </label>
                            <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Max size: 2MB. Formats: JPG, PNG</p>
                        </div>
                        {picturePreview && (
                            <button className="btn btn-primary" onClick={handlePictureUpload} disabled={loading}>
                                {loading ? 'Uploading...' : '💾 Save Picture'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <div className="card-header">
                        <h3 className="card-title">Change Password</h3>
                    </div>
                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input type="password" className="form-control" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" className="form-control" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input type="password" className="form-control" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <div className="card-header">
                        <h3 className="card-title">Update Profile</h3>
                    </div>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" className="form-control" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Wallet Address</label>
                            <input type="text" className="form-control" value={profileForm.walletAddress} onChange={(e) => setProfileForm({ ...profileForm, walletAddress: e.target.value })} placeholder="0x..." />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// Student Self-Registration Page
function StudentRegisterPage() {
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        course: '',
        department: '',
        enrollmentYear: new Date().getFullYear()
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.post('/student/self-register', formData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setMessage({ type: 'success', text: 'Registration successful! Redirecting to payment...' });
            setTimeout(() => navigate('/payments'), 2000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container flex-center" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
                <div className="text-center mb-2">
                    <h2>🎓 Student Registration</h2>
                    <p className="text-muted">Create your account to access student services</p>
                </div>

                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Student ID *</label>
                            <input type="text" className="form-control" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} placeholder="e.g., STU2024001" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <input type="password" className="form-control" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password *</label>
                            <input type="password" className="form-control" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Course</label>
                            <input type="text" className="form-control" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} placeholder="e.g., Computer Science" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input type="text" className="form-control" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g., Engineering" />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating Account...' : '📝 Register as Student'}
                    </button>
                </form>

                <div className="text-center mt-2">
                    <p className="text-muted">Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}

// Payment Page Component with UPI Support
function PaymentPage() {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showUPIModal, setShowUPIModal] = useState(false);
    const [selectedFees, setSelectedFees] = useState([]);

    const feeTypes = [
        { id: 'tuition_fee', name: 'Tuition Fee', amount: 50000, icon: '🎓', description: 'Semester tuition charges' },
        { id: 'crt_fee', name: 'CRT Fee', amount: 5000, icon: '💼', description: 'Campus Recruitment Training' },
        { id: 'bus_fee', name: 'Bus Fee', amount: 12000, icon: '🚌', description: 'Annual transportation charges' },
        { id: 'hostel_fee', name: 'Hostel Fee', amount: 35000, icon: '🏠', description: 'Hostel accommodation per semester' },
        { id: 'other_fee', name: 'Other Fees', amount: 2500, icon: '📋', description: 'Lab, Library & Activities' }
    ];

    const UPI_ID = 'college@upi';

    useEffect(() => { fetchPayments(); }, []);

    const fetchPayments = async () => {
        try {
            const response = await api.get('/payments');
            setPayments(response.data.payments || []);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFeeToggle = (feeId) => {
        setSelectedFees(prev => prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]);
    };

    const getTotalAmount = () => {
        return feeTypes.filter(fee => selectedFees.includes(fee.id)).reduce((sum, fee) => sum + fee.amount, 0);
    };

    const handleProceedToPayment = () => {
        if (selectedFees.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one fee to pay' });
            return;
        }
        setMessage({ type: '', text: '' });
        setShowPaymentModal(true);
    };

    const handleUPIPayment = () => {
        setShowPaymentModal(false);
        setShowUPIModal(true);
    };

    const handleConfirmPayment = async (method) => {
        setPaymentLoading(true);
        try {
            const txHash = 'UPI' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
            await api.post('/payments', {
                type: selectedFees.join(','),
                amount: getTotalAmount(),
                currency: 'INR',
                paymentMethod: method,
                txHash,
                description: feeTypes.filter(f => selectedFees.includes(f.id)).map(f => f.name).join(', ')
            });
            setMessage({ type: 'success', text: 'Payment recorded successfully!' });
            setShowUPIModal(false);
            setShowPaymentModal(false);
            setSelectedFees([]);
            fetchPayments();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Payment failed' });
        } finally {
            setPaymentLoading(false);
        }
    };

    const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>💳 Fee Payments</h1>
                <p className="text-muted">Select fees and pay securely via UPI</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Select Fees to Pay</h2>
                </div>
                <div className="fee-selection-grid">
                    {feeTypes.map((fee) => (
                        <div key={fee.id} className={`card fee-card ${selectedFees.includes(fee.id) ? 'selected' : ''}`} onClick={() => handleFeeToggle(fee.id)}>
                            <div className="fee-checkbox">
                                <input type="checkbox" checked={selectedFees.includes(fee.id)} onChange={() => handleFeeToggle(fee.id)} onClick={(e) => e.stopPropagation()} />
                            </div>
                            <div className="fee-icon">{fee.icon}</div>
                            <div className="fee-details">
                                <h4>{fee.name}</h4>
                                <p className="text-muted">{fee.description}</p>
                                <div className="fee-amount">{formatINR(fee.amount)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {selectedFees.length > 0 && (
                    <div className="payment-summary-bar">
                        <div className="summary-info">
                            <span>{selectedFees.length} fee(s) selected</span>
                            <span className="total-amount">Total: {formatINR(getTotalAmount())}</span>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleProceedToPayment}>
                            Proceed to Pay →
                        </button>
                    </div>
                )}
            </div>

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Payment History</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>Description</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Transaction ID</th></tr>
                        </thead>
                        <tbody>
                            {payments.filter(p => p.status === 'completed').map((payment) => (
                                <tr key={payment.id}>
                                    <td>{payment.description}</td>
                                    <td><strong>{formatINR(payment.amount)}</strong></td>
                                    <td><span className="badge badge-info">{payment.paymentMethod}</span></td>
                                    <td><span className="badge badge-success">Completed</span></td>
                                    <td>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</td>
                                    <td><code className="hash-display">{payment.txHash?.slice(0, 16)}...</code></td>
                                </tr>
                            ))}
                            {payments.filter(p => p.status === 'completed').length === 0 && (
                                <tr><td colSpan="6" className="text-center text-muted">No payment history</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select Payment Method</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-summary">
                                <h4>Selected Fees</h4>
                                {feeTypes.filter(f => selectedFees.includes(f.id)).map(f => (
                                    <div key={f.id} className="fee-line">{f.icon} {f.name}: {formatINR(f.amount)}</div>
                                ))}
                                <div className="amount-display">{formatINR(getTotalAmount())}</div>
                            </div>
                            <div className="payment-methods">
                                <button className="btn btn-success btn-lg" style={{ width: '100%', marginBottom: '1rem' }} onClick={handleUPIPayment}>
                                    📱 Pay via UPI
                                </button>
                                <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={() => handleConfirmPayment('card')} disabled={paymentLoading}>
                                    💳 Pay with Card
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showUPIModal && (
                <div className="modal-overlay" onClick={() => setShowUPIModal(false)}>
                    <div className="modal upi-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📱 UPI Payment</h3>
                            <button className="modal-close" onClick={() => setShowUPIModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="upi-details">
                                <div className="upi-qr-placeholder">
                                    <div className="qr-box">QR</div>
                                    <p className="text-muted">Scan with any UPI app</p>
                                </div>
                                <div className="upi-info">
                                    <div className="upi-row"><span>UPI ID:</span><strong>{UPI_ID}</strong><button className="btn btn-sm btn-secondary" onClick={() => navigator.clipboard.writeText(UPI_ID)}>Copy</button></div>
                                    <div className="upi-row"><span>Amount:</span><strong className="upi-amount">{formatINR(getTotalAmount())}</strong></div>
                                </div>
                                <div className="upi-instructions">
                                    <p>1. Open any UPI app (GPay, PhonePe, Paytm)</p>
                                    <p>2. Send {formatINR(getTotalAmount())} to <strong>{UPI_ID}</strong></p>
                                    <p>3. Click "I Have Paid" after successful payment</p>
                                </div>
                                <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={() => handleConfirmPayment('upi')} disabled={paymentLoading}>
                                    {paymentLoading ? 'Processing...' : '✓ I Have Paid'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// System Admin Page Component
function SystemAdminPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, institutionsRes, logsRes, statsRes, paymentsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/institutions'),
                api.get('/admin/logs'),
                api.get('/admin/stats'),
                api.get('/payments/all')
            ]);
            setUsers(usersRes.data.users || []);
            setInstitutions(institutionsRes.data.institutions || []);
            setLogs(logsRes.data.logs || []);
            setStats(statsRes.data);
            setPayments(paymentsRes.data.payments || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setMessage({ type: 'success', text: 'User deleted successfully' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete user' });
        }
    };

    const handleResetPassword = async (userId) => {
        try {
            const response = await api.post(`/admin/users/${userId}/reset-password`);
            setMessage({ type: 'success', text: `Password reset. Temp password: ${response.data.temporaryPassword}` });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reset password' });
        }
    };

    const handleUpdateUser = async (userId, data) => {
        try {
            await api.put(`/admin/users/${userId}`, data);
            setMessage({ type: 'success', text: 'User updated successfully' });
            setEditingUser(null);
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update user' });
        }
    };

    const handleUpdateInstitution = async (institutionId, verified) => {
        try {
            await api.put(`/admin/institutions/${institutionId}`, { verified });
            setMessage({ type: 'success', text: 'Institution updated successfully' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update institution' });
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>⚙️ System Administration</h1>
                <p className="text-muted">Manage users, institutions, and system settings</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="tabs">
                <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Users</button>
                <button className={`tab ${activeTab === 'institutions' ? 'active' : ''}`} onClick={() => setActiveTab('institutions')}>🏛️ Institutions</button>
                <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>💰 Payments</button>
                <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📋 Logs</button>
                <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>📊 Statistics</button>
            </div>

            {activeTab === 'users' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">All Users ({users.length})</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Student ID</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td><strong>{u.name}</strong></td>
                                        <td>{u.email}</td>
                                        <td><span className={`badge badge-${u.role === 'admin' ? 'error' : u.role === 'institution' ? 'warning' : 'info'}`}>{u.role}</span></td>
                                        <td>{u.studentId || '-'}</td>
                                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn btn-sm btn-secondary" onClick={() => setEditingUser(u)}>Edit</button>
                                                <button className="btn btn-sm btn-warning" onClick={() => handleResetPassword(u.id)}>Reset PW</button>
                                                <button className="btn btn-sm btn-error" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'institutions' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">Institutions ({institutions.length})</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Code</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {institutions.map((inst) => (
                                    <tr key={inst.id}>
                                        <td><strong>{inst.name}</strong></td>
                                        <td><code>{inst.code}</code></td>
                                        <td><span className={`badge badge-${inst.verified ? 'success' : 'warning'}`}>{inst.verified ? 'Verified' : 'Pending'}</span></td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => handleUpdateInstitution(inst.id, !inst.verified)}>
                                                {inst.verified ? 'Revoke' : 'Verify'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">All Payments ({payments.length})</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Method</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.studentId || '-'}</td>
                                        <td>{p.description}</td>
                                        <td><strong>${p.amount}</strong></td>
                                        <td><span className={`badge badge-${p.status === 'completed' ? 'success' : 'warning'}`}>{p.status}</span></td>
                                        <td>{p.paymentMethod || '-'}</td>
                                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {payments.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No payments</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">System Logs</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>User</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td><span className="badge badge-info">{log.action}</span></td>
                                        <td>{log.userEmail || log.performedBy || '-'}</td>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan="3" className="text-center text-muted">No logs yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'stats' && stats && (
                <div className="section">
                    <div className="stats-grid">
                        <div className="stat-card"><div className="stat-value">{stats.users?.total}</div><div className="stat-label">Total Users</div></div>
                        <div className="stat-card success"><div className="stat-value">{stats.students?.total}</div><div className="stat-label">Students</div></div>
                        <div className="stat-card info"><div className="stat-value">{stats.records?.total}</div><div className="stat-label">Records</div></div>
                        <div className="stat-card warning"><div className="stat-value">${stats.payments?.totalRevenue}</div><div className="stat-label">Revenue</div></div>
                    </div>
                    <div className="grid-2 mt-2">
                        <div className="card">
                            <h4>User Breakdown</h4>
                            <div className="stat-row"><span>Admins:</span><strong>{stats.users?.admins}</strong></div>
                            <div className="stat-row"><span>Institutions:</span><strong>{stats.users?.institutions}</strong></div>
                            <div className="stat-row"><span>Students:</span><strong>{stats.users?.students}</strong></div>
                        </div>
                        <div className="card">
                            <h4>Payment Stats</h4>
                            <div className="stat-row"><span>Completed:</span><strong>{stats.payments?.completed}</strong></div>
                            <div className="stat-row"><span>Pending:</span><strong>{stats.payments?.pending}</strong></div>
                            <div className="stat-row"><span>Blockchain TX:</span><strong>{stats.blockchain?.totalTransactions}</strong></div>
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input type="text" className="form-control" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-control" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                                    <option value="student">Student</option>
                                    <option value="institution">Institution</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button className="btn btn-primary" onClick={() => handleUpdateUser(editingUser.id, { name: editingUser.name, email: editingUser.email, role: editingUser.role })}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Admin Analytics Dashboard Page
function AdminAnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('month');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/admin/analytics');
            setAnalytics(response.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    📊 Real-Time Analytics Dashboard
                </h1>
                <select
                    className="form-control"
                    style={{ width: 'auto' }}
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-4" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics?.summary?.totalStudents || 0}</div>
                    <div>Total Students</div>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics?.summary?.verifiedStudents || 0}</div>
                    <div>Verified Students</div>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics?.feeCollection?.collectionRate || 0}%</div>
                    <div>Fee Collection Rate</div>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics?.summary?.totalRecords || 0}</div>
                    <div>Total Records</div>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Department Performance */}
                <div className="card">
                    <h3>📈 Department Performance</h3>
                    <div style={{ marginTop: '1rem' }}>
                        {analytics?.departmentStats?.map((dept, i) => (
                            <div key={i} style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>{dept.department}</span>
                                    <span style={{ fontWeight: 'bold' }}>SGPA: {dept.avgSGPA}</span>
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(dept.avgSGPA / 10) * 100}%`,
                                        height: '100%',
                                        background: dept.avgSGPA >= 8 ? 'linear-gradient(90deg, #11998e, #38ef7d)' : dept.avgSGPA >= 6 ? 'linear-gradient(90deg, #f7971e, #ffd200)' : 'linear-gradient(90deg, #f5576c, #f093fb)',
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fee Collection */}
                <div className="card">
                    <h3>💰 Fee Collection Status</h3>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <div style={{
                            width: '150px', height: '150px', borderRadius: '50%',
                            background: `conic-gradient(#38ef7d ${analytics?.feeCollection?.collectionRate || 0}%, #2d3748 0)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto'
                        }}>
                            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {analytics?.feeCollection?.collectionRate || 0}%
                            </div>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ color: '#38ef7d', fontWeight: 'bold' }}>₹{((analytics?.feeCollection?.collected || 0) / 100000).toFixed(1)}L</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Collected</div>
                            </div>
                            <div>
                                <div style={{ color: '#f5576c', fontWeight: 'bold' }}>₹{((analytics?.feeCollection?.pending || 0) / 100000).toFixed(1)}L</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Pending</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Attendance Distribution */}
                <div className="card">
                    <h3>📅 Attendance Distribution</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #11998e, #38ef7d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                {analytics?.attendanceStats?.excellent || 0}
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>Excellent (90%+)</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f7971e, #ffd200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                {analytics?.attendanceStats?.good || 0}
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>Good (75-90%)</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f5576c, #f093fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                {analytics?.attendanceStats?.poor || 0}
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>Poor (&lt;75%)</div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <h3>⚡ Recent Activity</h3>
                    <div style={{ marginTop: '1rem' }}>
                        {analytics?.recentActivities?.map((activity, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{activity.message}</span>
                                <span className="badge" style={{ background: 'var(--accent-secondary)' }}>{activity.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="card">
                <h3>📊 Monthly Trend</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '200px', marginTop: '1.5rem', paddingBottom: '1rem' }}>
                    {analytics?.monthlyTrend?.map((month, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{
                                height: `${(month.registrations / 30) * 150}px`,
                                background: 'linear-gradient(180deg, #667eea, #764ba2)',
                                borderRadius: '5px 5px 0 0',
                                margin: '0 5px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                paddingBottom: '5px',
                                color: 'white',
                                fontWeight: 'bold'
                            }}>
                                {month.registrations}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{month.month}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Export Button */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => alert('PDF Export feature - would generate report')}>
                    📄 Export Analytics Report (PDF)
                </button>
            </div>
        </div>
    );
}

// Certificate Generator Page
function CertificateGeneratorPage() {
    const [templates, setTemplates] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [templatesRes, studentsRes, certsRes] = await Promise.all([
                api.get('/admin/certificates/templates'),
                api.get('/students'),
                api.get('/admin/certificates')
            ]);
            setTemplates(templatesRes.data.templates);
            setStudents(studentsRes.data.students || []);
            setCertificates(certsRes.data.certificates || []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplate || selectedStudents.length === 0) {
            alert('Please select a template and at least one student');
            return;
        }
        setGenerating(true);
        try {
            const response = await api.post('/admin/certificates/generate', {
                templateId: selectedTemplate,
                studentIds: selectedStudents
            });
            alert(response.data.message);
            setCertificates([...certificates, ...response.data.certificates]);
            setSelectedStudents([]);
        } catch (err) {
            alert('Failed to generate certificates');
        } finally {
            setGenerating(false);
        }
    };

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const selectAll = () => {
        setSelectedStudents(students.map(s => s.studentId));
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    🎓 Certificate Generator
                </h1>
            </div>

            <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                {/* Template Selection */}
                <div className="card">
                    <h3>📋 Select Certificate Template</h3>
                    <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                        {templates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => setSelectedTemplate(template.id)}
                                style={{
                                    padding: '1rem',
                                    border: selectedTemplate === template.id ? '2px solid #667eea' : '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: selectedTemplate === template.id ? 'rgba(102, 126, 234, 0.1)' : 'transparent'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{template.name}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{template.description}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Student Selection */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>👥 Select Students</h3>
                        <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
                    </div>
                    <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {students.map(student => (
                            <div
                                key={student.studentId}
                                onClick={() => toggleStudent(student.studentId)}
                                style={{
                                    padding: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(student.studentId)}
                                    onChange={() => { }}
                                />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{student.studentId} • {student.department}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerate}
                    disabled={generating || !selectedTemplate || selectedStudents.length === 0}
                >
                    {generating ? 'Generating...' : `🎓 Generate ${selectedStudents.length} Certificate(s)`}
                </button>
            </div>

            {/* Generated Certificates */}
            {certificates.length > 0 && (
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h3>📜 Generated Certificates</h3>
                    <table className="table" style={{ marginTop: '1rem' }}>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Type</th>
                                <th>Issue Date</th>
                                <th>QR Code</th>
                                <th>Blockchain Hash</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.slice(-10).map(cert => (
                                <tr key={cert.id}>
                                    <td>{cert.studentName}</td>
                                    <td><span className="badge">{cert.templateId}</span></td>
                                    <td>{new Date(cert.issueDate).toLocaleDateString()}</td>
                                    <td>📱 QR</td>
                                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{cert.blockchainHash?.slice(0, 16)}...</td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm">Download</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Workflow Manager Page with Kanban Board
function WorkflowManagerPage() {
    const [tasks, setTasks] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tasksRes, workflowsRes] = await Promise.all([
                api.get('/admin/tasks'),
                api.get('/admin/workflows')
            ]);
            setTasks(tasksRes.data.tasks);
            setWorkflows(workflowsRes.data.workflows);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async () => {
        try {
            const response = await api.post('/admin/tasks', newTask);
            setTasks([...tasks, response.data.task]);
            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
            setShowAddTask(false);
        } catch (err) {
            alert('Failed to create task');
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            await api.put(`/admin/tasks/${taskId}`, { status: newStatus });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err) {
            alert('Failed to update task');
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`/admin/tasks/${taskId}`);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (err) {
            alert('Failed to delete task');
        }
    };

    const getColumn = (status) => tasks.filter(t => t.status === status);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#f5576c';
            case 'medium': return '#ffd200';
            case 'low': return '#38ef7d';
            default: return '#667eea';
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    📋 Workflow & Task Manager
                </h1>
                <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
                    ➕ Add Task
                </button>
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #667eea' }}>
                    <h3>Create New Task</h3>
                    <div className="grid grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Task Title"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <select
                            className="form-control"
                            value={newTask.priority}
                            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                        </select>
                    </div>
                    <textarea
                        className="form-control"
                        placeholder="Description"
                        style={{ marginTop: '1rem' }}
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <input
                        type="date"
                        className="form-control"
                        style={{ marginTop: '1rem' }}
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleAddTask}>Create Task</button>
                        <button className="btn btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {/* To Do Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#667eea' }}>📝 To Do ({getColumn('todo').length})</h4>
                    {getColumn('todo').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => updateTaskStatus(task.id, 'in-progress')}>▶️ Start</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteTask(task.id)}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* In Progress Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#ffd200' }}>⏳ In Progress ({getColumn('in-progress').length})</h4>
                    {getColumn('in-progress').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => updateTaskStatus(task.id, 'review')}>👁️ Review</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Review Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#f093fb' }}>👁️ Review ({getColumn('review').length})</h4>
                    {getColumn('review').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => updateTaskStatus(task.id, 'done')}>✅ Done</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Done Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#38ef7d' }}>✅ Done ({getColumn('done').length})</h4>
                    {getColumn('done').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem', opacity: 0.7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold', textDecoration: 'line-through' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38ef7d' }}></span>
                            </div>
                            <button className="btn btn-danger btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => deleteTask(task.id)}>🗑️ Remove</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workflow Templates */}
            <div className="card">
                <h3>🔄 Automation Workflows</h3>
                <div className="grid grid-3" style={{ gap: '1rem', marginTop: '1rem' }}>
                    {workflows.map(workflow => (
                        <div key={workflow.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                            <h4>{workflow.name}</h4>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{workflow.description}</p>
                            <div style={{ marginTop: '1rem' }}>
                                {workflow.steps.slice(0, 3).map((step, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        <span style={{ color: step.status === 'completed' ? '#38ef7d' : '#ffd200' }}>
                                            {step.status === 'completed' ? '✅' : '⏳'}
                                        </span>
                                        {step.action}
                                    </div>
                                ))}
                                {workflow.steps.length > 3 && (
                                    <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>+{workflow.steps.length - 3} more steps</div>
                                )}
                            </div>
                            <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>Configure</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Main App Component with Sidebar Layout
function App() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <AuthProvider>
            <Router>
                <div className="app-layout">
                    <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
                    <div className={`main-content ${!sidebarOpen ? 'expanded' : ''}`}>
                        <TopBar
                            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                            sidebarOpen={sidebarOpen}
                        />
                        <div className="app-container">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/student" element={<StudentPortalPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/verify" element={<VerifyPage />} />
                                <Route path="/register-student" element={<StudentPortalPage />} />
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <DashboardPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/analytics"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <AnalyticsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <SettingsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/analytics"
                                    element={
                                        <ProtectedRoute roles={['admin', 'institution']}>
                                            <AdminAnalyticsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/certificates"
                                    element={
                                        <ProtectedRoute roles={['admin', 'institution']}>
                                            <CertificateGeneratorPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/workflows"
                                    element={
                                        <ProtectedRoute roles={['admin', 'institution']}>
                                            <WorkflowManagerPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/notifications"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <NotificationsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/results"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <ResultsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/attendance"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <AttendancePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/papers"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <PapersPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/schedule"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <SchedulePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/assignments"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <AssignmentsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/grievances"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <GrievancesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/events"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <EventsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/certificates"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <CertificatesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/idcard"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <IDCardPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/payments"
                                    element={
                                        <ProtectedRoute roles={['student']}>
                                            <PaymentPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin"
                                    element={
                                        <ProtectedRoute roles={['admin', 'institution']}>
                                            <AdminPage />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </div>
                        <StudyBuddyChat />
                    </div>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;


