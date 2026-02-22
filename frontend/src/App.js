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

// Handle expired/invalid token responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const msg = error.response.data?.error || '';
            if (msg.includes('token') || msg.includes('Token') || msg.includes('expired')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

// ==================== LANGUAGE SYSTEM ====================
const translations = {
    en: {
        dashboard: 'Dashboard', analytics: 'Analytics', notifications: 'Notifications',
        schedule: 'Schedule', assignments: 'Assignments', results: 'Results',
        attendance: 'Attendance', papers: 'Papers', events: 'Events',
        grievances: 'Grievances', certificates: 'Certificates', idCard: 'ID Card',
        payFees: 'Pay Fees', settings: 'Settings', helpDesk: 'Help Desk',
        studentsRecords: 'Students & Records', workflows: 'Workflows',
        login: 'Login', register: 'Register', logout: 'Logout',
        welcome: 'Welcome to Portal', welcomeBack: 'Welcome Back',
        studentPortal: 'Student Portal', email: 'Email', password: 'Password',
        fullName: 'Full Name', studentId: 'Student ID', department: 'Department',
        sendOtp: 'Send OTP', verifyLogin: 'Verify & Login', otpSent: 'OTP sent to your email!',
        enterOtp: 'Enter 6-digit OTP', loginWithPassword: 'Login with Password',
        loginWithOtp: 'Login with OTP', or: 'or', resendOtp: 'Resend OTP',
        securePlatform: 'Secure Student Records Management',
        student: 'Student', admin: 'Admin',
        registerDesc: 'Register, login and pay fees', adminDesc: 'Manage students and records'
    },
    hi: {
        dashboard: '', analytics: '', notifications: '',
        schedule: '', assignments: '', results: '',
        attendance: '', papers: '', events: '',
        grievances: '', certificates: '', idCard: ' ',
        payFees: ' ', settings: '', aiChatbot: 'AI ',
        studentsRecords: ' ', workflows: '',
        login: '', register: '', logout: '',
        welcome: 'Portal ', welcomeBack: ' ',
        studentPortal: ' ', email: '', password: '',
        fullName: ' ', studentId: ' ', department: '',
        sendOtp: 'OTP ', verifyLogin: ' ', otpSent: 'OTP !',
        enterOtp: '6 OTP ', loginWithPassword: ' ',
        loginWithOtp: 'OTP ', or: '', resendOtp: 'OTP ',
        securePlatform: ' ',
        student: '', admin: '',
        registerDesc: ', ', adminDesc: ' '
    },
    te: {
        dashboard: '', analytics: '', notifications: '',
        schedule: '', assignments: '', results: '',
        attendance: '', papers: '', events: '',
        grievances: '', certificates: '', idCard: ' ',
        payFees: ' ', settings: '', aiChatbot: 'AI ',
        studentsRecords: ' & ', workflows: '',
        login: '', register: '', logout: '',
        welcome: 'Portal ', welcomeBack: ' ',
        studentPortal: ' ', email: '', password: '',
        fullName: ' ', studentId: ' ', department: '',
        sendOtp: 'OTP ', verifyLogin: ' ', otpSent: 'OTP !',
        enterOtp: '6 OTP ', loginWithPassword: ' ',
        loginWithOtp: 'OTP ', or: '', resendOtp: 'OTP ',
        securePlatform: ' ',
        student: '', admin: '',
        registerDesc: ', ', adminDesc: ' '
    },
    ta: {
        dashboard: '', analytics: '', notifications: '',
        schedule: '', assignments: '', results: '',
        attendance: '', papers: '', events: '',
        grievances: '', certificates: '', idCard: ' ',
        payFees: ' ', settings: '', aiChatbot: 'AI ',
        studentsRecords: ' & ', workflows: '',
        login: '', register: '', logout: '',
        welcome: 'Portal ', welcomeBack: ' ',
        studentPortal: ' ', email: '', password: '',
        fullName: ' ', studentId: ' ', department: '',
        sendOtp: 'OTP ', verifyLogin: ' ', otpSent: 'OTP !',
        enterOtp: '6 OTP ', loginWithPassword: ' ',
        loginWithOtp: 'OTP ', or: '', resendOtp: 'OTP ',
        securePlatform: ' ',
        student: '', admin: '',
        registerDesc: ', ', adminDesc: ' '
    }
};

const LanguageContext = createContext('en');

function useLanguage() {
    const lang = useContext(LanguageContext);
    return (key) => translations[lang]?.[key] || translations['en'][key] || key;
}

function LanguageProvider({ children }) {
    const [lang, setLang] = useState(localStorage.getItem('language') || 'en');

    const changeLang = (newLang) => {
        localStorage.setItem('language', newLang);
        setLang(newLang);
    };

    return (
        <LanguageContext.Provider value={lang}>
            {React.cloneElement(children, { onLangChange: changeLang, currentLang: lang })}
        </LanguageContext.Provider>
    );
}

// Auth Provider Component
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
    const [timeoutCountdown, setTimeoutCountdown] = useState(120);

    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const WARNING_BEFORE = 2 * 60 * 1000; // Show warning 2 min before
    const lastActivity = useRef(Date.now());
    const timeoutTimer = useRef(null);
    const warningTimer = useRef(null);
    const countdownInterval = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // Session timeout logic
    useEffect(() => {
        if (!user) return;

        const resetTimers = () => {
            lastActivity.current = Date.now();
            setShowTimeoutWarning(false);
            setTimeoutCountdown(120);
            clearTimeout(timeoutTimer.current);
            clearTimeout(warningTimer.current);
            clearInterval(countdownInterval.current);

            // Set warning timer
            warningTimer.current = setTimeout(() => {
                setShowTimeoutWarning(true);
                setTimeoutCountdown(120);
                countdownInterval.current = setInterval(() => {
                    setTimeoutCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(countdownInterval.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }, SESSION_TIMEOUT - WARNING_BEFORE);

            // Set logout timer
            timeoutTimer.current = setTimeout(() => {
                clearInterval(countdownInterval.current);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                window.location.href = '/?timeout=1';
            }, SESSION_TIMEOUT);
        };

        resetTimers();
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        const throttledReset = (() => {
            let last = 0;
            return () => {
                const now = Date.now();
                if (now - last > 10000) { // Throttle to once every 10s
                    last = now;
                    resetTimers();
                }
            };
        })();

        events.forEach(e => window.addEventListener(e, throttledReset));
        return () => {
            events.forEach(e => window.removeEventListener(e, throttledReset));
            clearTimeout(timeoutTimer.current);
            clearTimeout(warningTimer.current);
            clearInterval(countdownInterval.current);
        };
    }, [user]);

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
        window.location.href = '/';
    };

    const stayLoggedIn = () => {
        setShowTimeoutWarning(false);
        lastActivity.current = Date.now();
    };

    return (
        <AuthContext.Provider value={{ user, login, walletLogin, register, logout, loading }}>
            {children}
            {showTimeoutWarning && (
                <div className="session-timeout-overlay">
                    <div className="session-timeout-modal">
                        <h2> Session Expiring</h2>
                        <p>You've been inactive. You'll be logged out in:</p>
                        <div className="timeout-countdown">{Math.floor(timeoutCountdown / 60)}:{(timeoutCountdown % 60).toString().padStart(2, '0')}</div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={stayLoggedIn}>Stay Logged In</button>
                            <button className="btn btn-secondary" onClick={logout}>Log Out</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

// Protected Route Component
function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();

    if (loading) return <SkeletonLoader rows={2} />;
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

// Skeleton Loading Component
function SkeletonLoader({ rows = 3, type = 'card' }) {
    if (type === 'cards') {
        return (
            <div className="page-fade" style={{ padding: '2rem' }}>
                <div className="skeleton skeleton-card" style={{ height: '40px', width: '250px', marginBottom: '1.5rem' }}></div>
                <div className="grid-3">
                    {[...Array(rows)].map((_, i) => (
                        <div key={i} className="skeleton skeleton-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="skeleton-circle"></div>
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton-line medium"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                            </div>
                            <div className="skeleton-line long"></div>
                            <div className="skeleton-line medium"></div>
                            <div className="skeleton-line short"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="page-fade" style={{ padding: '2rem' }}>
            <div className="skeleton skeleton-card" style={{ height: '40px', width: '250px', marginBottom: '1.5rem' }}></div>
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="skeleton skeleton-card" style={{ marginBottom: '1rem' }}>
                    <div className="skeleton-line long"></div>
                    <div className="skeleton-line medium"></div>
                    <div className="skeleton-line short"></div>
                </div>
            ))}
        </div>
    );
}

// Theme Toggle Component
function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true; // default dark
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <button className="theme-toggle" onClick={() => setIsDark(!isDark)} title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
            <span>{isDark ? '' : ''}</span>
            <div className={`theme-toggle-track ${!isDark ? 'active' : ''}`}>
                <div className="theme-toggle-thumb"></div>
            </div>
        </button>
    );
}

// Button Ripple Effect
function addRipple(e, btnEl) {
    const btn = btnEl || e.currentTarget;
    if (!btn || !btn.getBoundingClientRect) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    ripple.className = 'ripple';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Confetti Component
function ConfettiEffect({ trigger }) {
    const [show, setShow] = useState(false);
    const [pieces, setPieces] = useState([]);

    useEffect(() => {
        if (trigger) {
            const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];
            const newPieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 6 + Math.random() * 8,
                shape: Math.random() > 0.5 ? '50%' : '0',
            }));
            setPieces(newPieces);
            setShow(true);
            setTimeout(() => setShow(false), 3500);
        }
    }, [trigger]);

    if (!show) return null;
    return (
        <div className="confetti-container">
            {pieces.map(p => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: p.left + '%',
                        animationDelay: p.delay + 's',
                        background: p.color,
                        width: p.size + 'px',
                        height: p.size + 'px',
                        borderRadius: p.shape,
                    }}
                />
            ))}
        </div>
    );
}

// Circular Progress Ring
function ProgressRing({ percentage = 0, size = 60, strokeWidth = 5, color }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (color) return color;
        if (percentage >= 90) return '#10b981';
        if (percentage >= 75) return '#3b82f6';
        if (percentage >= 50) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="progress-ring-container" style={{ width: size, height: size }}>
            <svg className="progress-ring-svg" width={size} height={size}>
                <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
                <circle className="progress-ring-fill" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={getColor()} strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <span className="progress-ring-text">{Math.round(percentage)}%</span>
        </div>
    );
}

// Animated Counter counts from 0 to target value with easing
function AnimatedCounter({ value, duration = 1500, prefix = '', suffix = '', colorClass = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const observed = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !observed.current) {
                observed.current = true;
                const startTime = performance.now();
                const target = typeof value === 'number' ? value : parseInt(value) || 0;
                const animate = (now) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease-out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(eased * target));
                    if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [value, duration]);

    return (
        <span ref={ref} className="animated-counter">
            <span className={`counter-value ${colorClass}`}>{prefix}{count.toLocaleString()}{suffix}</span>
        </span>
    );
}

// Scroll Reveal Hook triggers reveal animation when element enters viewport
function useScrollReveal(options = {}) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                el.classList.add('revealed');
                observer.unobserve(el);
            }
        }, { threshold: options.threshold || 0.1, rootMargin: options.rootMargin || '0px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

// ScrollReveal wrapper component for easier use
function ScrollReveal({ children, className = 'scroll-reveal', style = {} }) {
    const ref = useScrollReveal();
    return <div ref={ref} className={className} style={style}>{children}</div>;
}

// 3D Tilt Hook makes element tilt toward mouse cursor
function useTilt(maxTilt = 8) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handleMove = (e) => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -maxTilt;
            const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        };
        const handleLeave = () => {
            el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        };
        el.addEventListener('mousemove', handleMove);
        el.addEventListener('mouseleave', handleLeave);
        return () => {
            el.removeEventListener('mousemove', handleMove);
            el.removeEventListener('mouseleave', handleLeave);
        };
    }, [maxTilt]);
    return ref;
}


