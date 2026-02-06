import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

    // Student links - includes payments
    const studentLinks = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/payments', icon: '💳', label: 'Pay Fees' },
        { path: '/settings', icon: '⚙️', label: 'Settings' },
    ];

    // Admin links - includes student management, NO system admin
    const adminLinks = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/admin', icon: '👥', label: 'Students & Records' },
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
    const { user } = useAuth();
    const [walletAddress, setWalletAddress] = useState(null);

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

            <div className="navbar-actions">
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
                {loading ? 'Registering...' : 'Register & Continue to Payment'}
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
        description: '',
        data: {}
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        setResult(null);
        try {
            const response = await api.post('/student/uploadRecord', formData);
            setMessage({ type: 'success', text: 'Record uploaded to blockchain!' });
            setResult(response.data);
            setFormData({ studentId: '', type: 'transcript', title: '', description: '', data: {} });
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
                <h3 className="card-title">Upload Record to Blockchain</h3>
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
                    <input type="text" className="form-control" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required />
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
                    <input type="text" className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3"></textarea>
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

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Admin Panel</h1>
                <p className="text-muted">Manage students, records, and view blockchain transactions</p>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
                    Students
                </button>
                <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
                    Blockchain Transactions
                </button>
            </div>

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

// Settings Page Component
function SettingsPage() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('password');
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', walletAddress: user?.walletAddress || '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Settings</h1>
                <p className="text-muted">Manage your account settings and preferences</p>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
                    🔐 Change Password
                </button>
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    👤 Profile
                </button>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

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
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <SettingsPage />
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
                    </div>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;