function MobileBottomNav({ role }) {
    const location = window.location.pathname;
    const navigate = useNavigate();

    const studentItems = [
        { path: '/dashboard', icon: '🏠', label: 'Home' },
        { path: '/papers', icon: '🏠', label: 'Papers' },
        { path: '/attendance', icon: '📌', label: 'Attend.' },
        { path: '/notifications', icon: '⚙', label: 'Alerts' },
        { path: '/settings', icon: '🏠', label: 'Settings' },
    ];

    const adminItems = [
        { path: '/dashboard', icon: '🏠', label: 'Home' },
        { path: '/admin', icon: '🏠', label: 'Admin' },
        { path: '/notifications', icon: '👤', label: 'Alerts' },
        { path: '/settings', icon: '🎓', label: 'Profile' },
    ];

    const items = role === 'admin' ? adminItems : studentItems;

    return (
        <nav className="mobile-bottom-nav">
            <div className="mobile-bottom-nav-items">
                {items.map(item => (
                    <button
                        key={item.path}
                        className={`mobile-nav-item ${location === item.path || location.startsWith(item.path + '/') ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

// Page Wrapper with fade animation
function PageWrapper({ children }) {
    return <div className="page-fade">{children}</div>;
}

// Sidebar Component
function Sidebar({ isOpen, onToggle, onNavClick }) {
    const { user, logout } = useAuth();
    const location = window.location.pathname;

    const isActive = (path) => location === path || location.startsWith(path + '/');

    const t = useLanguage();




    // Student links organized by category
    const studentLinkGroups = [
        {
            title: null,
            links: [
                { path: '/dashboard', icon: '🏠', label: t('dashboard') },
            ]
        },
        {
            title: 'Academics',
            links: [
                { path: '/results', icon: '📈', label: t('results') },
                { path: '/attendance', icon: '📋', label: t('attendance') },
                { path: '/schedule', icon: '📅', label: t('schedule') },
                { path: '/assignments', icon: '📝', label: t('assignments') },
                { path: '/papers', icon: '📄', label: t('papers') },
                { path: '/certificates', icon: '🎓', label: t('certificates') },
            ]
        },
        {
            title: 'Services',
            links: [
                { path: '/grievances', icon: '📩', label: t('grievances') },
                { path: '/payments', icon: '💰', label: t('payFees') },
                { path: '/chatbot', icon: '💬', label: t('helpDesk') },
            ]
        },
        {
            title: 'Account',
            links: [
                { path: '/analytics', icon: '📊', label: t('analytics') },
                { path: '/idcard', icon: '💳', label: t('idCard') },
                { path: '/settings', icon: '⚙', label: t('settings') },
            ]
        },
    ];

    // Admin links - includes student management, NO system admin
    const adminLinks = [
        { path: '/dashboard', icon: '🏠', label: t('dashboard') },
        { path: '/admin', icon: '👥', label: t('studentsRecords') },
        { path: '/admin/results', icon: '📊', label: 'Publish Results' },
        { path: '/admin/grievances', icon: '📨', label: 'Grievances' },
        { path: '/admin/attendance', icon: '📅', label: 'Attendance' },
        { path: '/admin/analytics', icon: '📊', label: t('analytics') },
        { path: '/admin/certificates', icon: '🎓', label: t('certificates') },
        { path: '/admin/workflows', icon: '📋', label: t('workflows') },
        { path: '/settings', icon: '⚙', label: t('settings') },
    ];

    // Institution links
    const institutionLinks = [
        { path: '/dashboard', icon: '🏠', label: t('dashboard') },
        { path: '/admin', icon: '🏠', label: t('studentsRecords') },
        { path: '/settings', icon: '⚙', label: t('settings') },
    ];

    const isStudent = user && user.role === 'student';
    const getLinks = () => {
        if (!user) return [];
        if (user.role === 'admin') return adminLinks;
        if (user.role === 'institution') return institutionLinks;
        return []; // student uses grouped rendering
    };

    const links = getLinks();

    // Don't show sidebar on landing/student portal/login pages when not logged in
    if (!user && (location === '/' || location === '/student' || location === '/verify' || location === '/login')) {
        return null;
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
            <div className="sidebar-header">
                <span className="logo-icon">🎓</span>
                <h2 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Portal</h2>
            </div>

            <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1 }}>
                {isStudent ? (
                    /* Student: grouped sections */
                    studentLinkGroups.map((group, i) => (
                        <div key={i} style={group.title ? { marginTop: i === 1 ? '0.25rem' : '0.25rem' } : {}}>
                            {group.title && (
                                <div className="sidebar-section-title" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', marginTop: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>
                                    {group.title}
                                </div>
                            )}
                            {group.links.map((link) => (
                                <Link key={link.path} to={link.path} className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`} style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem', position: 'relative' }} onClick={onNavClick}>
                                    <span className="nav-icon" style={{ fontSize: '1.05rem' }}>{link.icon}</span>
                                    <span className="nav-text">{link.label}</span>
                                    {link.path === '/notifications' && <span className="notification-dot"></span>}
                                </Link>
                            ))}
                        </div>
                    ))
                ) : (
                    /* Admin/Institution: flat list */
                    links.map((link) => (
                        link.external ? (
                            <a key={link.label} href={link.external} target="_blank" rel="noopener noreferrer" className="sidebar-link" onClick={onNavClick}>
                                <span className="nav-icon">{link.icon}</span>
                                <span className="nav-text">{link.label} ↗</span>
                            </a>
                        ) : (
                            <Link key={link.path} to={link.path} className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`} onClick={onNavClick}>
                                <span className="nav-icon">{link.icon}</span>
                                <span className="nav-text">{link.label}</span>
                            </Link>
                        )
                    ))
                )}
            </nav>

            {
                user && (
                    <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <div className="sidebar-link" style={{ cursor: 'default', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                            <span className="nav-icon">👤</span>
                            <span className="nav-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                        </div>
                        <button onClick={logout} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                            <span className="nav-icon">🚪</span>
                            <span className="nav-text">{t('logout')}</span>
                        </button>
                    </div>
                )
            }
        </aside >
    );
}

// Top Bar Component
function TopBar({ onToggleSidebar, sidebarOpen }) {
    const { user, logout } = useAuth();
    const [walletAddress, setWalletAddress] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (user && user.role === 'student') {
            const fetchUnread = async () => {
                try {
                    const res = await api.get('/notifications');
                    const count = (res.data.notifications || []).filter(n => !n.read).length;
                    setUnreadCount(count);
                } catch (err) { /* ignore */ }
            };
            fetchUnread();
            const interval = setInterval(fetchUnread, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

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
                {sidebarOpen ? '✕' : '☰'}
            </button>

            <div className="navbar-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

                {/* Dark Mode Toggle */}
                <ThemeToggle />

                {walletAddress ? (
                    <div className="wallet-address">
                        <span className="dot"></span>
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                ) : (
                    <button onClick={connectWallet} className="btn btn-secondary btn-sm">
                        Connect Wallet
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

    const t = useLanguage();

    const roles = [
        { id: 'student', icon: '🎓', title: t('student'), desc: t('registerDesc'), color: '#667eea', path: '/student' },
        { id: 'admin', icon: '🎓', title: t('admin'), desc: t('adminDesc'), color: '#f59e0b', path: '/login?role=admin' }
    ];

    if (user) {
        navigate('/dashboard');
        return null;
    }

    return (
        <div className="role-selection-page">
            <div className="role-hero">
                <div className="logo-large"></div>
                <h1>{t('welcome')}</h1>
                <p>{t('securePlatform')}</p>
            </div>
            <div className="role-cards">
                {roles.map((role) => (
                    <div key={role.id} className="role-card" onClick={() => navigate(role.path)} style={{ '--accent': role.color }}>
                        <div className="role-icon">{role.icon}</div>
                        <h3>{role.title}</h3>
                        <p>{role.desc}</p>
                        <button className="btn btn-primary">Continue </button>
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
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}> Back</button>
                <h1> {useLanguage()('studentPortal')}</h1>
            </div>
            <div className="portal-tabs">
                <button className={`tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>{useLanguage()('login')}</button>
                <button className={`tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>{useLanguage()('register')}</button>
            </div>
            <div className="portal-content">
                {activeTab === 'login' ? <StudentLoginForm /> : <StudentRegisterForm />}
            </div>
        </div>
    );
}

// Student Login Form with OTP Support
function StudentLoginForm() {
    const { login, walletLogin } = useAuth();
    const navigate = useNavigate();
    const t = useLanguage();
    const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [otpData, setOtpData] = useState({ email: '', otp: '' });
    const [loading, setLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpMessage, setOtpMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (!otpData.email) {
            setError('Please enter your email');
            return;
        }
        setLoading(true);
        setError('');
        setOtpMessage('');
        try {
            const res = await api.post('/auth/send-otp', { email: otpData.email });
            setOtpSent(true);
            setOtpMessage(res.data.message);
            setCountdown(60);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-otp', { email: otpData.email, otp: otpData.otp });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed');
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
            {otpMessage && <div className="alert alert-success">{otpMessage}</div>}

            <button type="button" onClick={handleMetaMaskLogin} disabled={walletLoading} className="btn btn-metamask" style={{ width: '100%', marginBottom: '1.5rem' }}>
                {walletLoading ? 'Connecting...' : ' Sign in with MetaMask'}
            </button>

            <div className="divider"><span>{t('or')} use email</span></div>

            {/* Login Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    type="button"
                    className={`btn ${loginMode === 'password' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.9rem' }}
                    onClick={() => { setLoginMode('password'); setError(''); setOtpMessage(''); }}
                >
                    {t('loginWithPassword')}
                </button>
                <button
                    type="button"
                    className={`btn ${loginMode === 'otp' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.9rem' }}
                    onClick={() => { setLoginMode('otp'); setError(''); setOtpMessage(''); }}
                >
                    {t('loginWithOtp')}
                </button>
            </div>

            {loginMode === 'password' ? (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('email')}</label>
                        <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('password')}</label>
                        <input type="password" className="form-control" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Logging in...' : t('login')}
                    </button>
                </form>
            ) : (
                <div>
                    <div className="form-group">
                        <label className="form-label">{t('email')}</label>
                        <input type="email" className="form-control" value={otpData.email} onChange={(e) => setOtpData({ ...otpData, email: e.target.value })} placeholder="student@university.edu" />
                    </div>
                    {!otpSent ? (
                        <button type="button" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }} onClick={handleSendOtp}>
                            {loading ? 'Sending...' : ` ${t('sendOtp')}`}
                        </button>
                    ) : (
                        <form onSubmit={handleVerifyOtp}>
                            <div className="form-group">
                                <label className="form-label">{t('enterOtp')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={otpData.otp}
                                    onChange={(e) => setOtpData({ ...otpData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    placeholder="000000"
                                    maxLength="6"
                                    style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem' }}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || otpData.otp.length !== 6} style={{ width: '100%' }}>
                                {loading ? 'Verifying...' : ` ${t('verifyLogin')}`}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                {countdown > 0 ? (
                                    <span className="text-muted">{t('resendOtp')} in {countdown}s</span>
                                ) : (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleSendOtp} disabled={loading}>
                                        {t('resendOtp')}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            )}
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

        // Password validation rules
        if (formData.password.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
            setLoading(false);
            return;
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
            setMessage({ type: 'error', text: 'Password must include at least one special character (!@#$%^&*...).' });
            setLoading(false);
            return;
        }
        if (!/[A-Z]/.test(formData.password)) {
            setMessage({ type: 'error', text: 'Password must include at least one uppercase letter.' });
            setLoading(false);
            return;
        }
        if (!/[0-9]/.test(formData.password)) {
            setMessage({ type: 'error', text: 'Password must include at least one number.' });
            setLoading(false);
            return;
        }

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
                            placeholder=""
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
                        Connect with MetaMask
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
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchStats();
    }, []);

    // Fetch unread notification count for students
    useEffect(() => {
        if (user?.role === 'student') {
            const fetchUnread = async () => {
                try {
                    const res = await api.get('/notifications');
                    const count = (res.data.notifications || []).filter(n => !n.read).length;
                    setUnreadCount(count);
                } catch (err) { /* ignore */ }
            };
            fetchUnread();
            const interval = setInterval(fetchUnread, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

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

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="dashboard">
            <ScrollReveal className="scroll-reveal">
                <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Welcome, {user?.name}!</h1>
                        <p className="text-muted">Role: {user?.role?.toUpperCase()}</p>
                    </div>
                    {user?.role === 'student' && (
                        <button
                            onClick={() => navigate('/notifications')}
                            style={{
                                position: 'relative', fontSize: '1.5rem', background: 'transparent',
                                border: 'none', cursor: 'pointer', padding: '0.5rem'
                            }}
                            title="Notifications"
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-2px', right: '-2px',
                                    background: '#8b5cf6', color: 'white', borderRadius: '50%',
                                    minWidth: '20px', height: '20px', fontSize: '0.7rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, padding: '0 4px',
                                    boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </ScrollReveal>

            <div className="stats-grid stagger-children">
                <div className="stat-card card-tilt gradient-border scroll-reveal revealed">
                    <AnimatedCounter value={stats?.totalStudents || 0} />
                    <div className="counter-label">Total Students</div>
                </div>
                <div className="stat-card success card-tilt gradient-border scroll-reveal revealed">
                    <AnimatedCounter value={stats?.totalRecords || 0} colorClass="counter-success" />
                    <div className="counter-label">Total Records</div>
                </div>
                <div className="stat-card info card-tilt gradient-border scroll-reveal revealed">
                    <AnimatedCounter value={stats?.totalTransactions || 0} colorClass="counter-info" />
                    <div className="counter-label">Blockchain Transactions</div>
                </div>
                <div className="stat-card warning card-tilt gradient-border scroll-reveal revealed">
                    <AnimatedCounter value={stats?.totalInstitutions || 0} colorClass="counter-warning" />
                    <div className="counter-label">Institutions</div>
                </div>
            </div>

            <ScrollReveal className="scroll-reveal">
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
            </ScrollReveal>

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
                <h3 className="card-title"> Upload Record to Blockchain</h3>
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
                            <span> {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                            <button type="button" className="btn btn-sm btn-error" onClick={handleRemoveFile}> Remove</button>
                        </div>
                    )}
                </div>
                <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Uploading...' : ' Upload to Blockchain'}
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
                        {loading ? 'Verifying...' : ' Verify Records'}
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
                                {result.verified ? ' Verified' : ' Not Verified'}
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
                                                    <span className="badge badge-success"> Verified</span>
                                                ) : (
                                                    <span className="badge badge-error"> Tampered</span>
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

    // Paper upload states
    const [papers, setPapers] = useState([]);
    const [paperFile, setPaperFile] = useState(null);
    const [paperMeta, setPaperMeta] = useState({ subject: '', code: '', year: new Date().getFullYear(), semester: 'End Sem', department: '' });
    const [paperUploading, setPaperUploading] = useState(false);
    const [paperMsg, setPaperMsg] = useState('');
    const [selectedPapers, setSelectedPapers] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, txRes, papersRes] = await Promise.all([
                api.get('/students'),
                api.get('/blockchain/transactions'),
                api.get('/papers')
            ]);
            setStudents(studentsRes.data.students || []);
            setTransactions(txRes.data.transactions || []);
            setPapers(papersRes.data.papers || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Paper upload handler
    const handlePaperUpload = async (e) => {
        e.preventDefault();
        if (!paperFile) { setPaperMsg('Please select a PDF file'); return; }
        if (!paperMeta.subject.trim()) { setPaperMsg('Subject name is required'); return; }

        setPaperUploading(true);
        setPaperMsg('');
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', paperFile);
            formData.append('subject', paperMeta.subject);
            formData.append('code', paperMeta.code);
            formData.append('year', paperMeta.year);
            formData.append('semester', paperMeta.semester);
            formData.append('department', paperMeta.department);

            const res = await api.post('/admin/papers/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const pct = Math.round((e.loaded * 100) / e.total);
                    setUploadProgress(pct);
                }
            });
            setPapers([res.data.paper, ...papers]);
            setPaperFile(null);
            setPaperMeta({ subject: '', code: '', year: new Date().getFullYear(), semester: 'End Sem', department: '' });
            setPaperMsg(' Paper uploaded successfully!');
            const fi = document.getElementById('paper-file-input');
            if (fi) fi.value = '';
            setTimeout(() => setPaperMsg(''), 3000);
        } catch (err) {
            setPaperMsg(' ' + (err.response?.data?.error || 'Upload failed'));
        } finally {
            setPaperUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeletePaper = async (id) => {
        if (!window.confirm('Delete this paper?')) return;
        try {
            await api.delete(`/admin/papers/${id}`);
            setPapers(papers.filter(p => p.id !== id));
            setSelectedPapers(selectedPapers.filter(s => s !== id));
        } catch (err) {
            alert('Failed to delete paper');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPapers.length === 0) return;
        if (!window.confirm(`Delete ${selectedPapers.length} selected paper(s)?`)) return;
        try {
            await api.post('/admin/papers/bulk-delete', { ids: selectedPapers });
            setPapers(papers.filter(p => !selectedPapers.includes(p.id)));
            setSelectedPapers([]);
            setPaperMsg(` ${selectedPapers.length} paper(s) deleted successfully!`);
            setTimeout(() => setPaperMsg(''), 3000);
        } catch (err) {
            alert('Failed to delete papers');
        }
    };

    const togglePaperSelect = (id) => {
        setSelectedPapers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedPapers.length === papers.length) setSelectedPapers([]);
        else setSelectedPapers(papers.map(p => p.id));
    };

    const [editPaper, setEditPaper] = useState(null);
    const [editData, setEditData] = useState({});

    const startEditPaper = (paper) => {
        setEditPaper(paper.id);
        setEditData({ subject: paper.subject, code: paper.code || '', department: paper.department || '', year: paper.year, semester: paper.semester });
    };

    const handleSaveEdit = async () => {
        try {
            const res = await api.put(`/admin/papers/${editPaper}`, editData);
            setPapers(papers.map(p => p.id === editPaper ? { ...p, ...res.data.paper } : p));
            setEditPaper(null);
            setPaperMsg(' Paper updated successfully!');
            setTimeout(() => setPaperMsg(''), 3000);
        } catch (err) {
            alert('Failed to update paper');
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
            // Auto-clear result after 5 seconds
            setTimeout(() => {
                setVerifyResult(null);
                setVerifyId('');
            }, 5000);
        } catch (error) {
            setVerifyError(error.response?.data?.error || 'Student not found');
            setTimeout(() => setVerifyError(''), 3000);
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
            // Auto-close after 3 seconds
            setTimeout(() => {
                setExcelData([]);
                setUploadResult(null);
                setUploadError('');
                const fileInput = document.getElementById('excel-upload');
                if (fileInput) fileInput.value = '';
            }, 3000);
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

    if (loading) return <SkeletonLoader rows={3} />;

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
                <button className={`tab ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
                    Bulk Upload
                </button>
                <button className={`tab ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>
                    Verify
                </button>
                <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
                    Transactions
                </button>
                <button className={`tab ${activeTab === 'papers' ? 'active' : ''}`} onClick={() => setActiveTab('papers')}>
                    Academic Papers
                </button>
            </div>

            {activeTab === 'bulk' && (
                <div className="section">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title"> Bulk Upload Students from Excel</h3>
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
                                    Found {excelData.length} students in the Excel file
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
                                        {uploadLoading ? 'Uploading...' : ` Upload ${excelData.length} Students`}
                                    </button>
                                    <button className="btn btn-secondary" onClick={clearExcelData}>
                                        Clear
                                    </button>
                                </div>
                            </>
                        )}

                        {uploadResult && (
                            <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                                <strong> {uploadResult.message}</strong>
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
                            <h3 className="card-title"> Verify Student by Roll Number</h3>
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
                                {verifyLoading ? 'Searching...' : ' Search Student'}
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
                                <h3> Student Details</h3>
                                <div className={`verification-badge ${verifyResult.verified ? 'verified' : 'unverified'}`}>
                                    {verifyResult.verified ? ' Verified' : ' Unverified'}
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

                            <h4 style={{ marginBottom: '1rem' }}> Records ({verifyResult.records?.length || 0})</h4>
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
                                                            <span className="badge badge-success"> Verified</span>
                                                        ) : (
                                                            <span className="badge badge-error"> Tampered</span>
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
                                    <div className="empty-state-icon"></div>
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

            {activeTab === 'papers' && (
                <div className="section">
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title"> Upload Academic Paper / Study Material</h3>
                        </div>
                        <form onSubmit={handlePaperUpload}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Subject Name *</label>
                                    <input className="form-control" placeholder="e.g. Data Structures" value={paperMeta.subject} onChange={(e) => setPaperMeta({ ...paperMeta, subject: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Subject Code</label>
                                    <input className="form-control" placeholder="e.g. CS201" value={paperMeta.code} onChange={(e) => setPaperMeta({ ...paperMeta, code: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Department</label>
                                    <input className="form-control" placeholder="e.g. Computer Science" value={paperMeta.department} onChange={(e) => setPaperMeta({ ...paperMeta, department: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Year</label>
                                    <input className="form-control" type="number" value={paperMeta.year} onChange={(e) => setPaperMeta({ ...paperMeta, year: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Semester / Type</label>
                                    <select className="form-control" value={paperMeta.semester} onChange={(e) => setPaperMeta({ ...paperMeta, semester: e.target.value })}>
                                        <option>End Sem</option>
                                        <option>Mid Sem</option>
                                        <option>Supplementary</option>
                                        <option>Assignment</option>
                                        <option>Notes</option>
                                        <option>Syllabus</option>
                                        <option>Reference</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ margin: '0 0 1rem' }}>
                                <label className="form-label">PDF File * (max 20MB)</label>
                                <input id="paper-file-input" type="file" className="form-control" accept=".pdf" onChange={(e) => setPaperFile(e.target.files[0])} style={{ padding: '0.5rem' }} required />
                            </div>
                            {paperMsg && <div className={`alert ${paperMsg.startsWith('') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{paperMsg}</div>}
                            <button type="submit" className="btn btn-primary" disabled={paperUploading}>
                                {paperUploading ? `Uploading... ${uploadProgress}%` : ' Upload Paper'}
                            </button>
                            {paperUploading && uploadProgress > 0 && (
                                <div style={{ marginTop: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', height: '8px' }}>
                                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: '8px', transition: 'width 0.3s ease' }} />
                                </div>
                            )}
                        </form>
                    </div>

                    {papers.length > 0 && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <h3 style={{ margin: 0 }}> Uploaded Papers ({papers.length})</h3>
                                {selectedPapers.length > 0 && (
                                    <button className="btn btn-sm" style={{ background: '#e53e3e', color: 'white', border: 'none' }} onClick={handleBulkDelete}>
                                        Delete Selected ({selectedPapers.length})
                                    </button>
                                )}
                            </div>
                            <div className="table-container" style={{ marginTop: '1rem' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input type="checkbox" checked={selectedPapers.length === papers.length && papers.length > 0} onChange={toggleSelectAll} />
                                            </th>
                                            <th>Subject</th>
                                            <th>Code</th>
                                            <th>Department</th>
                                            <th>Year</th>
                                            <th>Type</th>
                                            <th>File</th>
                                            <th>Downloads</th>
                                            <th>Rating</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {papers.map(p => (
                                            <tr key={p.id} style={{ background: selectedPapers.includes(p.id) ? 'rgba(102,126,234,0.08)' : 'transparent' }}>
                                                <td><input type="checkbox" checked={selectedPapers.includes(p.id)} onChange={() => togglePaperSelect(p.id)} /></td>
                                                <td><strong>{p.subject}</strong></td>
                                                <td><code>{p.code || '-'}</code></td>
                                                <td>{p.department || '-'}</td>
                                                <td>{p.year}</td>
                                                <td><span className="badge badge-info">{p.semester}</span></td>
                                                <td style={{ fontSize: '0.85rem' }}>{p.fileName || 'PDF'}</td>
                                                <td><span className="badge badge-secondary" style={{ fontSize: '0.85rem' }}> {p.downloads || 0}</span></td>
                                                <td>
                                                    {p.avgRating > 0 ? (
                                                        <span style={{ fontSize: '0.85rem' }}> {p.avgRating} ({p.totalRatings})</span>
                                                    ) : (
                                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>No ratings</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <a href={`http://localhost:5000${p.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"></a>
                                                        <button className="btn btn-sm" style={{ background: '#667eea', color: 'white', border: 'none' }} onClick={() => startEditPaper(p)} title="Edit"></button>
                                                        <button className="btn btn-sm" style={{ background: '#e53e3e', color: 'white', border: 'none' }} onClick={() => handleDeletePaper(p.id)} title="Delete"></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Edit Paper Modal */}
                    {editPaper && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setEditPaper(null)}>
                            <div className="card" style={{ width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                                <h3 style={{ marginBottom: '1rem' }}> Edit Paper Details</h3>
                                <div className="form-group">
                                    <label className="form-label">Subject Name *</label>
                                    <input className="form-control" value={editData.subject} onChange={e => setEditData({ ...editData, subject: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject Code</label>
                                    <input className="form-control" value={editData.code} onChange={e => setEditData({ ...editData, code: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input className="form-control" value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <input className="form-control" type="number" value={editData.year} onChange={e => setEditData({ ...editData, year: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={editData.semester} onChange={e => setEditData({ ...editData, semester: e.target.value })}>
                                        <option>End Sem</option>
                                        <option>Mid Sem</option>
                                        <option>Supplementary</option>
                                        <option>Assignment</option>
                                        <option>Notes</option>
                                        <option>Syllabus</option>
                                        <option>Reference</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button className="btn btn-primary" onClick={handleSaveEdit}> Save Changes</button>
                                    <button className="btn btn-secondary" onClick={() => setEditPaper(null)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
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

    if (loading) return <SkeletonLoader rows={4} />;

    const handleDownloadNotification = (notification) => {
        const printWindow = window.open('', '_blank');
        const html = `
            <html><head><title>Notification - ${notification.title}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 2rem; color: #333; max-width: 800px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 1.5rem 2rem; border-radius: 12px; margin-bottom: 2rem; }
                .header h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                .header .meta { opacity: 0.9; font-size: 0.85rem; }
                .content { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; }
                .content h2 { color: #667eea; margin: 0 0 1rem 0; font-size: 1.3rem; }
                .content p { line-height: 1.8; font-size: 1rem; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
                .badge-notice { background: #dbeafe; color: #3b82f6; }
                .badge-important { background: #fef3c7; color: #f59e0b; }
                .badge-urgent { background: #fee2e2; color: #ef4444; }
                .badge-event { background: #d1fae5; color: #10b981; }
                .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; border-top: 1px solid #eee; padding-top: 1rem; text-align: center; }
                @media print { body { padding: 0; } }
            </style></head><body>
            <div class="header">
                <h1>${notification.title}</h1>
                <div class="meta">
                    <span class="badge badge-${notification.type || 'notice'}">${notification.type || 'notice'}</span>
                    &nbsp;&bull;&nbsp;
                    ${new Date(notification.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
            <div class="content">
                <h2>Notification Details</h2>
                <p>${(notification.message || '').replace(/\n/g, '<br/>')}</p>
            </div>
            ${notification.attachment ? '<div class="content"><h2>📎 Attachment</h2><p>' + notification.attachment + '</p></div>' : ''}
            <div class="footer">Downloaded from BlockEdu Portal &bull; ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </body></html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

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
                            className="card swipe-notification"
                            style={{
                                marginBottom: '1rem',
                                borderLeft: `4px solid var(--${getTypeColor(notification.type)})`,
                                opacity: notification.read ? 0.7 : 1,
                                cursor: 'pointer'
                            }}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                            onTouchStart={(e) => { e.currentTarget.dataset.startX = e.touches[0].clientX; e.currentTarget.classList.add('swiping'); }}
                            onTouchMove={(e) => {
                                const diff = e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX || 0);
                                if (diff > 0) e.currentTarget.style.transform = `translateX(${diff}px)`;
                            }}
                            onTouchEnd={(e) => {
                                const diff = e.changedTouches[0].clientX - parseFloat(e.currentTarget.dataset.startX || 0);
                                e.currentTarget.classList.remove('swiping');
                                if (diff > 120) {
                                    e.currentTarget.classList.add('dismissed');
                                    setTimeout(() => markAsRead(notification.id), 300);
                                } else {
                                    e.currentTarget.style.transform = '';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                                    <span className={`badge badge-${getTypeColor(notification.type)}`}>{notification.type}</span>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => { e.stopPropagation(); handleDownloadNotification(notification); }}
                                        title="Download as PDF"
                                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                                    >
                                        📥 Download
                                    </button>
                                </div>
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
    const [autonomousResults, setAutonomousResults] = useState([]);
    const [regulationResults, setRegulationResults] = useState([]);
    const [activeTab, setActiveTab] = useState('academic');

    useEffect(() => {
        fetchResults();
        fetchAutonomousResults();
        fetchRegulationResults();
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

    const fetchAutonomousResults = async () => {
        try {
            const res = await api.get('/student/autonomous-results');
            setAutonomousResults(res.data.results || []);
        } catch (e) { /* endpoint may not exist yet */ }
    };

    const fetchRegulationResults = async () => {
        try {
            const res = await api.get('/student/regulation-results');
            setRegulationResults(res.data.results || []);
        } catch (e) { /* endpoint may not exist yet */ }
    };

    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return 'success';
        if (grade.startsWith('B')) return 'info';
        if (grade.startsWith('C')) return 'warning';
        return 'error';
    };

    const handleDownloadPDF = () => {
        const printWindow = window.open('', '_blank');
        const html = `
            <html><head><title>Academic Results</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 2rem; color: #333; }
                h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem; }
                h2 { color: #444; margin-top: 1.5rem; }
                .summary { display: flex; gap: 2rem; margin: 1rem 0; }
                .summary-box { background: #f0f4ff; padding: 1rem 1.5rem; border-radius: 8px; text-align: center; }
                .summary-box .value { font-size: 1.8rem; font-weight: bold; color: #667eea; }
                .summary-box .label { font-size: 0.85rem; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1.5rem; }
                th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                th { background: #667eea; color: white; }
                tr:nth-child(even) { background: #f9f9f9; }
                .sgpa { background: #e8f5e9; padding: 4px 12px; border-radius: 4px; font-weight: bold; color: #2e7d32; }
                .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; border-top: 1px solid #eee; padding-top: 1rem; }
                @media print { body { padding: 0; } }
            </style></head><body>
            <h1>📊 Academic Results Report</h1>
            <div class="summary">
                <div class="summary-box"><div class="value">${cgpa}</div><div class="label">CGPA</div></div>
                <div class="summary-box"><div class="value">${results.length}</div><div class="label">Semesters</div></div>
            </div>
            ${results.map(sem => `
                <h2>Semester ${sem.semester} (${sem.year}) &mdash; <span class="sgpa">SGPA: ${sem.sgpa}</span></h2>
                <table>
                    <thead><tr><th>Code</th><th>Subject</th><th>Credits</th><th>Grade</th><th>Points</th></tr></thead>
                    <tbody>${sem.subjects.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td>${s.credits}</td><td>${s.grade}</td><td>${s.gradePoints}</td></tr>`).join('')}</tbody>
                </table>
            `).join('')}
            <div class="footer">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} &bull; BlockEdu Portal</div>
            </body></html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    if (loading) return <SkeletonLoader rows={3} />;

    const tabStyle = (tab) => ({
        padding: '0.7rem 1.5rem',
        border: 'none',
        borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
        background: activeTab === tab ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
        color: activeTab === tab ? '#667eea' : 'var(--text-secondary)',
        fontWeight: activeTab === tab ? 700 : 500,
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'all 0.3s ease',
        borderRadius: '8px 8px 0 0'
    });

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1>📊 Academic Results</h1>
                        <p className="text-muted">View your academic performance and results</p>
                    </div>
                    {activeTab === 'academic' && results.length > 0 && (
                        <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>⬇</span> Download Results PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button style={tabStyle('academic')} onClick={() => setActiveTab('academic')}>
                    📝 Academic Results
                </button>
                <button style={tabStyle('autonomous')} onClick={() => setActiveTab('autonomous')}>
                    📄 Autonomous Results
                </button>
                <button style={tabStyle('jntuh')} onClick={() => setActiveTab('jntuh')}>
                    📋 JNTUH Regulation
                </button>
            </div>

            {/* ===== TAB 1: ACADEMIC RESULTS ===== */}
            {activeTab === 'academic' && (
                <>
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

                        {results.length === 0 ? (
                            <div className="card text-center"><p className="text-muted">No results available yet</p></div>
                        ) : (
                            results.map(sem => (
                                <div key={sem.semester} className="card" style={{ marginBottom: '1rem' }}>
                                    <div
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        onClick={() => setSelectedSemester(selectedSemester === sem.semester ? null : sem.semester)}
                                    >
                                        <h3 style={{ margin: 0 }}> Semester {sem.semester} ({sem.year}){sem.branch ? ` — ${sem.branch}` : ''}</h3>
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
                            ))
                        )}
                    </div>
                </>
            )}

            {/* ===== TAB 2: AUTONOMOUS RESULTS ===== */}
            {activeTab === 'autonomous' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">📄 Autonomous Results Files</h2>
                    </div>
                    <p className="text-muted" style={{ marginBottom: '1rem' }}>Download result files uploaded by the administration</p>
                    {autonomousResults.length === 0 ? (
                        <div className="card text-center"><p className="text-muted">No autonomous results uploaded yet</p></div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {autonomousResults.map(r => (
                                <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📄</span>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{r.fileName}</h4>
                                            <small className="text-muted">
                                                Uploaded: {new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <a href={r.fileData} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            👁 View
                                        </a>
                                        <a href={r.fileData} download={r.fileName} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            ⬇ Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB 3: JNTUH REGULATION RESULTS ===== */}
            {activeTab === 'jntuh' && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">📋 JNTUH Regulation Results</h2>
                    </div>
                    <p className="text-muted" style={{ marginBottom: '1rem' }}>View and download regulation results uploaded by the administration</p>
                    {regulationResults.length === 0 ? (
                        <div className="card text-center"><p className="text-muted">No regulation results uploaded yet</p></div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {regulationResults.map(r => (
                                <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📋</span>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{r.fileName}</h4>
                                            <small className="text-muted">
                                                Uploaded: {new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <a href={r.fileData} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            👁 View
                                        </a>
                                        <a href={r.fileData} download={r.fileName} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            ⬇ Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Attendance Report</h1>
                <p className="text-muted">View your monthly attendance breakdown</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Overall Attendance</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <ProgressRing percentage={overallPercentage} size={90} strokeWidth={7} />
                        <div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: `var(--${getPercentageColor(overallPercentage)}-color)`
                            }}>
                                {overallPercentage}%
                            </div>
                            <p className="text-muted" style={{ marginBottom: 0 }}>
                                {totalPresent} / {totalDays} days present
                            </p>
                        </div>
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
                                {overallPercentage >= 75 ? ' Eligible for exams' : ' Below 75% - Shortage'}
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
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ProgressRing percentage={record.percentage} size={36} strokeWidth={3} />
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

// Previous Year Papers / Academic Materials Page
function PapersPage() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [viewFilter, setViewFilter] = useState('all'); // all, bookmarked, recent

    useEffect(() => {
        api.get('/papers').then(res => {
            setPapers(res.data.papers);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const isRecent = (date) => {
        if (!date) return false;
        const diff = Date.now() - new Date(date).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
    };

    const filteredPapers = papers.filter(p => {
        const matchesText = p.subject.toLowerCase().includes(filter.toLowerCase()) ||
            (p.code || '').toLowerCase().includes(filter.toLowerCase()) ||
            (p.department || '').toLowerCase().includes(filter.toLowerCase());
        const matchesType = typeFilter === 'All' || p.semester === typeFilter;
        const matchesView = viewFilter === 'all' || (viewFilter === 'bookmarked' && p.bookmarked) || (viewFilter === 'recent' && isRecent(p.uploadedAt));
        return matchesText && matchesType && matchesView;
    });

    const recentPapers = papers.filter(p => isRecent(p.uploadedAt));
    const types = ['All', ...new Set(papers.map(p => p.semester))];

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDownload = async (paper) => {
        try {
            const res = await api.post(`/papers/${paper.id}/download`);
            setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, downloads: res.data.downloads } : p));
        } catch (err) { /* ignore */ }
        window.open(`${API_URL.replace('/api', '')}${paper.fileUrl}`, '_blank');
    };

    const handleBookmark = async (paper) => {
        try {
            const res = await api.post(`/papers/${paper.id}/bookmark`);
            setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, bookmarked: res.data.bookmarked } : p));
        } catch (err) { /* ignore */ }
    };

    const handleRate = async (paper, rating) => {
        try {
            const res = await api.post(`/papers/${paper.id}/rate`, { rating });
            setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, avgRating: res.data.avgRating, totalRatings: res.data.totalRatings, userRating: res.data.userRating } : p));
        } catch (err) { /* ignore */ }
    };

    const StarRating = ({ paper }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <span
                    key={star}
                    onClick={() => handleRate(paper, star)}
                    style={{ cursor: 'pointer', fontSize: '1rem', color: star <= (paper.userRating || 0) ? '#f6ad55' : '#cbd5e0', transition: 'color 0.2s' }}
                ></span>
            ))}
            {paper.avgRating > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{paper.avgRating} ({paper.totalRatings})</span>}
        </div>
    );

    const PaperCard = ({ paper, showBadge }) => (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            {showBadge && <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'linear-gradient(135deg, #48bb78, #38a169)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}> New</span>}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '2rem' }}></span>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>{paper.subject}</h4>
                        {paper.code && <code style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{paper.code}</code>}
                    </div>
                    <button
                        onClick={() => handleBookmark(paper)}
                        style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s' }}
                        title={paper.bookmarked ? 'Remove Bookmark' : 'Bookmark'}
                    >
                        {paper.bookmarked ? '' : ''}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span className="badge badge-info">{paper.year}</span>
                    <span className="badge badge-secondary">{paper.semester}</span>
                    {paper.department && <span className="badge" style={{ background: 'rgba(102,126,234,0.15)', color: '#667eea' }}>{paper.department}</span>}
                </div>
                <StarRating paper={paper} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    {paper.fileName && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}> {paper.fileName} {formatSize(paper.fileSize) && `(${formatSize(paper.fileSize)})`}</p>}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> {paper.downloads || 0}</span>
                </div>
            </div>
            {paper.fileUrl ? (
                <button onClick={() => handleDownload(paper)} className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }}>
                    View / Download PDF
                </button>
            ) : (
                <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%', marginTop: '0.75rem' }}> Not Available</button>
            )}
        </div>
    );

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Academic Papers & Study Materials</h1>
                <p className="text-muted">Download question papers, notes, and reference materials uploaded by your institution</p>
            </div>

            {/* View tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: ` All (${papers.length})` },
                    { key: 'recent', label: ` Recently Added (${recentPapers.length})` },
                    { key: 'bookmarked', label: ` Bookmarked (${papers.filter(p => p.bookmarked).length})` }
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`btn btn-sm ${viewFilter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewFilter(tab.key)}
                        style={{ fontSize: '0.85rem' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ flex: '1', minWidth: '250px', margin: 0 }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder=" Search by subject, code, or department..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <select className="form-control" style={{ width: 'auto', minWidth: '150px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    {types.map(t => <option key={t}>{t}</option>)}
                </select>
            </div>

            {papers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                    <h3>No Papers Available Yet</h3>
                    <p className="text-muted">Your institution hasn't uploaded any academic papers yet. Check back later!</p>
                </div>
            ) : (
                <>
                    <div className="grid-3">
                        {filteredPapers.map((paper) => (
                            <PaperCard key={paper.id} paper={paper} showBadge={isRecent(paper.uploadedAt)} />
                        ))}
                    </div>
                    {filteredPapers.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '2rem' }}><p className="text-muted" style={{ margin: 0 }}>No papers match your filters</p></div>}
                </>
            )}
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Class Schedule</h1>
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
                                            <span className="badge badge-info"> {cls.room}</span>
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Assignments</h1>
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
                                    Submit Assignment
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1> Grievances</h1>
                        <p className="text-muted">Submit and track your complaints</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? ' Cancel' : ' New Grievance'}
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Events</h1>
                <p className="text-muted">Upcoming events and workshops</p>
            </div>

            <div className="grid-2">
                {events.map((event, idx) => (
                    <div key={idx} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className={`badge badge-${getCategoryColor(event.category)}`}>{event.category}</span>
                            {event.isRegistered && <span className="badge badge-success"> Registered</span>}
                        </div>
                        <h3 style={{ margin: 0 }}>{event.title}</h3>
                        <p className="text-muted" style={{ margin: '0.5rem 0' }}>{event.description}</p>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            <span> {event.date}</span>
                            <span> {event.time}</span>
                            <span> {event.venue}</span>
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
    const [flippedCards, setFlippedCards] = useState(new Set());

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

    const toggleFlip = (idx) => {
        setFlippedCards(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Certificates</h1>
                <p className="text-muted">Click any certificate to verify its blockchain hash</p>
            </div>

            <div className="grid-2">
                {certificates.map((cert, idx) => (
                    <div key={idx} className={`flip-card ${flippedCards.has(idx) ? 'flipped' : ''}`}
                        style={{ minHeight: '250px' }}
                        onClick={() => toggleFlip(idx)}>
                        <div className="flip-card-inner">
                            {/* FRONT */}
                            <div className="flip-card-front" style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderTop: `4px solid var(--${getTypeColor(cert.type)})`,
                                padding: 'var(--spacing-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span className={`badge badge-${getTypeColor(cert.type)}`}>{cert.type}</span>
                                    {cert.verified && <span className="badge badge-success"> Verified</span>}
                                </div>
                                <h3 style={{ margin: 0 }}>{cert.title}</h3>
                                <p className="text-muted" style={{ margin: '0.5rem 0' }}>{cert.description}</p>
                                <div style={{ marginTop: '1rem' }}>
                                    <small className="text-muted">Issued: {cert.issuedDate}</small>
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Hash: <code>{cert.blockchainHash}</code>
                                </div>
                                <span className="flip-hint"> Click to verify</span>
                            </div>

                            {/* BACK Verification */}
                            <div className="flip-card-back" style={{
                                borderTop: `4px solid var(--${getTypeColor(cert.type)})`
                            }}>
                                <h3 style={{ margin: 0 }}> Blockchain Verified</h3>
                                <div className="qr-code-container">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(cert.blockchainHash || cert.title)}`}
                                        alt="Certificate QR" width="150" height="150" style={{ display: 'block' }} />
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                    <strong>{cert.title}</strong><br />
                                    <small className="text-muted">{cert.issuedDate}</small>
                                </div>
                                <span className="flip-hint"> Click to flip back</span>
                            </div>
                        </div>
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
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        api.get('/student/idcard').then(res => {
            setIdCard(res.data.idCard);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <SkeletonLoader rows={2} type="cards" />;
    if (!idCard) return <div className="dashboard"><p className="text-muted">Unable to load ID card</p></div>;

    const qrData = encodeURIComponent(JSON.stringify({
        id: idCard.studentId,
        name: idCard.name,
        course: idCard.course,
        dept: idCard.department,
        institution: idCard.institutionName
    }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Student ID Card</h1>
                <p className="text-muted">Click the card to flip it QR code on the back!</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className={`flip-card ${flipped ? 'flipped' : ''}`}
                    style={{ width: '350px', height: '380px' }}
                    onClick={() => setFlipped(!flipped)}>
                    <div className="flip-card-inner">
                        {/* FRONT ID Card */}
                        <div className="flip-card-front" style={{
                            background: 'linear-gradient(135deg, var(--primary) 0%, #1a1a2e 100%)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            color: 'white',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: 'white' }}> {idCard.institutionName}</h3>
                                <small style={{ opacity: 0.8 }}>Student Identity Card</small>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: '2.5rem', border: '3px solid white'
                                }}>
                                    {idCard.profilePicture ?
                                        <img src={idCard.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        : ''}
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
                            <span className="flip-hint"> Click to flip</span>
                        </div>

                        {/* BACK QR Code */}
                        <div className="flip-card-back" style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, var(--primary) 100%)',
                            color: 'white',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                        }}>
                            <h3 style={{ margin: 0, color: 'white' }}> Scan QR Code</h3>
                            <div className="qr-code-container">
                                <img src={qrUrl} alt="Student QR Code" width="180" height="180" style={{ display: 'block' }} />
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.9 }}>
                                <strong>{idCard.name}</strong><br />
                                {idCard.studentId} {idCard.course}
                            </div>
                            <span className="flip-hint" style={{ color: 'rgba(255,255,255,0.6)' }}> Click to flip back</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); window.print(); }}>
                    Download ID Card
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

    if (loading) return <SkeletonLoader rows={3} />;
    if (!analytics) return <div className="dashboard"><p className="text-muted">No performance data available</p></div>;

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return '';
        if (trend === 'declining') return '';
        return '';
    };

    const getTrendColor = (trend) => {
        if (trend === 'improving') return 'success';
        if (trend === 'declining') return 'error';
        return 'info';
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1> Performance Analytics</h1>
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
                        {analytics.attendancePercentage >= 75 ? ' Eligible' : ' Shortage'}
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
                    <h3> Personalized Recommendations</h3>
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
                    <h3> Semester Performance</h3>
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
                    <h3> Weak Subjects</h3>
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
                        <p className="text-muted" style={{ marginTop: '1rem' }}>No weak subjects - Great job! </p>
                    )}
                </div>
            </div>

            {/* Predictions */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <h3> Future Predictions</h3>
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
                    <h3 style={{ margin: 0 }}> AI Study Buddy</h3>
                    <small style={{ opacity: 0.9 }}>Ask me anything!</small>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                >

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
                        <div style={{ fontSize: '3rem' }}></div>
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
                        {loading ? '...' : '➤'}
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
                <h1> Settings</h1>
                <p className="text-muted">Manage your account settings and preferences</p>
            </div>

            <div className="tabs">
                {isStudent && (
                    <button className={`tab ${activeTab === 'profile-info' ? 'active' : ''}`} onClick={() => setActiveTab('profile-info')}>
                        Profile Info
                    </button>
                )}
                {isStudent && (
                    <button className={`tab ${activeTab === 'picture' ? 'active' : ''}`} onClick={() => setActiveTab('picture')}>
                        Profile Picture
                    </button>
                )}
                <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
                    Password
                </button>
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    Edit Profile
                </button>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {activeTab === 'profile-info' && isStudent && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Student Information</h3>
                    </div>
                    {profileLoading ? (
                        <SkeletonLoader rows={3} />
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
                                    {loading ? 'Saving...' : ' Save Changes'}
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
                                <span style={{ fontSize: '4rem' }}></span>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                Choose Photo
                                <input type="file" accept="image/*" onChange={handlePictureChange} style={{ display: 'none' }} />
                            </label>
                            <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Max size: 2MB. Formats: JPG, PNG</p>
                        </div>
                        {picturePreview && (
                            <button className="btn btn-primary" onClick={handlePictureUpload} disabled={loading}>
                                {loading ? 'Uploading...' : ' Save Picture'}
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
                    <h2> Student Registration</h2>
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
                        {loading ? 'Creating Account...' : ' Register as Student'}
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
    const [showConfetti, setShowConfetti] = useState(false);

    const feeTypes = [
        { id: 'tuition_fee', name: 'Tuition Fee', amount: 50000, icon: '📚', description: 'Semester tuition charges' },
        { id: 'crt_fee', name: 'CRT Fee', amount: 5000, icon: '💰', description: 'Campus Recruitment Training' },
        { id: 'bus_fee', name: 'Bus Fee', amount: 12000, icon: '💰', description: 'Annual transportation charges' },
        { id: 'hostel_fee', name: 'Hostel Fee', amount: 35000, icon: '🏢', description: 'Hostel accommodation per semester' },
        { id: 'other_fee', name: 'Other Fees', amount: 2500, icon: '💰', description: 'Lab, Library & Activities' }
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
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
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

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="dashboard">
            <ConfettiEffect trigger={showConfetti} />
            <div className="dashboard-header">
                <h1> Fee Payments</h1>
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
                            Proceed to Pay
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
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}></button>
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
                                    Pay via UPI
                                </button>
                                <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={() => handleConfirmPayment('card')} disabled={paymentLoading}>
                                    Pay with Card
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
                            <h3> UPI Payment</h3>
                            <button className="modal-close" onClick={() => setShowUPIModal(false)}></button>
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
                                    {paymentLoading ? 'Processing...' : ' I Have Paid'}
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🛡️ System Administration</h1>
                <p className="text-muted">Manage users, institutions, and system settings</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="tabs">
                <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}> Users</button>
                <button className={`tab ${activeTab === 'institutions' ? 'active' : ''}`} onClick={() => setActiveTab('institutions')}> Institutions</button>
                <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}> Payments</button>
                <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}> Logs</button>
                <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}> Statistics</button>
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
                            <button className="modal-close" onClick={() => setEditingUser(null)}></button>
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

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Real-Time Analytics Dashboard
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
                    <h3> Department Performance</h3>
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
                    <h3> Fee Collection Status</h3>
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
                                <div style={{ color: '#38ef7d', fontWeight: 'bold' }}>{((analytics?.feeCollection?.collected || 0) / 100000).toFixed(1)}L</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Collected</div>
                            </div>
                            <div>
                                <div style={{ color: '#f5576c', fontWeight: 'bold' }}>{((analytics?.feeCollection?.pending || 0) / 100000).toFixed(1)}L</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Pending</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Attendance Distribution */}
                <div className="card">
                    <h3> Attendance Distribution</h3>
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
                    <h3> Recent Activity</h3>
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
                <h3> Monthly Trend</h3>
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
                    Export Analytics Report (PDF)
                </button>
            </div>
        </div>
    );
}

// Certificate Generator Page - with pre-existing templates, form editor, and PDF download
function CertificateGeneratorPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [formData, setFormData] = useState({});
    const certRef = useRef(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // Pre-existing certificate templates
    const certTemplates = [
        { id: 'bonafide', name: '📄 Bonafide Certificate', color: '#2b6cb0', border: '#1a4e8a', fields: ['studentName', 'fatherName', 'course', 'department', 'enrollmentYear', 'currentYear', 'studentId', 'purpose'] },
        { id: 'course_completion', name: '🎓 Course Completion Certificate', color: '#667eea', border: '#4a5acf', fields: ['studentName', 'course', 'department', 'startDate', 'endDate', 'grade', 'credits'] },
        { id: 'transfer', name: '📋 Transfer Certificate (TC)', color: '#e53e3e', border: '#c53030', fields: ['studentName', 'fatherName', 'department', 'course', 'enrollmentYear', 'lastDate', 'reason', 'conduct'] },
        { id: 'migration', name: '✈️ Migration Certificate', color: '#805ad5', border: '#6b46c1', fields: ['studentName', 'fatherName', 'course', 'department', 'fromUniversity', 'toUniversity', 'enrollmentYear', 'lastDate'] },
        { id: 'merit', name: '🏆 Merit Certificate', color: '#f6ad55', border: '#e8950a', fields: ['studentName', 'achievement', 'department', 'semester', 'rank', 'year'] },
        { id: 'participation', name: '🤝 Participation Certificate', color: '#48bb78', border: '#2f9e5f', fields: ['studentName', 'eventName', 'eventDate', 'organizer', 'venue'] },
        { id: 'internship', name: '💼 Internship Certificate', color: '#ed64a6', border: '#d53f8c', fields: ['studentName', 'company', 'role', 'duration', 'startDate', 'endDate', 'supervisor'] },
        { id: 'character', name: '⭐ Character Certificate', color: '#319795', border: '#2c7a7b', fields: ['studentName', 'fatherName', 'department', 'enrollmentYear', 'conduct', 'character'] },
        { id: 'study', name: '📚 Study Certificate', color: '#d69e2e', border: '#b7791f', fields: ['studentName', 'fatherName', 'course', 'department', 'fromDate', 'toDate', 'enrollmentYear'] },
        { id: 'medical_fitness', name: '🏥 Medical Fitness Certificate', color: '#38a169', border: '#2f855a', fields: ['studentName', 'fatherName', 'age', 'bloodGroup', 'fitnessStatus', 'remarks'] },
        { id: 'sports', name: '🏅 Sports Certificate', color: '#dd6b20', border: '#c05621', fields: ['studentName', 'sportName', 'eventLevel', 'position', 'eventDate', 'venue', 'year'] },
        { id: 'provisional', name: '🎖️ Provisional Degree Certificate', color: '#553c9a', border: '#44337a', fields: ['studentName', 'fatherName', 'course', 'department', 'enrollmentYear', 'passingYear', 'grade', 'division'] },
    ];

    const fieldLabels = {
        studentName: 'Student Name', course: 'Course / Programme', department: 'Department',
        startDate: 'Start Date', endDate: 'End Date', grade: 'Grade', credits: 'Credits',
        achievement: 'Achievement', semester: 'Semester', rank: 'Rank', year: 'Year',
        eventName: 'Event Name', eventDate: 'Event Date', organizer: 'Organizer', venue: 'Venue',
        company: 'Company Name', role: 'Role/Position', duration: 'Duration', supervisor: 'Supervisor',
        fatherName: "Father's / Guardian's Name", enrollmentYear: 'Enrollment Year', conduct: 'Conduct', character: 'Character',
        studentId: 'Student ID / Roll No.', purpose: 'Purpose', currentYear: 'Current Year of Study',
        lastDate: 'Last Attending Date', reason: 'Reason for Leaving',
        fromUniversity: 'From University', toUniversity: 'To University',
        fromDate: 'Study From Date', toDate: 'Study To Date',
        age: 'Age', bloodGroup: 'Blood Group', fitnessStatus: 'Fitness Status', remarks: 'Remarks',
        sportName: 'Sport / Game', eventLevel: 'Level (School/District/State/National)', position: 'Position / Award',
        passingYear: 'Passing Year', division: 'Division (First/Second/Third)'
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const studentsRes = await api.get('/students');
            setStudents(studentsRes.data.students || []);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        if (selectedTemplate) {
            prefillForm(student, selectedTemplate);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        if (selectedStudent) {
            prefillForm(selectedStudent, template);
        }
    };

    const prefillForm = (student, template) => {
        const today = new Date().toISOString().split('T')[0];
        const data = {};
        template.fields.forEach(field => {
            if (field === 'studentName') data[field] = student.name || '';
            else if (field === 'studentId') data[field] = student.studentId || '';
            else if (field === 'department') data[field] = student.department || '';
            else if (field === 'course') data[field] = student.course || '';
            else if (field === 'enrollmentYear') data[field] = student.enrollmentYear || '';
            else if (field === 'passingYear') data[field] = new Date().getFullYear().toString();
            else if (field === 'currentYear') {
                const enrolled = parseInt(student.enrollmentYear) || new Date().getFullYear();
                data[field] = `${new Date().getFullYear() - enrolled + 1}`;
            }
            else if (field === 'startDate' || field === 'endDate' || field === 'eventDate' || field === 'lastDate' || field === 'fromDate' || field === 'toDate') data[field] = today;
            else if (field === 'year') data[field] = new Date().getFullYear().toString();
            else if (field === 'conduct') data[field] = 'Good';
            else if (field === 'character') data[field] = 'Good';
            else if (field === 'fitnessStatus') data[field] = 'Medically Fit';
            else if (field === 'division') data[field] = 'First';
            else data[field] = '';
        });
        setFormData(data);
    };

    const handleDownloadPDF = () => {
        const printContent = certRef.current;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
 <html><head><title>${selectedTemplate.name} - ${formData.studentName}</title>
 <style>
 @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
 body { margin: 0; padding: 0; }
 @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
 </style></head><body>
 ${printContent.outerHTML}
 <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
 </body></html>
 `);
        printWindow.document.close();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
    };

    const renderCertificate = () => {
        if (!selectedTemplate || !formData.studentName) return null;
        const t = selectedTemplate;
        const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const certId = `CERT-${Date.now().toString(36).toUpperCase()}`;

        return (
            <div ref={certRef} style={{
                width: '800px', minHeight: '580px', margin: '0 auto', padding: '40px',
                background: 'white', color: '#333', fontFamily: "'Inter', sans-serif",
                border: `3px solid ${t.color}`, borderRadius: '0',
                position: 'relative', overflow: 'hidden'
            }}>
                {/* Corner decorations */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '80px', height: '80px', borderTop: `6px solid ${t.color}`, borderLeft: `6px solid ${t.color}` }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', borderTop: `6px solid ${t.color}`, borderRight: `6px solid ${t.color}` }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '80px', height: '80px', borderBottom: `6px solid ${t.color}`, borderLeft: `6px solid ${t.color}` }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '80px', height: '80px', borderBottom: `6px solid ${t.color}`, borderRight: `6px solid ${t.color}` }} />

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: t.color, margin: '0 0 5px', letterSpacing: '2px' }}>PORTAL UNIVERSITY</h2>
                    <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>Blockchain-Verified Academic Records</p>
                </div>

                {/* Divider */}
                <div style={{ width: '200px', height: '2px', background: `linear-gradient(to right, transparent, ${t.color}, transparent)`, margin: '15px auto' }} />

                {/* Title */}
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', textAlign: 'center', color: t.color, margin: '10px 0 5px', textTransform: 'uppercase', letterSpacing: '4px' }}>
                    {{
                        bonafide: 'Bonafide Certificate',
                        course_completion: 'Certificate of Completion',
                        transfer: 'Transfer Certificate',
                        migration: 'Migration Certificate',
                        merit: 'Certificate of Merit',
                        participation: 'Certificate of Participation',
                        internship: 'Internship Certificate',
                        character: 'Character Certificate',
                        study: 'Study Certificate',
                        medical_fitness: 'Medical Fitness Certificate',
                        sports: 'Sports Achievement Certificate',
                        provisional: 'Provisional Degree Certificate'
                    }[t.id]}
                </h1>

                {/* Body */}
                <div style={{ textAlign: 'center', margin: '20px 40px', lineHeight: 1.8, fontSize: '0.95rem' }}>
                    <p>This is to certify that</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: "'Playfair Display', serif", color: t.color, margin: '10px 0', borderBottom: `2px solid ${t.color}`, display: 'inline-block', padding: '0 20px' }}>
                        {formData.studentName}
                    </p>

                    {t.id === 'bonafide' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, bearing Roll No. <strong>{formData.studentId}</strong>, is a bonafide student of this institution, currently studying in <strong>{formData.currentYear}</strong> year of <strong>{formData.course}</strong>, Department of <strong>{formData.department}</strong>, since <strong>{formData.enrollmentYear}</strong>. This certificate is issued for the purpose of <strong>{formData.purpose}</strong>.</p>}
                    {t.id === 'course_completion' && <p>has successfully completed the course <strong>{formData.course}</strong> in the Department of <strong>{formData.department}</strong> with grade <strong>{formData.grade}</strong> earning <strong>{formData.credits}</strong> credits.</p>}
                    {t.id === 'transfer' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, was a student of <strong>{formData.course}</strong>, Department of <strong>{formData.department}</strong>, enrolled in <strong>{formData.enrollmentYear}</strong>. The student attended the institution till <strong>{formData.lastDate}</strong>. Reason for leaving: <strong>{formData.reason}</strong>. Conduct during the period of study: <strong>{formData.conduct}</strong>. No dues are pending against the student.</p>}
                    {t.id === 'migration' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, was a student of <strong>{formData.course}</strong>, Department of <strong>{formData.department}</strong>, at <strong>{formData.fromUniversity}</strong>, enrolled in <strong>{formData.enrollmentYear}</strong>. The student is permitted to migrate to <strong>{formData.toUniversity}</strong>. Last date of attendance: <strong>{formData.lastDate}</strong>.</p>}
                    {t.id === 'merit' && <p>has shown outstanding performance and achieved <strong>{formData.achievement}</strong> with Rank <strong>{formData.rank}</strong> in <strong>{formData.semester}</strong> semester, Department of <strong>{formData.department}</strong>.</p>}
                    {t.id === 'participation' && <p>has actively participated in <strong>{formData.eventName}</strong> organized by <strong>{formData.organizer}</strong> held at <strong>{formData.venue}</strong> on <strong>{formData.eventDate}</strong>.</p>}
                    {t.id === 'internship' && <p>has successfully completed an internship at <strong>{formData.company}</strong> as <strong>{formData.role}</strong> for a duration of <strong>{formData.duration}</strong> under the supervision of <strong>{formData.supervisor}</strong>.</p>}
                    {t.id === 'character' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, Department of <strong>{formData.department}</strong>, enrolled in <strong>{formData.enrollmentYear}</strong>, has maintained <strong>{formData.conduct}</strong> conduct and <strong>{formData.character}</strong> character during the period of study.</p>}
                    {t.id === 'study' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, was a student of <strong>{formData.course}</strong>, Department of <strong>{formData.department}</strong>, enrolled in <strong>{formData.enrollmentYear}</strong>, and has studied in this institution from <strong>{formData.fromDate}</strong> to <strong>{formData.toDate}</strong>.</p>}
                    {t.id === 'medical_fitness' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, aged <strong>{formData.age}</strong> years, Blood Group <strong>{formData.bloodGroup}</strong>, has been examined and found to be <strong>{formData.fitnessStatus}</strong> for participation in academic and institutional activities. Remarks: <strong>{formData.remarks || 'Nil'}</strong>.</p>}
                    {t.id === 'sports' && <p>has represented the institution in <strong>{formData.sportName}</strong> at the <strong>{formData.eventLevel}</strong> level and secured <strong>{formData.position}</strong> position held at <strong>{formData.venue}</strong> on <strong>{formData.eventDate}</strong>, <strong>{formData.year}</strong>.</p>}
                    {t.id === 'provisional' && <p>S/o / D/o <strong>{formData.fatherName}</strong>, has successfully passed the <strong>{formData.course}</strong> examination from the Department of <strong>{formData.department}</strong>, enrolled in <strong>{formData.enrollmentYear}</strong>, passing in <strong>{formData.passingYear}</strong> with <strong>{formData.grade}</strong> grade / <strong>{formData.division}</strong> division. The final degree certificate is under preparation.</p>}
                </div>

                {/* Date and signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', padding: '0 40px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid #999', width: '160px', paddingTop: '8px', fontSize: '0.8rem', color: '#666' }}>Date: {today}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid #999', width: '160px', paddingTop: '8px', fontSize: '0.8rem', color: '#666' }}>Authorized Signatory</div>
                    </div>
                </div>

                {/* Certificate ID */}
                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.7rem', color: '#aaa' }}>
                    Certificate ID: {certId} | Verified via Blockchain
                </div>
            </div>
        );
    };

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="page-container">
            <ConfettiEffect trigger={showConfetti} />
            <div className="page-header">
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Certificate Generator
                </h1>
            </div>

            {!showPreview ? (
                <>
                    {/* Step 1: Choose Template */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Step 1: Choose Certificate Type</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {certTemplates.map(tmpl => (
                                <div
                                    key={tmpl.id}
                                    onClick={() => handleSelectTemplate(tmpl)}
                                    style={{
                                        padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                        border: selectedTemplate?.id === tmpl.id ? `2px solid ${tmpl.color}` : '1px solid var(--border-color)',
                                        background: selectedTemplate?.id === tmpl.id ? `${tmpl.color}15` : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{tmpl.name.split(' ')[0]}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{tmpl.name.split(' ').slice(1).join(' ')}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Select Student */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Step 2: Select Student</h3>
                        <select
                            className="form-control"
                            value={selectedStudent?.studentId || ''}
                            onChange={(e) => {
                                const s = students.find(st => st.studentId === e.target.value);
                                if (s) handleSelectStudent(s);
                            }}
                        >
                            <option value="">-- Select a student --</option>
                            {students.map(s => (
                                <option key={s.studentId} value={s.studentId}>{s.name} ({s.studentId}) - {s.department}</option>
                            ))}
                        </select>
                    </div>

                    {/* Step 3: Fill Details */}
                    {selectedTemplate && selectedStudent && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Step 3: Fill Certificate Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                                {selectedTemplate.fields.map(field => (
                                    <div key={field} className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">{fieldLabels[field] || field}</label>
                                        <input
                                            className="form-control"
                                            type={field.includes('Date') ? 'date' : 'text'}
                                            value={formData[field] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                            placeholder={`Enter ${fieldLabels[field] || field}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <button className="btn btn-primary btn-lg" onClick={() => setShowPreview(true)}>
                                    Preview &amp; Generate PDF
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Certificate Preview */
                <>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => setShowPreview(false)}> Back to Edit</button>
                        <button className="btn btn-primary" onClick={handleDownloadPDF}> Download PDF</button>
                    </div>
                    <div style={{ background: '#f5f5f5', padding: '2rem', borderRadius: '10px', overflowX: 'auto' }}>
                        {renderCertificate()}
                    </div>
                </>
            )}
        </div>
    );
}

// Admin Attendance Marking Page Excel Upload (B) + Period-wise (C)
function AdminAttendancePage() {
    const [activeTab, setActiveTab] = useState('period'); // 'period', 'upload', 'history'
    // Period-wise state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState(1);
    const [subject, setSubject] = useState('');
    const [department, setDepartment] = useState('All');
    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    // Excel upload state
    const [excelData, setExcelData] = useState([]);
    const [excelFile, setExcelFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const PERIODS = [
        { num: 1, time: '9:00 9:50' }, { num: 2, time: '9:50 10:40' },
        { num: 3, time: '10:50 11:40' }, { num: 4, time: '11:40 12:30' },
        { num: 5, time: '1:30 2:20' }, { num: 6, time: '2:20 3:10' },
        { num: 7, time: '3:20 4:10' }, { num: 8, time: '4:10 5:00' }
    ];

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get('/admin/subjects');
                setSubjects(res.data.subjects);
                setDepartments(['All', ...res.data.departments]);
                if (res.data.subjects.length > 0) setSubject(res.data.subjects[0]);
            } catch (err) { console.error('Failed to load subjects'); }
        };
        fetchSubjects();
        fetchHistory();
    }, []);

    useEffect(() => {
        if (activeTab === 'period') fetchStudents();
    }, [department, activeTab]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/attendance/students?department=${department}`);
            setStudents(res.data.students);
            const def = {};
            res.data.students.forEach(s => { def[s.studentId] = 'present'; });
            setAttendance(def);
        } catch (err) { console.error('Failed to load students'); }
        setLoading(false);
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/admin/attendance/records');
            setHistory(res.data.summary || []);
        } catch (err) { /* ignore */ }
    };

    const toggleAttendance = (studentId) => {
        setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === 'present' ? 'absent' : 'present' }));
    };

    const markAll = (status) => {
        const updated = {};
        students.forEach(s => { updated[s.studentId] = status; });
        setAttendance(updated);
    };

    // Period-wise submit
    const handlePeriodSubmit = async () => {
        if (!date || !subject) { setMessage(' Select date and subject'); return; }
        if (students.length === 0) { setMessage(' No students to mark'); return; }
        setSubmitting(true); setMessage('');
        try {
            const records = students.map(s => ({
                studentId: s.studentId, studentName: s.name,
                status: attendance[s.studentId] || 'absent'
            }));
            const res = await api.post('/admin/attendance/mark', { date, subject, department, period, records });
            setMessage(` ${res.data.message}`);
            fetchHistory();
        } catch (err) { setMessage(' Failed to mark attendance'); }
        setSubmitting(false);
    };

    // Excel file handler
    const handleExcelFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setExcelFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet);
                // Normalize column names
                const normalized = data.map(row => {
                    const keys = Object.keys(row);
                    const find = (patterns) => {
                        const k = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
                        return k ? row[k] : '';
                    };
                    return {
                        studentId: find(['studentid', 'student_id', 'rollno', 'roll', 'id']),
                        studentName: find(['name', 'student']),
                        subject: find(['subject', 'course']),
                        date: find(['date']),
                        period: find(['period', 'hour', 'slot']),
                        status: find(['status', 'attendance', 'present'])
                    };
                }).filter(r => r.studentId && r.status);
                setExcelData(normalized);
                if (normalized.length > 0) setMessage(` Parsed ${normalized.length} records from Excel`);
                else setMessage(' No valid records found. Ensure columns: StudentID, Subject, Date, Period, Status');
            } catch (err) {
                setMessage(' Failed to parse Excel file');
                setExcelData([]);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Excel upload submit
    const handleExcelSubmit = async () => {
        if (excelData.length === 0) { setMessage(' No data to upload'); return; }
        setUploading(true); setMessage('');
        try {
            const formData = new FormData();
            formData.append('file', excelFile);
            formData.append('records', JSON.stringify(excelData));
            await api.post('/admin/attendance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(` Uploaded ${excelData.length} attendance records!`);
            setExcelData([]); setExcelFile(null);
            fetchHistory();
        } catch (err) { setMessage(' Upload failed'); }
        setUploading(false);
    };

    // Download Excel template
    const downloadTemplate = () => {
        const template = [
            { StudentID: 'STU2024001', Name: 'John Doe', Subject: 'Mathematics', Date: new Date().toISOString().split('T')[0], Period: 1, Status: 'Present' },
            { StudentID: 'STU2024002', Name: 'Jane Smith', Subject: 'Mathematics', Date: new Date().toISOString().split('T')[0], Period: 1, Status: 'Absent' },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
        XLSX.writeFile(wb, 'attendance_template.xlsx');
    };

    const presentCount = Object.values(attendance).filter(v => v === 'present').length;
    const absentCount = Object.values(attendance).filter(v => v === 'absent').length;

    const tabStyle = (tab) => ({
        padding: '0.65rem 1.25rem', border: 'none', cursor: 'pointer', fontWeight: 600,
        fontSize: '0.9rem', borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
        background: 'transparent', color: activeTab === tab ? '#667eea' : 'inherit', opacity: activeTab === tab ? 1 : 0.6
    });

    return (
        <div className="dashboard" style={{ padding: '1.5rem' }}>
            <div className="dashboard-header" style={{ marginBottom: '1rem' }}>
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Attendance Manager
                </h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.25rem' }}>
                <button style={tabStyle('period')} onClick={() => setActiveTab('period')}> Period-wise</button>
                <button style={tabStyle('upload')} onClick={() => setActiveTab('upload')}> Excel Upload</button>
                <button style={tabStyle('history')} onClick={() => setActiveTab('history')}> History</button>
            </div>

            {message && (
                <div className="card" style={{
                    padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: message.includes('') ? 'rgba(34,197,94,0.15)' : message.includes('') ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                    borderLeft: `4px solid ${message.includes('') ? '#22c55e' : message.includes('') ? '#ef4444' : '#fbbf24'}`
                }}>
                    {message}
                </div>
            )}

            {/* TAB C: Period-wise Attendance */}
            {activeTab === 'period' && (
                <>
                    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}> Date</label>
                                <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}> Period</label>
                                <select className="form-control" value={period} onChange={e => setPeriod(Number(e.target.value))}>
                                    {PERIODS.map(p => <option key={p.num} value={p.num}>Period {p.num} ({p.time})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}> Subject</label>
                                <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)}>
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}> Department</label>
                                <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => markAll('present')} style={{ fontSize: '0.85rem' }}> Mark All Present</button>
                        <button className="btn btn-danger btn-sm" onClick={() => markAll('absent')} style={{ fontSize: '0.85rem' }}> Mark All Absent</button>
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                            {presentCount} P {absentCount} A Total: {students.length}
                        </span>
                    </div>

                    {/* Students Table */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading students...</div>
                            ) : students.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No students found. Register students first.</div>
                            ) : (
                                <table className="table" style={{ width: '100%' }}>
                                    <thead><tr><th style={{ width: '40px' }}>#</th><th>Student ID</th><th>Name</th><th>Dept</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
                                    <tbody>
                                        {students.map((s, idx) => (
                                            <tr key={s.studentId} style={{ background: attendance[s.studentId] === 'absent' ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                                                <td style={{ opacity: 0.5 }}>{idx + 1}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.studentId}</td>
                                                <td style={{ fontWeight: 500 }}>{s.name}</td>
                                                <td style={{ fontSize: '0.85rem', opacity: 0.7 }}>{s.department}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button onClick={() => toggleAttendance(s.studentId)} style={{
                                                        padding: '0.3rem 0.9rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                                        fontWeight: 600, fontSize: '0.8rem', minWidth: '85px', color: '#fff', transition: 'all 0.2s',
                                                        background: attendance[s.studentId] === 'present' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)'
                                                    }}>
                                                        {attendance[s.studentId] === 'present' ? ' P' : ' A'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {students.length > 0 && (
                            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={handlePeriodSubmit} disabled={submitting} style={{ minWidth: '160px', fontWeight: 600 }}>
                                    {submitting ? ' Submitting...' : ` Submit Period ${period}`}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TAB B: Excel Upload */}
            {activeTab === 'upload' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}> Upload Attendance from Excel</h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
                        Upload an Excel (.xlsx) file with columns: <b>StudentID, Name, Subject, Date, Period, Status</b> (Present/Absent or P/A)
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}> Download Template</button>
                    </div>

                    {/* File Input */}
                    <div style={{
                        border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '2rem',
                        textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer',
                        background: 'var(--card-bg)', transition: 'border-color 0.3s'
                    }}
                        onClick={() => document.getElementById('attendance-excel-input')?.click()}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></div>
                        <p style={{ fontWeight: 500, marginBottom: '0.3rem' }}>Click to browse or drag & drop Excel file</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Supports .xlsx, .xls, .csv</p>
                        <input id="attendance-excel-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} />
                    </div>

                    {excelFile && <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}> Selected: <b>{excelFile.name}</b></p>}

                    {/* Preview Table */}
                    {excelData.length > 0 && (
                        <>
                            <h4 style={{ marginBottom: '0.5rem' }}>Preview ({excelData.length} records)</h4>
                            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1rem' }}>
                                <table className="table" style={{ width: '100%' }}>
                                    <thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Subject</th><th>Date</th><th>Period</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {excelData.slice(0, 50).map((r, i) => (
                                            <tr key={i}>
                                                <td style={{ opacity: 0.5 }}>{i + 1}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{r.studentId}</td>
                                                <td>{r.studentName}</td>
                                                <td>{r.subject}</td>
                                                <td>{r.date}</td>
                                                <td>{r.period}</td>
                                                <td><span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                                                    background: r.status?.toLowerCase?.()?.startsWith?.('p') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                                    color: r.status?.toLowerCase?.()?.startsWith?.('p') ? '#22c55e' : '#ef4444'
                                                }}>{r.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button className="btn btn-primary" onClick={handleExcelSubmit} disabled={uploading} style={{ fontWeight: 600 }}>
                                {uploading ? ' Uploading...' : ` Upload ${excelData.length} Records`}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0 }}> Attendance History</h3>
                    </div>
                    <div className="table-container">
                        {history.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No attendance records yet. Mark attendance or upload Excel first.</div>
                        ) : (
                            <table className="table" style={{ width: '100%' }}>
                                <thead><tr><th>Date</th><th>Subject</th><th>Dept</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Total</th><th style={{ textAlign: 'center' }}>%</th></tr></thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>{h.subject}</td>
                                            <td style={{ fontSize: '0.85rem', opacity: 0.7 }}>{h.department}</td>
                                            <td style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{h.present}</td>
                                            <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{h.absent}</td>
                                            <td style={{ textAlign: 'center' }}>{h.total}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{h.total > 0 ? ((h.present / h.total) * 100).toFixed(0) + '%' : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}





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

    if (loading) return <SkeletonLoader rows={3} type="cards" />;

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Workflow & Task Manager
                </h1>
                <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
                    Add Task
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
                    <h4 style={{ marginBottom: '1rem', color: '#667eea' }}> To Do ({getColumn('todo').length})</h4>
                    {getColumn('todo').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => updateTaskStatus(task.id, 'in-progress')}> Start</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteTask(task.id)}></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* In Progress Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#ffd200' }}> In Progress ({getColumn('in-progress').length})</h4>
                    {getColumn('in-progress').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => updateTaskStatus(task.id, 'review')}> Review</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Review Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#f093fb' }}> Review ({getColumn('review').length})</h4>
                    {getColumn('review').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0' }}>{task.description}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => updateTaskStatus(task.id, 'done')}> Done</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Done Column */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#38ef7d' }}> Done ({getColumn('done').length})</h4>
                    {getColumn('done').map(task => (
                        <div key={task.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem', opacity: 0.7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold', textDecoration: 'line-through' }}>{task.title}</div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38ef7d' }}></span>
                            </div>
                            <button className="btn btn-danger btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => deleteTask(task.id)}> Remove</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workflow Templates */}
            <div className="card">
                <h3> Automation Workflows</h3>
                <div className="grid grid-3" style={{ gap: '1rem', marginTop: '1rem' }}>
                    {workflows.map(workflow => (
                        <div key={workflow.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                            <h4>{workflow.name}</h4>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{workflow.description}</p>
                            <div style={{ marginTop: '1rem' }}>
                                {workflow.steps.slice(0, 3).map((step, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        <span style={{ color: step.status === 'completed' ? '#38ef7d' : '#ffd200' }}>
                                            {step.status === 'completed' ? '' : ''}
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

// ==================== ADMIN RESULTS PAGE ====================
function AdminResultsPage() {
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('publish');
    const [form, setForm] = useState({ studentId: '', semester: '', year: new Date().getFullYear(), branch: '', subjects: [{ code: '', name: '', credits: 3, grade: 'A', gradePoints: 9 }] });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [autonomousFile, setAutonomousFile] = useState(null);
    const [autonomousResults, setAutonomousResults] = useState([]);
    const [showJntuhSub, setShowJntuhSub] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [resResults, resStudents] = await Promise.all([
                api.get('/admin/results'),
                api.get('/students')
            ]);
            setResults(resResults.data.results || []);
            setStudents(resStudents.data.students || []);
            // Fetch autonomous results
            try {
                const autoRes = await api.get('/admin/autonomous-results');
                setAutonomousResults(autoRes.data.results || []);
            } catch (e) { /* endpoint may not exist yet */ }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addSubject = () => {
        setForm({ ...form, subjects: [...form.subjects, { code: '', name: '', credits: 3, grade: 'A', gradePoints: 9 }] });
    };

    const removeSubject = (idx) => {
        if (form.subjects.length <= 1) return;
        setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== idx) });
    };

    const updateSubject = (idx, field, value) => {
        const updated = [...form.subjects];
        updated[idx][field] = value;
        if (field === 'grade') {
            const gpMap = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 };
            updated[idx].gradePoints = gpMap[value] || 0;
        }
        setForm({ ...form, subjects: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/admin/results', form);
            setMessage({ type: 'success', text: 'Results published successfully! Student has been notified.' });
            setShowForm(false);
            setForm({ studentId: '', semester: '', year: new Date().getFullYear(), branch: '', subjects: [{ code: '', name: '', credits: 3, grade: 'A', gradePoints: 9 }] });
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to publish results' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this result?')) return;
        try {
            await api.delete(`/admin/results/${id}`);
            setResults(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const handleAutonomousUpload = async (e) => {
        e.preventDefault();
        if (!autonomousFile) {
            setMessage({ type: 'error', text: 'Please select a PDF file to upload' });
            return;
        }
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    await api.post('/admin/autonomous-results', {
                        fileName: autonomousFile.name,
                        fileData: evt.target.result,
                        uploadedAt: new Date().toISOString()
                    });
                    setMessage({ type: 'success', text: 'Autonomous results uploaded successfully! Students can now view and download.' });
                    setAutonomousFile(null);
                    e.target.reset?.();
                    fetchData();
                } catch (err) {
                    setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload results' });
                }
                setSubmitting(false);
            };
            reader.readAsDataURL(autonomousFile);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error reading file' });
            setSubmitting(false);
        }
    };

    const handleDeleteAutonomous = async (id) => {
        if (!window.confirm('Delete this autonomous result file?')) return;
        try {
            await api.delete(`/admin/autonomous-results/${id}`);
            setAutonomousResults(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (loading) return <SkeletonLoader rows={3} />;

    const tabStyle = (tab) => ({
        padding: '0.7rem 1.5rem',
        border: 'none',
        borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
        background: activeTab === tab ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
        color: activeTab === tab ? '#667eea' : 'var(--text-secondary)',
        fontWeight: activeTab === tab ? 700 : 500,
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'all 0.3s ease',
        borderRadius: '8px 8px 0 0'
    });

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📊 Results Management</h1>
                <p className="text-muted">Publish and manage student academic results</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button style={tabStyle('publish')} onClick={() => setActiveTab('publish')}>
                    📝 Publish Results
                </button>
                <button style={tabStyle('autonomous')} onClick={() => setActiveTab('autonomous')}>
                    📄 Autonomous Results
                </button>
                <button style={tabStyle('jntuh')} onClick={() => setActiveTab('jntuh')}>
                    🏫 JNTUH Results
                </button>
            </div>

            {message.text && <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>{message.text}</div>}

            {/* ===== TAB 1: PUBLISH RESULTS ===== */}
            {activeTab === 'publish' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? '✖ Cancel' : '➕ Publish New Results'}
                        </button>
                    </div>

                    {showForm && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3>Publish Results</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Student</label>
                                        <select className="form-control" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} required>
                                            <option value="">Select Student</option>
                                            {students.map(s => <option key={s.studentId} value={s.studentId}>{s.name} ({s.studentId})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Branch</label>
                                        <select className="form-control" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} required>
                                            <option value="">Select Branch</option>
                                            <option value="CSE">CSE - Computer Science</option>
                                            <option value="ECE">ECE - Electronics & Communication</option>
                                            <option value="EEE">EEE - Electrical & Electronics</option>
                                            <option value="MECH">MECH - Mechanical</option>
                                            <option value="CIVIL">CIVIL - Civil Engineering</option>
                                            <option value="IT">IT - Information Technology</option>
                                            <option value="AIDS">AIDS - AI & Data Science</option>
                                            <option value="AIML">AIML - AI & Machine Learning</option>
                                            <option value="CSM">CSM - Computer Science (AI & ML)</option>
                                            <option value="CSD">CSD - Computer Science (Data Science)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Semester</label>
                                        <input type="number" min="1" max="12" className="form-control" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Year</label>
                                        <input type="number" className="form-control" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} required />
                                    </div>
                                </div>

                                <h4 style={{ margin: '1rem 0 0.5rem' }}>Subjects</h4>
                                {form.subjects.map((sub, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.7fr 0.8fr 0.7fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Code</label>
                                            <input className="form-control" placeholder="CS101" value={sub.code} onChange={e => updateSubject(idx, 'code', e.target.value)} required />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Name</label>
                                            <input className="form-control" placeholder="Data Structures" value={sub.name} onChange={e => updateSubject(idx, 'name', e.target.value)} required />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Credits</label>
                                            <input type="number" min="1" max="6" className="form-control" value={sub.credits} onChange={e => updateSubject(idx, 'credits', parseInt(e.target.value) || 0)} required />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Grade</label>
                                            <select className="form-control" value={sub.grade} onChange={e => updateSubject(idx, 'grade', e.target.value)}>
                                                {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'].map(g => <option key={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Points</label>
                                            <input type="number" min="0" max="10" className="form-control" value={sub.gradePoints} onChange={e => updateSubject(idx, 'gradePoints', parseInt(e.target.value) || 0)} required />
                                        </div>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSubject(idx)} style={{ height: '38px' }} title="Remove">🗑</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addSubject} style={{ marginBottom: '1rem' }}>➕ Add Subject</button>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Publishing...' : '📤 Publish Results'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="section">
                        <div className="section-header">
                            <h2 className="section-title">Published Results ({results.length})</h2>
                        </div>
                        {results.length === 0 ? (
                            <div className="card text-center"><p className="text-muted">No results published yet</p></div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Student ID</th>
                                            <th>Branch</th>
                                            <th>Semester</th>
                                            <th>Year</th>
                                            <th>SGPA</th>
                                            <th>Subjects</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map(r => (
                                            <tr key={r.id}>
                                                <td>{r.studentName}</td>
                                                <td><code>{r.studentId}</code></td>
                                                <td><span className="badge badge-info">{r.branch || 'N/A'}</span></td>
                                                <td>Sem {r.semester}</td>
                                                <td>{r.year}</td>
                                                <td><span className="badge badge-success">{r.sgpa}</span></td>
                                                <td>{r.subjects?.length || 0}</td>
                                                <td>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(r.id)} title="Delete">🗑</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ===== TAB 2: AUTONOMOUS RESULTS (PDF UPLOAD) ===== */}
            {activeTab === 'autonomous' && (
                <>
                    <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))' }}>
                        <h3>📄 Upload Autonomous Results (PDF)</h3>
                        <p className="text-muted" style={{ marginBottom: '1rem' }}>Upload student results as PDF files. Students will be able to view and download these files.</p>
                        <form onSubmit={handleAutonomousUpload}>
                            <div className="form-group">
                                <label className="form-label">📎 Select Results PDF</label>
                                <input
                                    type="file"
                                    accept=".pdf,.xlsx,.xls,.csv"
                                    className="form-control"
                                    onChange={e => {
                                        const f = e.target.files[0];
                                        setAutonomousFile(f || null);
                                    }}
                                    style={{ padding: '0.6rem' }}
                                    required
                                />
                                {autonomousFile && (
                                    <small style={{ color: 'var(--success-color)', marginTop: '0.25rem', display: 'block' }}>
                                        ✅ File selected: {autonomousFile.name} ({(autonomousFile.size / 1024).toFixed(1)} KB)
                                    </small>
                                )}
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
                                {submitting ? 'Uploading...' : '📤 Upload Results'}
                            </button>
                        </form>
                    </div>

                    <div className="section">
                        <div className="section-header">
                            <h2 className="section-title">Uploaded Autonomous Results ({autonomousResults.length})</h2>
                        </div>
                        {autonomousResults.length === 0 ? (
                            <div className="card text-center"><p className="text-muted">No autonomous results uploaded yet</p></div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Uploaded At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {autonomousResults.map(r => (
                                            <tr key={r.id}>
                                                <td>📄 {r.fileName}</td>
                                                <td>{new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <a href={r.fileData} download={r.fileName} className="btn btn-primary btn-sm">⬇ Download</a>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteAutonomous(r.id)} title="Delete">🗑</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ===== TAB 3: JNTUH RESULTS ===== */}
            {activeTab === 'jntuh' && (
                <div>
                    <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>🏫 JNTUH Results Portal</h3>
                        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Access JNTUH results and analysis tools</p>

                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Button 1: JNTUH Results By Marks/SGPA */}
                            <a href="https://jntuh-results-analysis.onrender.com/" target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                                    padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white', borderRadius: '16px', textDecoration: 'none', border: 'none',
                                    fontWeight: 600, fontSize: '1rem', minWidth: '200px',
                                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.35)', transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.5)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.35)'; }}
                            >
                                <span style={{ fontSize: '2rem' }}>📊</span>
                                <span>JNTUH Results ↗</span>
                                <small style={{ opacity: 0.8, fontSize: '0.75rem' }}>By Marks / SGPA</small>
                            </a>

                            {/* Button 2: JNTUH Overall Results */}
                            <a href="https://jntuh-markslist-v2-0.onrender.com/" target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                                    padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                    color: 'white', borderRadius: '16px', textDecoration: 'none', border: 'none',
                                    fontWeight: 600, fontSize: '1rem', minWidth: '200px',
                                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.35)', transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.5)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.35)'; }}
                            >
                                <span style={{ fontSize: '2rem' }}>📝</span>
                                <span>JNTUH Overall Results ↗</span>
                                <small style={{ opacity: 0.8, fontSize: '0.75rem' }}>Full Marks List</small>
                            </a>

                            {/* Button 3: JNTUH Regulation Results (Upload) */}
                            <button
                                onClick={() => setShowJntuhSub(!showJntuhSub)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                                    padding: '1.5rem 2rem', background: showJntuhSub ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white', borderRadius: '16px', border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '1rem', minWidth: '200px',
                                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)', transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.5)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.35)'; }}
                            >
                                <span style={{ fontSize: '2rem' }}>📋</span>
                                <span>JNTUH Regulation Results</span>
                                <small style={{ opacity: 0.8, fontSize: '0.75rem' }}>{showJntuhSub ? '▲ Close' : '▼ Upload & Manage'}</small>
                            </button>
                        </div>
                    </div>

                    {/* JNTUH Regulation Results Upload Section */}
                    {showJntuhSub && (
                        <div className="card" style={{ animation: 'fadeInUp 0.3s ease' }}>
                            <h3 style={{ marginBottom: '0.5rem' }}>📋 JNTUH Regulation Results</h3>
                            <p className="text-muted" style={{ marginBottom: '1rem' }}>Upload regulation result files (PDF/Excel). Students can view & download from their Results page.</p>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const fileInput = e.target.querySelector('input[type="file"]');
                                const file = fileInput?.files[0];
                                if (!file) { setMessage({ type: 'error', text: 'Please select a file' }); return; }
                                setSubmitting(true);
                                setMessage({ type: '', text: '' });
                                const reader = new FileReader();
                                reader.onload = async (evt) => {
                                    try {
                                        await api.post('/admin/regulation-results', {
                                            fileName: file.name,
                                            fileData: evt.target.result,
                                            uploadedAt: new Date().toISOString()
                                        });
                                        setMessage({ type: 'success', text: 'Regulation results uploaded! Students can now view & download.' });
                                        fileInput.value = '';
                                        fetchData();
                                    } catch (err) {
                                        setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
                                    }
                                    setSubmitting(false);
                                };
                                reader.readAsDataURL(file);
                            }}>
                                <div className="form-group">
                                    <label className="form-label">📎 Select Regulation Results File</label>
                                    <input type="file" accept=".pdf,.xlsx,.xls,.csv" className="form-control" style={{ padding: '0.6rem' }} required />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
                                    {submitting ? 'Uploading...' : '📤 Upload Regulation Results'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


// ==================== ADMIN NOTIFICATIONS PAGE ====================
function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', type: 'notice', description: '', attachment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (evt) => {
                setForm(prev => ({ ...prev, attachment: evt.target.result }));
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please upload a PDF file only.');
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMsg({ type: '', text: '' });
        try {
            await api.post('/admin/notifications', {
                title: form.title,
                message: form.message,
                type: form.type,
                description: form.description,
                attachment: form.attachment || null
            });
            setMsg({ type: 'success', text: 'Notification published to all students!' });
            setShowForm(false);
            setForm({ title: '', message: '', type: 'notice', description: '', attachment: '' });
            fetchNotifications();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to publish notification' });
        } finally {
            setSubmitting(false);
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

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1>🔔 Manage Notifications</h1>
                        <p className="text-muted">Send announcements and alerts to students</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✖ Cancel' : '➕ New Notification'}
                    </button>
                </div>
            </div>

            {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3>Create Notification</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input type="text" className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Exam Schedule Released" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea className="form-control" rows="3" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Detailed notification message..." required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description / Additional Details</label>
                            <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional detailed description of the notification data..." />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="notice">📋 Notice</option>
                                    <option value="important">⚠ Important</option>
                                    <option value="urgent">🚨 Urgent</option>
                                    <option value="event">🎉 Event</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📎 Attach PDF (optional)</label>
                                <input type="file" accept=".pdf" className="form-control" onChange={handleFileChange} style={{ padding: '0.6rem' }} />
                                {form.attachment && <small style={{ color: 'var(--success-color)', marginTop: '0.25rem', display: 'block' }}>✅ PDF attached</small>}
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Sending...' : '📤 Publish Notification'}
                        </button>
                    </form>
                </div>
            )}

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">All Notifications ({notifications.length})</h2>
                </div>
                {notifications.length === 0 ? (
                    <div className="card text-center"><p className="text-muted">No notifications yet</p></div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className="card" style={{ marginBottom: '0.75rem', borderLeft: `4px solid var(--${getTypeColor(n.type)})` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{n.title}</h4>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{n.message}</p>
                                    <small className="text-muted">
                                        {new Date(n.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {n.createdBy && ` • by ${n.createdBy}`}
                                    </small>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className={`badge badge-${getTypeColor(n.type)}`}>{n.type}</span>
                                    {n.read && <span className="badge badge-secondary">Read</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ==================== ADMIN GRIEVANCES PAGE ====================
function AdminGrievancesPage() {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [respondingTo, setRespondingTo] = useState(null);
    const [responseForm, setResponseForm] = useState({ status: '', response: '' });
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => { fetchGrievances(); }, []);

    const fetchGrievances = async () => {
        try {
            const res = await api.get('/admin/grievances');
            setGrievances(res.data.grievances || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (id) => {
        if (!responseForm.status && !responseForm.response) {
            setMsg({ type: 'error', text: 'Please provide a status or response' });
            return;
        }
        try {
            const res = await api.put(`/admin/grievances/${id}`, responseForm);
            setGrievances(prev => prev.map(g => g.id === id ? res.data.grievance : g));
            setRespondingTo(null);
            setResponseForm({ status: '', response: '' });
            setMsg({ type: 'success', text: 'Grievance updated! Student has been notified.' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'success';
            case 'in-progress': return 'warning';
            default: return 'error';
        }
    };

    const filtered = filter === 'all' ? grievances : grievances.filter(g => g.status === filter);
    const counts = { all: grievances.length, pending: grievances.filter(g => g.status === 'pending').length, 'in-progress': grievances.filter(g => g.status === 'in-progress').length, resolved: grievances.filter(g => g.status === 'resolved').length };

    if (loading) return <SkeletonLoader rows={3} />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📨 Student Grievances</h1>
                <p className="text-muted">View and respond to student complaints</p>
            </div>

            {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--primary)' : 'none' }}>
                    <div className="stat-value">{counts.all}</div>
                    <div className="stat-label">Total</div>
                </div>
                <div className="stat-card error" onClick={() => setFilter('pending')} style={{ cursor: 'pointer', border: filter === 'pending' ? '2px solid var(--error)' : 'none' }}>
                    <div className="stat-value">{counts.pending}</div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card warning" onClick={() => setFilter('in-progress')} style={{ cursor: 'pointer', border: filter === 'in-progress' ? '2px solid var(--warning)' : 'none' }}>
                    <div className="stat-value">{counts['in-progress']}</div>
                    <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card success" onClick={() => setFilter('resolved')} style={{ cursor: 'pointer', border: filter === 'resolved' ? '2px solid var(--success)' : 'none' }}>
                    <div className="stat-value">{counts.resolved}</div>
                    <div className="stat-label">Resolved</div>
                </div>
            </div>

            <div className="section">
                {filtered.length === 0 ? (
                    <div className="card text-center"><p className="text-muted">No grievances found</p></div>
                ) : (
                    filtered.map(g => (
                        <div key={g.id} className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid var(--${getStatusColor(g.status)})` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        <span className="badge badge-secondary">{g.category}</span>
                                        <span className={`badge badge-${getStatusColor(g.status)}`}>{g.status.toUpperCase()}</span>
                                    </div>
                                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{g.subject}</h4>
                                    <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{g.description}</p>
                                    <small className="text-muted">
                                        👤 {g.studentName} ({g.studentId}) &bull; Filed: {g.createdAt}
                                    </small>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {g.status !== 'resolved' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => { setRespondingTo(respondingTo === g.id ? null : g.id); setResponseForm({ status: g.status === 'pending' ? 'in-progress' : 'resolved', response: '' }); }}>
                                            {respondingTo === g.id ? 'Cancel' : '✏ Respond'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {g.response && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <strong>✅ Admin Response:</strong> {g.response}
                                    {g.resolvedAt && <small className="text-muted"> (Resolved: {g.resolvedAt})</small>}
                                </div>
                            )}

                            {respondingTo === g.id && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Update Status</label>
                                        <select className="form-control" value={responseForm.status} onChange={e => setResponseForm({ ...responseForm, status: e.target.value })}>
                                            <option value="pending">Pending</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Response Message</label>
                                        <textarea className="form-control" rows="2" value={responseForm.response} onChange={e => setResponseForm({ ...responseForm, response: e.target.value })} placeholder="Your response to the student..." />
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleRespond(g.id)}>📤 Send Response</button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Full-page AI Chatbot Component
function ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [subject, setSubject] = useState('General');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        api.get('/chat/history').then(res => {
            setMessages(res.data.history);
        }).catch(() => { });
    }, []);

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>💬 Help Desk</h2>
                    <small style={{ opacity: 0.9 }}>Ask your queries & doubts about app features!</small>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                        className="form-control"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        style={{ width: 'auto', fontSize: '0.9rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }}
                    >
                        <option style={{ color: '#333' }}>General</option>
                        <option style={{ color: '#333' }}>Data Structures</option>
                        <option style={{ color: '#333' }}>OOP</option>
                        <option style={{ color: '#333' }}>Mathematics</option>
                        <option style={{ color: '#333' }}>Physics</option>
                        <option style={{ color: '#333' }}>Digital Electronics</option>
                    </select>
                    <Link to="/dashboard" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', textDecoration: 'none' }} title="Close chat">✖</Link>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderTop: 'none',
                borderBottom: 'none'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
                        <h3>Welcome to Help Desk!</h3>
                        <p>Ask about app features, results, attendance, settings, or anything else</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                            {['How to check results?', 'How to view attendance?', 'How to download certificate?', 'How to pay fees?', 'How to change password?', 'How to file grievance?'].map(q => (
                                <button
                                    key={q}
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => { setInput(q); }}
                                    style={{ borderRadius: '20px' }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: msg.sender === 'user'
                                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                                : 'var(--bg-tertiary)',
                            color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5'
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
                        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '18px 18px 18px 4px' }}>
                            <span className="typing-dots">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '1rem 1.5rem',
                borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderTop: 'none'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Type your question here..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        disabled={loading}
                        style={{ fontSize: '1rem' }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        style={{ minWidth: '52px', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '52px', height: '52px', padding: 0 }}
                        title="Send message (Enter)"
                    >
                        {loading ? '⏳' : '➤'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main App Component with Sidebar Layout
function App() {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

    // Auto-close sidebar on mobile when window resizes
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Global ripple effect on all .btn clicks
    useEffect(() => {
        const handler = (e) => {
            const btn = e.target.closest('.btn');
            if (btn) addRipple(e, btn);
        };
        document.addEventListener('click', handler);

        // Apply saved theme on mount
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        return () => document.removeEventListener('click', handler);
    }, []);

    // Global 3D tilt, gradient borders, and scroll-reveal effects
    useEffect(() => {
        const maxTilt = 8;

        // Apply 3D tilt to an element
        const applyTilt = (el) => {
            if (el.dataset.tiltApplied) return;
            el.dataset.tiltApplied = 'true';
            el.classList.add('card-tilt');
            const handleMove = (e) => {
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -maxTilt;
                const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            };
            const handleLeave = () => {
                el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            };
            el.addEventListener('mousemove', handleMove);
            el.addEventListener('mouseleave', handleLeave);
        };

        // Apply scroll-reveal using IntersectionObserver
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // Scan + apply effects to all matching elements
        const applyEffects = () => {
            // 3D tilt + gradient border on stat cards
            document.querySelectorAll('.stat-card').forEach(el => {
                applyTilt(el);
                if (!el.classList.contains('gradient-border')) el.classList.add('gradient-border');
            });
            // Scroll reveal on sections
            document.querySelectorAll('.section, .dashboard-header, .page-header, .stats-grid').forEach(el => {
                if (!el.dataset.revealApplied) {
                    el.dataset.revealApplied = 'true';
                    el.classList.add('scroll-reveal');
                    revealObserver.observe(el);
                }
            });
        };

        // Run on mount + watch for DOM changes (route navigation)
        applyEffects();
        const observer = new MutationObserver(() => applyEffects());
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            revealObserver.disconnect();
        };
    }, []);

    return (
        <AuthProvider>
            <Router>
                <AppInner sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            </Router>
        </AuthProvider>
    );
}

function AppInner({ sidebarOpen, setSidebarOpen }) {
    const isMobile = window.innerWidth <= 768;

    // Close sidebar on link click (mobile only)
    const handleNavClick = () => {
        if (window.innerWidth <= 768) setSidebarOpen(false);
    };

    return (
        <div className="app-layout">
            {/* Dark overlay to close sidebar on mobile */}
            {sidebarOpen && window.innerWidth <= 768 && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onNavClick={handleNavClick} />
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
                        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute roles={['student']}><PageWrapper><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><PageWrapper><SettingsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/attendance" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminAttendancePage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminAnalyticsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/certificates" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><CertificateGeneratorPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/workflows" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><WorkflowManagerPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/results" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminResultsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/notifications-manage" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminNotificationsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin/grievances" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminGrievancesPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute roles={['student']}><PageWrapper><NotificationsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/results" element={<ProtectedRoute roles={['student']}><PageWrapper><ResultsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/attendance" element={<ProtectedRoute roles={['student']}><PageWrapper><AttendancePage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/papers" element={<ProtectedRoute roles={['student']}><PageWrapper><PapersPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/schedule" element={<ProtectedRoute roles={['student']}><PageWrapper><SchedulePage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/assignments" element={<ProtectedRoute roles={['student']}><PageWrapper><AssignmentsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/grievances" element={<ProtectedRoute roles={['student']}><PageWrapper><GrievancesPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/events" element={<ProtectedRoute roles={['student']}><PageWrapper><EventsPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/fees" element={<ProtectedRoute roles={['student']}><PageWrapper><PaymentPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/payments" element={<ProtectedRoute roles={['student']}><PageWrapper><PaymentPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/idcard" element={<ProtectedRoute roles={['student']}><PageWrapper><IDCardPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/certificates" element={<ProtectedRoute roles={['student']}><PageWrapper><CertificatesPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute roles={['admin', 'institution']}><PageWrapper><AdminPage /></PageWrapper></ProtectedRoute>} />
                        <Route path="/chatbot" element={<ProtectedRoute roles={['student']}><PageWrapper><ChatbotPage /></PageWrapper></ProtectedRoute>} />
                    </Routes>
                </div>
            </div>
            <MobileBottomNavWrapper />
        </div>
    );
}

function MobileBottomNavWrapper() {
    const { user } = useAuth();
    if (!user) return null;
    return <MobileBottomNav role={user.role} />;
}

export default App;


