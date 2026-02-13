require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { generateEnhancedAIResponse } = require('./aiChatbot');
const nodemailer = require('nodemailer');

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = {};

// Email system - supports multiple providers
let emailTransporter = null;
let emailReady = false;
let senderEmail = '';
let emailProvider = '';
let resendApiKey = null;

// Auto-initialize email based on what's configured in .env
async function initEmailTransporter() {

  // Provider 1: Resend API (just needs RESEND_API_KEY)
  if (process.env.RESEND_API_KEY) {
    resendApiKey = process.env.RESEND_API_KEY;
    senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    emailProvider = 'Resend';
    emailReady = true;
    console.log(`\n📧 Email configured with Resend API`);
    console.log(`   Sender: ${senderEmail}\n`);
    return;
  }

  // Provider 2: Brevo SMTP (needs BREVO_SMTP_KEY)
  if (process.env.BREVO_SMTP_KEY) {
    emailTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_LOGIN || process.env.SMTP_EMAIL,
        pass: process.env.BREVO_SMTP_KEY
      }
    });
    senderEmail = process.env.SENDER_EMAIL || process.env.BREVO_LOGIN || process.env.SMTP_EMAIL;
    emailProvider = 'Brevo';
    emailReady = true;
    console.log(`\n📧 Email configured with Brevo SMTP`);
    console.log(`   Sender: ${senderEmail}\n`);
    return;
  }

  // Provider 3: Gmail SMTP (needs SMTP_EMAIL + SMTP_PASSWORD)
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD &&
    process.env.SMTP_EMAIL !== 'your-gmail@gmail.com') {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
    senderEmail = process.env.SMTP_EMAIL;
    emailProvider = 'Gmail';
    emailReady = true;
    console.log(`\n📧 Email configured with Gmail: ${senderEmail}\n`);
    return;
  }

  // Fallback: Auto-create Ethereal test account (zero config)
  try {
    const testAccount = await nodemailer.createTestAccount();
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    senderEmail = testAccount.user;
    emailProvider = 'Ethereal';
    emailReady = true;
    console.log(`\n📧 Auto-configured email (Ethereal test account)`);
    console.log(`   Sender: ${testAccount.user}`);
    console.log(`   View sent emails at: https://ethereal.email/login`);
    console.log(`   Login: ${testAccount.user} / ${testAccount.pass}\n`);
  } catch (err) {
    console.log(`\n⚠️ Could not setup email: ${err.message}. OTP will be shown on screen.\n`);
    emailReady = false;
  }
}

// Send email function - handles both Nodemailer and Resend
async function sendEmail(mailOptions) {
  if (emailProvider === 'Resend') {
    // Use Resend REST API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: mailOptions.from,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html
      })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Resend API error: ${response.status}`);
    }
    return { provider: 'Resend' };
  } else {
    // Use Nodemailer (Gmail, Brevo, Ethereal)
    const info = await emailTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    return { provider: emailProvider, previewUrl };
  }
}

// Initialize email on startup
initEmailTransporter();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'papers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for PDF uploads
const paperStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, uniqueName);
  }
});
const uploadPaper = multer({
  storage: paperStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// In-memory database (simulating PostgreSQL/MongoDB)
const db = {
  users: [],
  students: [],
  records: [],
  institutions: [],
  blockchainTransactions: [],
  notifications: [],
  results: [],
  attendance: [],
  papers: [],
  assignments: [],
  timetable: [],
  grievances: [],
  events: [],
  certificates: [],
  chatHistory: [],
  // New admin features
  tasks: [],
  workflows: [],
  certificateTemplates: [],
  activityLog: [],
  // Paper engagement tracking
  paperBookmarks: [],
  paperRatings: []
};

// Initialize demo data
function initDemoData() {
  // Demo admin user
  const adminPassword = bcrypt.hashSync('admin123', 10); //password is here
  db.users.push({
    id: uuidv4(),
    email: 'admin@university.edu',
    password: adminPassword,
    role: 'admin',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91',
    name: 'System Administrator',
    createdAt: new Date().toISOString()
  });

  // Demo institution
  const institutionId = uuidv4();
  db.institutions.push({
    id: institutionId,
    name: 'State University',
    code: 'SU001',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91',
    verified: true,
    createdAt: new Date().toISOString()
  });

  // Demo institution user
  const institutionPassword = bcrypt.hashSync('institution123', 10);
  db.users.push({
    id: uuidv4(),
    email: 'institution@university.edu',
    password: institutionPassword,
    role: 'institution',
    institutionId: institutionId,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91',
    name: 'State University Admin',
    createdAt: new Date().toISOString()
  });

  // Demo student user
  const studentPassword = bcrypt.hashSync('student123', 10);
  const studentId = uuidv4();
  db.users.push({
    id: studentId,
    email: 'student@university.edu',
    password: studentPassword,
    role: 'student',
    walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    name: 'John Doe',
    studentId: 'STU2024001',
    createdAt: new Date().toISOString()
  });

  // Demo student record
  const recordHash = generateHash(JSON.stringify({
    studentId: 'STU2024001',
    name: 'John Doe',
    course: 'Computer Science',
    grade: 'A',
    year: 2024
  }));

  db.students.push({
    id: studentId,
    studentId: 'STU2024001',
    name: 'John Doe',
    email: 'student@university.edu',
    course: 'Computer Science',
    department: 'Engineering',
    enrollmentYear: 2024,
    walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    institutionId: db.institutions[0].id,
    aadhaarNumber: '1234-5678-9012',
    apaarId: 'APAAR2024001',
    dob: '2002-05-15',
    admissionType: 'counselling',
    profilePicture: null,
    createdAt: new Date().toISOString()
  });

  db.records.push({
    id: uuidv4(),
    studentId: 'STU2024001',
    type: 'transcript',
    title: 'Semester 1 Transcript',
    description: 'Academic transcript for semester 1',
    dataHash: recordHash,
    ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex'),
    verified: true,
    createdAt: new Date().toISOString(),
    issuedBy: db.institutions[0].id
  });

  // Demo notifications
  db.notifications.push(
    {
      id: uuidv4(),
      title: '📢 Mid-Semester Exams Schedule Released',
      message: 'The mid-semester examination schedule for all departments has been released. Please check the exam portal for your individual timetable. Exams begin from 25th February.',
      type: 'important',
      date: new Date().toISOString(),
      read: false
    },
    {
      id: uuidv4(),
      title: '🏆 Annual Sports Day Registration Open',
      message: 'Registration for Annual Sports Day 2024 is now open. Students can register for various events including athletics, cricket, football, and indoor games. Last date: 20th February.',
      type: 'event',
      date: new Date(Date.now() - 86400000).toISOString(),
      read: false
    },
    {
      id: uuidv4(),
      title: '💳 Fee Payment Reminder',
      message: 'This is a reminder that the last date for payment of semester fees is 28th February. Late payment will attract a fine of ₹500 per day.',
      type: 'urgent',
      date: new Date(Date.now() - 172800000).toISOString(),
      read: true
    },
    {
      id: uuidv4(),
      title: '📚 Library Books Return Notice',
      message: 'All borrowed library books must be returned before the semester exams. Students with pending books will not be issued hall tickets.',
      type: 'notice',
      date: new Date(Date.now() - 259200000).toISOString(),
      read: true
    }
  );

  // Demo results for student
  db.results.push(
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      semester: 1,
      subjects: [
        { code: 'CS101', name: 'Programming Fundamentals', credits: 4, grade: 'A', gradePoints: 9 },
        { code: 'CS102', name: 'Digital Logic Design', credits: 3, grade: 'A+', gradePoints: 10 },
        { code: 'MA101', name: 'Engineering Mathematics I', credits: 4, grade: 'B+', gradePoints: 8 },
        { code: 'PH101', name: 'Engineering Physics', credits: 3, grade: 'A', gradePoints: 9 },
        { code: 'EN101', name: 'Technical English', credits: 2, grade: 'A+', gradePoints: 10 }
      ],
      sgpa: 9.0,
      totalCredits: 16,
      year: 2024
    },
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      semester: 2,
      subjects: [
        { code: 'CS201', name: 'Data Structures', credits: 4, grade: 'A+', gradePoints: 10 },
        { code: 'CS202', name: 'Object Oriented Programming', credits: 3, grade: 'A', gradePoints: 9 },
        { code: 'MA201', name: 'Engineering Mathematics II', credits: 4, grade: 'A', gradePoints: 9 },
        { code: 'EC201', name: 'Basic Electronics', credits: 3, grade: 'B+', gradePoints: 8 },
        { code: 'HS201', name: 'Professional Ethics', credits: 2, grade: 'A', gradePoints: 9 }
      ],
      sgpa: 9.2,
      totalCredits: 16,
      year: 2024
    }
  );

  // Demo attendance
  db.attendance.push(
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      month: 'January',
      year: 2025,
      totalDays: 22,
      presentDays: 20,
      absentDays: 2,
      percentage: 90.9
    },
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      month: 'February',
      year: 2025,
      totalDays: 18,
      presentDays: 16,
      absentDays: 2,
      percentage: 88.9
    },
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      month: 'December',
      year: 2024,
      totalDays: 20,
      presentDays: 19,
      absentDays: 1,
      percentage: 95.0
    },
    {
      id: uuidv4(),
      studentId: 'STU2024001',
      month: 'November',
      year: 2024,
      totalDays: 24,
      presentDays: 22,
      absentDays: 2,
      percentage: 91.7
    }
  );

  // Papers are now uploaded by admin via /admin/papers/upload

  // Demo assignments
  db.assignments.push(
    { id: uuidv4(), studentId: 'STU2024001', subject: 'Data Structures', title: 'Binary Tree Implementation', description: 'Implement BST with all operations', dueDate: '2025-02-15', status: 'pending', submittedAt: null, grade: null, feedback: null },
    { id: uuidv4(), studentId: 'STU2024001', subject: 'OOP', title: 'Design Patterns Project', description: 'Implement Singleton and Factory patterns', dueDate: '2025-02-10', status: 'submitted', submittedAt: '2025-02-08', grade: 'A', feedback: 'Excellent implementation!' },
    { id: uuidv4(), studentId: 'STU2024001', subject: 'Mathematics', title: 'Linear Algebra Problems', description: 'Solve problems from Chapter 5', dueDate: '2025-02-20', status: 'pending', submittedAt: null, grade: null, feedback: null },
    { id: uuidv4(), studentId: 'STU2024001', subject: 'Data Structures', title: 'Graph Algorithms', description: 'Implement BFS and DFS', dueDate: '2025-01-25', status: 'graded', submittedAt: '2025-01-24', grade: 'A+', feedback: 'Outstanding work!' }
  );

  // Demo timetable
  db.timetable.push(
    { id: uuidv4(), studentId: 'STU2024001', day: 'Monday', time: '09:00 AM', subject: 'Data Structures', faculty: 'Dr. Sharma', room: 'CS-101' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Monday', time: '10:00 AM', subject: 'OOP Lab', faculty: 'Prof. Kumar', room: 'Lab-2' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Monday', time: '11:30 AM', subject: 'Mathematics', faculty: 'Dr. Gupta', room: 'MA-201' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Tuesday', time: '09:00 AM', subject: 'Digital Electronics', faculty: 'Prof. Singh', room: 'EC-101' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Tuesday', time: '11:00 AM', subject: 'Data Structures Lab', faculty: 'Dr. Sharma', room: 'Lab-1' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Wednesday', time: '09:00 AM', subject: 'OOP', faculty: 'Prof. Kumar', room: 'CS-102' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Wednesday', time: '02:00 PM', subject: 'Physics', faculty: 'Dr. Verma', room: 'PH-101' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Thursday', time: '10:00 AM', subject: 'Mathematics', faculty: 'Dr. Gupta', room: 'MA-201' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Thursday', time: '02:00 PM', subject: 'Technical English', faculty: 'Mrs. Reddy', room: 'EN-101' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Friday', time: '09:00 AM', subject: 'Data Structures', faculty: 'Dr. Sharma', room: 'CS-101' },
    { id: uuidv4(), studentId: 'STU2024001', day: 'Friday', time: '11:00 AM', subject: 'OOP', faculty: 'Prof. Kumar', room: 'CS-102' }
  );

  // Demo grievances
  db.grievances.push(
    { id: uuidv4(), studentId: 'STU2024001', category: 'Academic', subject: 'Incorrect Grade Entry', description: 'My CS201 grade shows as B but it should be A as per marks.', status: 'resolved', createdAt: '2025-01-15', resolvedAt: '2025-01-18', response: 'Grade has been corrected. Please check your updated result.' },
    { id: uuidv4(), studentId: 'STU2024001', category: 'Hostel', subject: 'Water Supply Issue', description: 'No water supply in Block B for 2 days.', status: 'in-progress', createdAt: '2025-02-01', resolvedAt: null, response: 'Maintenance team has been notified. Will be fixed by tomorrow.' },
    { id: uuidv4(), studentId: 'STU2024001', category: 'Infrastructure', subject: 'AC not working in Lab-1', description: 'The air conditioner in Lab-1 is not working properly.', status: 'pending', createdAt: '2025-02-05', resolvedAt: null, response: null }
  );

  // Demo events
  db.events.push(
    { id: uuidv4(), title: 'Tech Fest 2025', description: 'Annual technical festival with competitions, workshops and exhibitions.', date: '2025-03-15', time: '09:00 AM', venue: 'Main Auditorium', category: 'Cultural', registrationOpen: true, registered: [] },
    { id: uuidv4(), title: 'Web Development Workshop', description: 'Learn React.js and Node.js from industry experts.', date: '2025-02-20', time: '10:00 AM', venue: 'Seminar Hall-1', category: 'Workshop', registrationOpen: true, registered: ['STU2024001'] },
    { id: uuidv4(), title: 'Campus Placement Drive - TCS', description: 'TCS campus recruitment for 2025 batch.', date: '2025-02-25', time: '09:00 AM', venue: 'Placement Cell', category: 'Placement', registrationOpen: true, registered: [] },
    { id: uuidv4(), title: 'Annual Sports Meet', description: 'Inter-departmental sports competition.', date: '2025-03-01', time: '08:00 AM', venue: 'Sports Ground', category: 'Sports', registrationOpen: false, registered: ['STU2024001'] },
    { id: uuidv4(), title: 'AI/ML Seminar', description: 'Guest lecture on Artificial Intelligence and Machine Learning.', date: '2025-02-18', time: '02:00 PM', venue: 'Conference Hall', category: 'Seminar', registrationOpen: true, registered: [] }
  );

  // Demo certificates
  db.certificates.push(
    { id: uuidv4(), studentId: 'STU2024001', title: 'Academic Excellence Award', type: 'Achievement', description: 'For securing 9.2 CGPA in Semester 2', issuedDate: '2024-12-15', blockchainHash: '0x1a2b3c4d5e6f...', verified: true },
    { id: uuidv4(), studentId: 'STU2024001', title: 'Web Development Workshop', type: 'Participation', description: 'Successfully completed 2-day workshop on MERN Stack', issuedDate: '2024-11-20', blockchainHash: '0x7g8h9i0j1k2l...', verified: true },
    { id: uuidv4(), studentId: 'STU2024001', title: 'Hackathon Winner', type: 'Achievement', description: 'First place in Inter-College Hackathon 2024', issuedDate: '2024-10-10', blockchainHash: '0x3m4n5o6p7q8r...', verified: true },
    { id: uuidv4(), studentId: 'STU2024001', title: 'NSS Volunteer', type: 'Service', description: 'Completed 120 hours of community service', issuedDate: '2024-09-05', blockchainHash: '0x9s0t1u2v3w4x...', verified: true }
  );
}

// Helper function to generate SHA-256 hash
function generateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role-based access middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ==================== AUTH ROUTES ====================

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, walletAddress } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role: role || 'student',
      walletAddress: walletAddress || null,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        walletAddress: newUser.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wallet login
app.post('/api/auth/wallet-login', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    let user = db.users.find(u =>
      u.walletAddress && u.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (!user) {
      // Create new user for this wallet
      user = {
        id: uuidv4(),
        email: null,
        password: null,
        name: `User ${walletAddress.slice(0, 8)}`,
        role: 'student',
        walletAddress: walletAddress,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Wallet login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    walletAddress: user.walletAddress
  });
});

// ==================== STUDENT ROUTES ====================

// Register student
app.post('/api/student/register', authenticateToken, requireRole('admin', 'institution'), async (req, res) => {
  try {
    const { studentId, name, email, course, department, enrollmentYear, walletAddress } = req.body;

    if (!studentId || !name || !email) {
      return res.status(400).json({ error: 'Student ID, name, and email are required' });
    }

    // Check if student exists
    const existingStudent = db.students.find(s => s.studentId === studentId);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student already exists' });
    }

    const newStudent = {
      id: uuidv4(),
      studentId,
      name,
      email,
      course: course || '',
      department: department || '',
      enrollmentYear: enrollmentYear || new Date().getFullYear(),
      walletAddress: walletAddress || null,
      institutionId: req.user.institutionId || db.institutions[0]?.id,
      createdAt: new Date().toISOString()
    };

    db.students.push(newStudent);

    // Generate hash for blockchain
    const dataHash = generateHash(JSON.stringify(newStudent));

    res.status(201).json({
      message: 'Student registered successfully',
      student: newStudent,
      dataHash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload students from Excel
app.post('/api/student/bulk-upload', authenticateToken, requireRole('admin', 'institution'), async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Students array is required' });
    }

    const results = {
      success: [],
      failed: [],
      total: students.length
    };

    for (const studentData of students) {
      try {
        const { studentId, name, email, course, department, enrollmentYear } = studentData;

        // Validate required fields
        if (!studentId || !name || !email) {
          results.failed.push({
            studentId: studentId || 'Unknown',
            error: 'Missing required fields (studentId, name, email)'
          });
          continue;
        }

        // Check if student already exists
        const existingStudent = db.students.find(s => s.studentId === studentId);
        if (existingStudent) {
          // Update existing student
          existingStudent.name = name;
          existingStudent.email = email;
          existingStudent.course = course || existingStudent.course;
          existingStudent.department = department || existingStudent.department;
          existingStudent.enrollmentYear = enrollmentYear || existingStudent.enrollmentYear;
          existingStudent.updatedAt = new Date().toISOString();

          results.success.push({
            studentId,
            name,
            action: 'updated'
          });
        } else {
          // Create new student
          const newStudent = {
            id: uuidv4(),
            studentId,
            name,
            email,
            course: course || '',
            department: department || '',
            enrollmentYear: enrollmentYear || new Date().getFullYear(),
            walletAddress: null,
            institutionId: req.user.institutionId || db.institutions[0]?.id,
            createdAt: new Date().toISOString()
          };

          db.students.push(newStudent);
          results.success.push({
            studentId,
            name,
            action: 'created'
          });
        }
      } catch (err) {
        results.failed.push({
          studentId: studentData.studentId || 'Unknown',
          error: err.message
        });
      }
    }

    res.status(200).json({
      message: `Processed ${results.total} students: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload student record
app.post('/api/student/uploadRecord', authenticateToken, requireRole('admin', 'institution'), async (req, res) => {
  try {
    const { studentId, type, title, description, data } = req.body;

    if (!studentId || !type || !title) {
      return res.status(400).json({ error: 'Student ID, type, and title are required' });
    }

    // Check if student exists
    const student = db.students.find(s => s.studentId === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Generate hashes
    const dataHash = generateHash(JSON.stringify({ studentId, type, title, data, timestamp: Date.now() }));
    const ipfsHash = 'Qm' + crypto.randomBytes(22).toString('hex'); // Simulated IPFS hash
    const blockchainTxHash = '0x' + crypto.randomBytes(32).toString('hex'); // Simulated blockchain tx

    const newRecord = {
      id: uuidv4(),
      studentId,
      type,
      title,
      description: description || '',
      data: data || {},
      dataHash,
      ipfsHash,
      blockchainTxHash,
      verified: true,
      createdAt: new Date().toISOString(),
      issuedBy: req.user.id
    };

    db.records.push(newRecord);

    // Store blockchain transaction
    db.blockchainTransactions.push({
      id: uuidv4(),
      txHash: blockchainTxHash,
      recordId: newRecord.id,
      dataHash,
      ipfsHash,
      action: 'STORE_RECORD',
      walletAddress: req.user.walletAddress,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Record uploaded and stored on blockchain',
      record: newRecord,
      blockchain: {
        txHash: blockchainTxHash,
        dataHash,
        ipfsHash
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify student
app.get('/api/student/verify/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = db.students.find(s => s.studentId === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found', verified: false });
    }

    const records = db.records.filter(r => r.studentId === studentId);
    const institution = db.institutions.find(i => i.id === student.institutionId);

    // Verify hashes
    const verificationResults = records.map(record => {
      const blockchainTx = db.blockchainTransactions.find(tx => tx.recordId === record.id);
      const hashMatch = blockchainTx ? blockchainTx.dataHash === record.dataHash : true;

      return {
        recordId: record.id,
        title: record.title,
        type: record.type,
        verified: hashMatch,
        blockchainTxHash: record.blockchainTxHash,
        dataHash: record.dataHash,
        ipfsHash: record.ipfsHash,
        tampered: !hashMatch
      };
    });

    const allVerified = verificationResults.every(r => r.verified);

    res.json({
      verified: allVerified,
      student: {
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        department: student.department,
        enrollmentYear: student.enrollmentYear,
        institution: institution?.name || 'Unknown'
      },
      records: verificationResults,
      message: allVerified
        ? 'All records verified successfully. No tampering detected.'
        : 'Warning: Some records may have been tampered with!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student records by wallet address
app.get('/api/student/records/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const student = db.students.find(s =>
      s.walletAddress && s.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (!student) {
      return res.status(404).json({ error: 'No student found for this wallet address' });
    }

    const records = db.records.filter(r => r.studentId === student.studentId);

    res.json({
      student: {
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        department: student.department
      },
      records: records.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        description: r.description,
        verified: r.verified,
        blockchainTxHash: r.blockchainTxHash,
        ipfsHash: r.ipfsHash,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all students (admin only)
app.get('/api/students', authenticateToken, requireRole('admin', 'institution'), (req, res) => {
  const students = db.students.map(s => ({
    id: s.id,
    studentId: s.studentId,
    name: s.name,
    email: s.email,
    course: s.course,
    department: s.department,
    enrollmentYear: s.enrollmentYear,
    walletAddress: s.walletAddress,
    createdAt: s.createdAt
  }));
  res.json({ students });
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get all notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifications = db.notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ notifications });
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notification = db.notifications.find(n => n.id === req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notification.read = true;
  res.json({ message: 'Notification marked as read', notification });
});

// ==================== RESULTS ROUTES ====================

// Get student results
app.get('/api/student/results', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const studentId = user.studentId || 'STU2024001';
  const results = db.results.filter(r => r.studentId === studentId);

  // Calculate CGPA
  const totalCredits = results.reduce((sum, r) => sum + r.totalCredits, 0);
  const weightedSum = results.reduce((sum, r) => sum + (r.sgpa * r.totalCredits), 0);
  const cgpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0;

  res.json({
    results: results.sort((a, b) => a.semester - b.semester),
    cgpa: parseFloat(cgpa),
    totalSemesters: results.length
  });
});

// ==================== ATTENDANCE ROUTES ====================

// Get student attendance
app.get('/api/student/attendance', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const studentId = user.studentId || 'STU2024001';
  const attendance = db.attendance.filter(a => a.studentId === studentId);

  // Calculate overall percentage
  const totalPresent = attendance.reduce((sum, a) => sum + a.presentDays, 0);
  const totalDays = attendance.reduce((sum, a) => sum + a.totalDays, 0);
  const overallPercentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;

  res.json({
    attendance: attendance.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return months.indexOf(b.month) - months.indexOf(a.month);
    }),
    overallPercentage: parseFloat(overallPercentage),
    totalPresent,
    totalDays
  });
});

// ==================== PROFILE ROUTES ====================

// Get student profile
app.get('/api/student/profile', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const studentId = user.studentId || 'STU2024001';
  const student = db.students.find(s => s.studentId === studentId);

  if (!student) {
    return res.status(404).json({ error: 'Student profile not found' });
  }

  res.json({
    profile: {
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      course: student.course,
      department: student.department,
      enrollmentYear: student.enrollmentYear,
      aadhaarNumber: student.aadhaarNumber || '',
      apaarId: student.apaarId || '',
      dob: student.dob || '',
      admissionType: student.admissionType || '',
      profilePicture: student.profilePicture || null,
      walletAddress: student.walletAddress
    }
  });
});

// Update student profile
app.put('/api/student/profile', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const studentId = user.studentId || 'STU2024001';
  const student = db.students.find(s => s.studentId === studentId);

  if (!student) {
    return res.status(404).json({ error: 'Student profile not found' });
  }

  const { profilePicture, aadhaarNumber, apaarId, dob, admissionType } = req.body;

  if (profilePicture !== undefined) {
    student.profilePicture = profilePicture;
  }
  if (aadhaarNumber !== undefined) {
    student.aadhaarNumber = aadhaarNumber;
  }
  if (apaarId !== undefined) {
    student.apaarId = apaarId;
  }
  if (dob !== undefined) {
    student.dob = dob;
  }
  if (admissionType !== undefined) {
    student.admissionType = admissionType;
  }

  res.json({
    message: 'Profile updated successfully',
    profile: {
      studentId: student.studentId,
      name: student.name,
      aadhaarNumber: student.aadhaarNumber,
      apaarId: student.apaarId,
      dob: student.dob,
      admissionType: student.admissionType,
      profilePicture: student.profilePicture
    }
  });
});

// ==================== ACADEMIC PAPERS (ADMIN UPLOAD + STUDENT DOWNLOAD) ====================

// Get all papers (students & admin) - sorted newest first
app.get('/api/papers', authenticateToken, (req, res) => {
  const sorted = [...db.papers].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  // Attach user's bookmarks
  const userId = req.user.id;
  const userBookmarks = db.paperBookmarks.filter(b => b.userId === userId).map(b => b.paperId);
  const papersWithMeta = sorted.map(p => {
    const ratings = db.paperRatings.filter(r => r.paperId === p.id);
    const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) : 0;
    const userRating = db.paperRatings.find(r => r.paperId === p.id && r.userId === userId);
    return {
      ...p,
      bookmarked: userBookmarks.includes(p.id),
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length,
      userRating: userRating ? userRating.rating : 0
    };
  });
  res.json({ papers: papersWithMeta });
});

// Admin: Upload a paper PDF (with dedup check)
app.post('/api/admin/papers/upload', authenticateToken, uploadPaper.single('file'), (req, res) => {
  try {
    const { subject, code, year, semester, department } = req.body;
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
    if (!subject) return res.status(400).json({ error: 'Subject name is required' });

    // Dedup check: same subject + code + year + semester
    const duplicate = db.papers.find(p =>
      p.subject.toLowerCase() === subject.toLowerCase() &&
      (p.code || '').toLowerCase() === (code || '').toLowerCase() &&
      p.year === (parseInt(year) || new Date().getFullYear()) &&
      p.semester === (semester || 'End Sem')
    );
    if (duplicate) {
      // Remove the just-uploaded file since it's a duplicate
      const uploadedPath = path.join(__dirname, 'uploads/papers', req.file.filename);
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(409).json({
        error: `Duplicate: "${duplicate.subject} (${duplicate.code}) - ${duplicate.semester} ${duplicate.year}" already exists. Delete the old one first or edit it.`
      });
    }

    const paper = {
      id: uuidv4(),
      subject: subject || 'Untitled',
      code: code || '',
      year: parseInt(year) || new Date().getFullYear(),
      semester: semester || 'End Sem',
      department: department || 'General',
      fileName: req.file.originalname,
      fileUrl: `/uploads/papers/${req.file.filename}`,
      fileSize: req.file.size,
      downloads: 0,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.email
    };

    db.papers.push(paper);
    console.log(`\n📄 Paper uploaded: ${paper.subject} (${paper.code}) by ${req.user.email}`);
    res.json({ message: 'Paper uploaded successfully', paper });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Admin: Delete a paper
app.delete('/api/admin/papers/:id', authenticateToken, (req, res) => {
  const idx = db.papers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Paper not found' });

  const paper = db.papers[idx];
  const filePath = path.join(__dirname, paper.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  db.papers.splice(idx, 1);
  // Clean up bookmarks and ratings
  db.paperBookmarks = db.paperBookmarks.filter(b => b.paperId !== req.params.id);
  db.paperRatings = db.paperRatings.filter(r => r.paperId !== req.params.id);
  res.json({ message: 'Paper deleted successfully' });
});

// Admin: Bulk delete papers
app.post('/api/admin/papers/bulk-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No paper IDs provided' });
  }
  let deleted = 0;
  ids.forEach(id => {
    const idx = db.papers.findIndex(p => p.id === id);
    if (idx !== -1) {
      const paper = db.papers[idx];
      const filePath = path.join(__dirname, paper.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.papers.splice(idx, 1);
      db.paperBookmarks = db.paperBookmarks.filter(b => b.paperId !== id);
      db.paperRatings = db.paperRatings.filter(r => r.paperId !== id);
      deleted++;
    }
  });
  res.json({ message: `${deleted} paper(s) deleted successfully`, deleted });
});

// Admin: Edit paper metadata
app.put('/api/admin/papers/:id', authenticateToken, (req, res) => {
  const paper = db.papers.find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });

  const { subject, code, year, semester, department } = req.body;
  if (subject !== undefined) paper.subject = subject;
  if (code !== undefined) paper.code = code;
  if (year !== undefined) paper.year = parseInt(year) || paper.year;
  if (semester !== undefined) paper.semester = semester;
  if (department !== undefined) paper.department = department;
  paper.updatedAt = new Date().toISOString();

  res.json({ message: 'Paper updated successfully', paper });
});

// Track paper download
app.post('/api/papers/:id/download', authenticateToken, (req, res) => {
  const paper = db.papers.find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });
  paper.downloads = (paper.downloads || 0) + 1;
  res.json({ downloads: paper.downloads });
});

// Toggle bookmark on a paper
app.post('/api/papers/:id/bookmark', authenticateToken, (req, res) => {
  const paper = db.papers.find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });

  const userId = req.user.id;
  const existing = db.paperBookmarks.findIndex(b => b.userId === userId && b.paperId === req.params.id);
  if (existing !== -1) {
    db.paperBookmarks.splice(existing, 1);
    res.json({ bookmarked: false });
  } else {
    db.paperBookmarks.push({ userId, paperId: req.params.id, createdAt: new Date().toISOString() });
    res.json({ bookmarked: true });
  }
});

// Rate a paper (1-5 stars)
app.post('/api/papers/:id/rate', authenticateToken, (req, res) => {
  const paper = db.papers.find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });

  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  const userId = req.user.id;
  const existing = db.paperRatings.findIndex(r => r.userId === userId && r.paperId === req.params.id);
  if (existing !== -1) {
    db.paperRatings[existing].rating = rating;
  } else {
    db.paperRatings.push({ userId, paperId: req.params.id, rating, createdAt: new Date().toISOString() });
  }

  const allRatings = db.paperRatings.filter(r => r.paperId === req.params.id);
  const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
  res.json({ avgRating: Math.round(avgRating * 10) / 10, totalRatings: allRatings.length, userRating: rating });
});


// ==================== ASSIGNMENTS ====================
app.get('/api/assignments', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const assignments = db.assignments.filter(a => a.studentId === studentId);
  res.json({ assignments });
});

app.post('/api/assignments/:id/submit', authenticateToken, (req, res) => {
  const { id } = req.params;
  const assignment = db.assignments.find(a => a.id === id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }
  assignment.status = 'submitted';
  assignment.submittedAt = new Date().toISOString().split('T')[0];
  res.json({ message: 'Assignment submitted successfully', assignment });
});

// ==================== TIMETABLE ====================
app.get('/api/timetable', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const timetable = db.timetable.filter(t => t.studentId === studentId);
  res.json({ timetable });
});

// ==================== GRIEVANCES ====================
app.get('/api/grievances', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const grievances = db.grievances.filter(g => g.studentId === studentId);
  res.json({ grievances });
});

app.post('/api/grievances', authenticateToken, (req, res) => {
  const { category, subject, description } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';

  const newGrievance = {
    id: uuidv4(),
    studentId,
    category,
    subject,
    description,
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
    resolvedAt: null,
    response: null
  };

  db.grievances.push(newGrievance);
  res.json({ message: 'Grievance submitted successfully', grievance: newGrievance });
});

// ==================== EVENTS ====================
app.get('/api/events', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const events = db.events.map(e => ({
    ...e,
    isRegistered: e.registered.includes(studentId)
  }));
  res.json({ events });
});

app.post('/api/events/:id/register', authenticateToken, (req, res) => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';

  const event = db.events.find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (!event.registrationOpen) {
    return res.status(400).json({ error: 'Registration is closed for this event' });
  }
  if (event.registered.includes(studentId)) {
    return res.status(400).json({ error: 'Already registered for this event' });
  }

  event.registered.push(studentId);
  res.json({ message: 'Registered successfully', event: { ...event, isRegistered: true } });
});

// ==================== CERTIFICATES ====================
app.get('/api/certificates', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const certificates = db.certificates.filter(c => c.studentId === studentId);
  res.json({ certificates });
});

// ==================== ID CARD ====================
app.get('/api/student/idcard', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const student = db.students.find(s => s.studentId === studentId);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({
    idCard: {
      studentId: student.studentId,
      name: student.name,
      course: student.course,
      department: student.department,
      enrollmentYear: student.enrollmentYear,
      email: student.email,
      profilePicture: student.profilePicture,
      validUntil: '2028-05-31',
      institutionName: 'BlockEdu University',
      barcode: student.studentId
    }
  });
});

// ==================== PERFORMANCE ANALYTICS ====================
app.get('/api/analytics/performance', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';

  // Get all results
  const results = db.results.filter(r => r.studentId === studentId);
  const attendance = db.attendance.filter(a => a.studentId === studentId);

  if (results.length === 0) {
    return res.json({ analytics: null });
  }

  // Calculate overall CGPA
  const totalCredits = results.reduce((sum, r) => sum + r.totalCredits, 0);
  const weightedGPA = results.reduce((sum, r) => sum + (r.sgpa * r.totalCredits), 0);
  const cgpa = (weightedGPA / totalCredits).toFixed(2);

  // Calculate attendance percentage
  const totalDays = attendance.reduce((sum, a) => sum + a.totalDays, 0);
  const presentDays = attendance.reduce((sum, a) => sum + a.presentDays, 0);
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  // Identify weak subjects (grade below B+)
  const allSubjects = results.flatMap(r => r.subjects);
  const weakSubjects = allSubjects.filter(s => s.gradePoints < 8).map(s => ({
    name: s.name,
    code: s.code,
    grade: s.grade,
    gradePoints: s.gradePoints
  }));

  // Predict next semester CGPA (simple linear trend)
  const sgpaTrend = results.map(r => r.sgpa);
  const avgImprovement = sgpaTrend.length > 1 ?
    (sgpaTrend[sgpaTrend.length - 1] - sgpaTrend[0]) / (sgpaTrend.length - 1) : 0;
  const predictedSGPA = Math.min(10, Math.max(0, sgpaTrend[sgpaTrend.length - 1] + avgImprovement)).toFixed(2);

  // Generate recommendations
  const recommendations = [];
  if (parseFloat(cgpa) < 7.5) {
    recommendations.push({ type: 'warning', text: 'Focus on improving grades - aim for A grades in upcoming exams' });
  }
  if (parseFloat(attendancePercentage) < 75) {
    recommendations.push({ type: 'error', text: 'Attendance is below 75% - attend all classes to avoid shortage' });
  }
  if (weakSubjects.length > 0) {
    recommendations.push({ type: 'info', text: `Focus on ${weakSubjects.length} weak subject(s): ${weakSubjects.slice(0, 2).map(s => s.name).join(', ')}` });
  }
  if (parseFloat(cgpa) >= 8.5) {
    recommendations.push({ type: 'success', text: 'Excellent performance! Keep up the good work' });
  }

  // Performance trend
  const trend = avgImprovement > 0.1 ? 'improving' : avgImprovement < -0.1 ? 'declining' : 'stable';

  res.json({
    analytics: {
      cgpa: parseFloat(cgpa),
      attendancePercentage: parseFloat(attendancePercentage),
      totalSemesters: results.length,
      weakSubjects,
      predictions: {
        nextSemesterSGPA: parseFloat(predictedSGPA),
        expectedCGPA: ((parseFloat(cgpa) * totalCredits + parseFloat(predictedSGPA) * 16) / (totalCredits + 16)).toFixed(2)
      },
      recommendations,
      trend,
      semesterPerformance: results.map(r => ({
        semester: r.semester,
        sgpa: r.sgpa,
        year: r.year
      }))
    }
  });
});

// ==================== AI STUDY BUDDY ====================
app.get('/api/chat/history', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';
  const history = db.chatHistory.filter(c => c.studentId === studentId).slice(-50);
  res.json({ history });
});

app.post('/api/chat/message', authenticateToken, (req, res) => {
  const { message, subject } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  const studentId = user?.studentId || 'STU2024001';

  // Store user message
  const userMsg = {
    id: uuidv4(),
    studentId,
    message,
    subject,
    sender: 'user',
    timestamp: new Date().toISOString()
  };
  db.chatHistory.push(userMsg);

  // Get student data for personalized responses
  const student = db.students.find(s => s.studentId === studentId);
  const results = db.results.filter(r => r.studentId === studentId);
  const attendance = db.attendance.filter(a => a.studentId === studentId);
  const studentData = { results, attendance, student };

  // Generate AI response using enhanced chatbot
  const aiResponse = generateEnhancedAIResponse(message, subject, studentData);
  const aiMsg = {
    id: uuidv4(),
    studentId,
    message: aiResponse,
    subject,
    sender: 'ai',
    timestamp: new Date().toISOString()
  };
  db.chatHistory.push(aiMsg);

  res.json({ userMessage: userMsg, aiMessage: aiMsg });
});

// AI response is now handled by aiChatbot.js module (generateEnhancedAIResponse)

// ==================== BLOCKCHAIN ROUTES ====================

// Store hash on blockchain
app.post('/api/blockchain/storeHash', authenticateToken, async (req, res) => {
  try {
    const { data, recordType } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const dataHash = generateHash(JSON.stringify(data));
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');

    const transaction = {
      id: uuidv4(),
      txHash,
      dataHash,
      recordType: recordType || 'generic',
      action: 'STORE_HASH',
      walletAddress: req.user.walletAddress,
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      gasUsed: Math.floor(Math.random() * 50000) + 21000
    };

    db.blockchainTransactions.push(transaction);

    res.status(201).json({
      success: true,
      message: 'Hash stored on blockchain successfully',
      transaction: {
        txHash: transaction.txHash,
        dataHash: transaction.dataHash,
        blockNumber: transaction.blockNumber,
        gasUsed: transaction.gasUsed,
        timestamp: transaction.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify hash on blockchain
app.get('/api/blockchain/verifyHash', async (req, res) => {
  try {
    const { hash, txHash } = req.query;

    if (!hash && !txHash) {
      return res.status(400).json({ error: 'Hash or transaction hash is required' });
    }

    let transaction;
    if (txHash) {
      transaction = db.blockchainTransactions.find(tx => tx.txHash === txHash);
    } else {
      transaction = db.blockchainTransactions.find(tx => tx.dataHash === hash);
    }

    if (!transaction) {
      return res.json({
        verified: false,
        message: 'Hash not found on blockchain',
        exists: false
      });
    }

    res.json({
      verified: true,
      exists: true,
      message: 'Hash verified successfully on blockchain',
      transaction: {
        txHash: transaction.txHash,
        dataHash: transaction.dataHash,
        blockNumber: transaction.blockNumber,
        timestamp: transaction.timestamp,
        action: transaction.action
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all blockchain transactions
app.get('/api/blockchain/transactions', authenticateToken, (req, res) => {
  const transactions = db.blockchainTransactions.map(tx => ({
    txHash: tx.txHash,
    dataHash: tx.dataHash,
    action: tx.action,
    blockNumber: tx.blockNumber,
    timestamp: tx.timestamp
  }));
  res.json({ transactions });
});

// ==================== INSTITUTION ROUTES ====================

// Get all institutions
app.get('/api/institutions', (req, res) => {
  const institutions = db.institutions.map(i => ({
    id: i.id,
    name: i.name,
    code: i.code,
    verified: i.verified
  }));
  res.json({ institutions });
});

// Register institution
app.post('/api/institutions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, walletAddress } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const newInstitution = {
      id: uuidv4(),
      name,
      code,
      walletAddress: walletAddress || null,
      verified: false,
      createdAt: new Date().toISOString()
    };

    db.institutions.push(newInstitution);

    res.status(201).json({
      message: 'Institution registered successfully',
      institution: newInstitution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  res.json({
    totalStudents: db.students.length,
    totalRecords: db.records.length,
    totalTransactions: db.blockchainTransactions.length,
    totalInstitutions: db.institutions.length,
    recentTransactions: db.blockchainTransactions.slice(-5).reverse().map(tx => ({
      txHash: tx.txHash.slice(0, 20) + '...',
      action: tx.action,
      timestamp: tx.timestamp
    }))
  });
});

// ==================== SETTINGS ROUTES ====================

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    user.updatedAt = new Date().toISOString();

    // Log the action
    db.systemLogs = db.systemLogs || [];
    db.systemLogs.push({
      id: uuidv4(),
      action: 'PASSWORD_CHANGED',
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
app.put('/api/auth/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, walletAddress } = req.body;

    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const emailExists = db.users.find(u => u.email === email && u.id !== user.id);
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (walletAddress !== undefined) user.walletAddress = walletAddress;
    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STUDENT SELF-REGISTRATION ====================

// Public student self-registration
app.post('/api/student/self-register', async (req, res) => {
  try {
    const { studentId, name, email, password, course, department, enrollmentYear } = req.body;

    if (!studentId || !name || !email || !password) {
      return res.status(400).json({ error: 'Student ID, name, email, and password are required' });
    }

    // Check if student or user already exists
    const existingStudent = db.students.find(s => s.studentId === studentId);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student ID already registered' });
    }

    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create user account
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      role: 'student',
      studentId,
      walletAddress: null,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    // Create student record
    const newStudent = {
      id: userId,
      studentId,
      name,
      email,
      course: course || '',
      department: department || '',
      enrollmentYear: enrollmentYear || new Date().getFullYear(),
      walletAddress: null,
      institutionId: db.institutions[0]?.id,
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    };
    db.students.push(newStudent);

    // Create initial fee record
    db.payments = db.payments || [];
    db.payments.push({
      id: uuidv4(),
      userId: userId,
      studentId: studentId,
      type: 'registration_fee',
      amount: 500,
      currency: 'USD',
      status: 'pending',
      description: 'Registration Fee',
      createdAt: new Date().toISOString()
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, studentId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful! Please complete fee payment.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        studentId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== OTP LOGIN ====================

// Send OTP to student email
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = db.users.find(u => u.email === email && u.role === 'student');
    if (!user) {
      return res.status(404).json({ error: 'No student account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore[email] = { otp, expiresAt };

    // Send OTP via email
    const mailOptions = {
      from: `"Portal - Student Login" <${senderEmail}>`,
      to: email,
      subject: `Your OTP for Portal Login: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🔗 Portal</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Student Login OTP</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your One-Time Password (OTP) for login is:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; background: #f0f0ff; padding: 15px 30px; border-radius: 10px; border: 2px dashed #667eea;">${otp}</span>
            </div>
            <p style="color: #666;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you did not request this OTP, please ignore this email.</p>
          </div>
        </div>
      `
    };

    let emailSent = false;
    let previewUrl = null;
    try {
      if (emailReady) {
        const result = await sendEmail(mailOptions);
        emailSent = true;
        previewUrl = result.previewUrl || null;
        console.log(`\n📧 OTP ${otp} sent to ${email} via ${emailProvider}`);
        if (previewUrl) {
          console.log(`📨 View email at: ${previewUrl}`);
        }
        console.log('');
      } else {
        console.log(`\n📧 OTP for ${email}: ${otp} (Email not ready)\n`);
      }
    } catch (emailErr) {
      console.log(`\n⚠️ Email send failed: ${emailErr.message}\n📧 OTP for ${email}: ${otp}\n`);
    }

    res.json({
      message: emailSent
        ? `OTP sent successfully to ${email}! Check your inbox.`
        : `OTP generated! Your code is: ${otp}`,
      // Only include OTP if email was NOT sent (fallback)
      ...(emailSent ? {} : { otp_code: otp }),
      ...(previewUrl ? { email_preview: previewUrl } : {})
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and login
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Check OTP
    const stored = otpStore[email];
    if (!stored) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP valid - delete it
    delete otpStore[email];

    // Find user and generate token
    const user = db.users.find(u => u.email === email && u.role === 'student');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, studentId: user.studentId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT ROUTES ====================

// Get user payments
app.get('/api/payments', authenticateToken, (req, res) => {
  db.payments = db.payments || [];
  const userPayments = db.payments.filter(p => p.userId === req.user.id);
  res.json({ payments: userPayments });
});

// Get all payments (admin)
app.get('/api/payments/all', authenticateToken, requireRole('admin'), (req, res) => {
  db.payments = db.payments || [];
  res.json({ payments: db.payments });
});

// Create payment
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { type, amount, currency, description, paymentMethod, txHash } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ error: 'Payment type and amount are required' });
    }

    db.payments = db.payments || [];

    const payment = {
      id: uuidv4(),
      userId: req.user.id,
      studentId: req.user.studentId,
      type,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      status: 'completed',
      description: description || type,
      paymentMethod: paymentMethod || 'card',
      txHash: txHash || '0x' + crypto.randomBytes(32).toString('hex'),
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.payments.push(payment);

    // Update any pending payment of same type to completed
    const pendingPayment = db.payments.find(p =>
      p.userId === req.user.id &&
      p.type === type &&
      p.status === 'pending'
    );
    if (pendingPayment) {
      pendingPayment.status = 'completed';
      pendingPayment.paidAt = new Date().toISOString();
      pendingPayment.txHash = payment.txHash;
    }

    // Log blockchain transaction
    db.blockchainTransactions.push({
      id: uuidv4(),
      txHash: payment.txHash,
      dataHash: generateHash(JSON.stringify(payment)),
      action: 'PAYMENT_RECORDED',
      walletAddress: req.user.walletAddress,
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000
    });

    res.status(201).json({
      message: 'Payment successful',
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending fees
app.get('/api/payments/pending', authenticateToken, (req, res) => {
  db.payments = db.payments || [];
  const pendingPayments = db.payments.filter(p =>
    p.userId === req.user.id && p.status === 'pending'
  );
  res.json({ pendingPayments });
});

// ==================== SYSTEM ADMIN ROUTES ====================

// Get all users (system admin)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  const users = db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    walletAddress: u.walletAddress,
    studentId: u.studentId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
  res.json({ users });
});

// Update user (system admin)
app.put('/api/admin/users/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, walletAddress } = req.body;

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (walletAddress !== undefined) user.walletAddress = walletAddress;
    user.updatedAt = new Date().toISOString();

    // Log action
    db.systemLogs = db.systemLogs || [];
    db.systemLogs.push({
      id: uuidv4(),
      action: 'USER_UPDATED',
      targetUserId: userId,
      performedBy: req.user.id,
      details: { name, email, role },
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (system admin)
app.delete('/api/admin/users/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletedUser = db.users[userIndex];
    db.users.splice(userIndex, 1);

    // Log action
    db.systemLogs = db.systemLogs || [];
    db.systemLogs.push({
      id: uuidv4(),
      action: 'USER_DELETED',
      targetUserId: userId,
      targetUserEmail: deletedUser.email,
      performedBy: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user password (system admin)
app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const password = newPassword || 'password123';
    user.password = bcrypt.hashSync(password, 10);
    user.updatedAt = new Date().toISOString();

    // Log action
    db.systemLogs = db.systemLogs || [];
    db.systemLogs.push({
      id: uuidv4(),
      action: 'PASSWORD_RESET',
      targetUserId: userId,
      performedBy: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Password reset successfully', temporaryPassword: password });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system logs (system admin)
app.get('/api/admin/logs', authenticateToken, requireRole('admin'), (req, res) => {
  db.systemLogs = db.systemLogs || [];
  const logs = db.systemLogs.slice(-100).reverse(); // Last 100 logs
  res.json({ logs });
});

// Get system statistics (system admin)
app.get('/api/admin/stats', authenticateToken, requireRole('admin'), (req, res) => {
  db.payments = db.payments || [];
  db.systemLogs = db.systemLogs || [];

  const totalRevenue = db.payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = db.payments.filter(p => p.status === 'pending').length;

  res.json({
    users: {
      total: db.users.length,
      admins: db.users.filter(u => u.role === 'admin').length,
      institutions: db.users.filter(u => u.role === 'institution').length,
      students: db.users.filter(u => u.role === 'student').length
    },
    students: {
      total: db.students.length,
      pending: db.students.filter(s => s.status === 'pending_verification').length,
      verified: db.students.filter(s => s.status !== 'pending_verification').length
    },
    records: {
      total: db.records.length,
      verified: db.records.filter(r => r.verified).length
    },
    payments: {
      total: db.payments.length,
      completed: db.payments.filter(p => p.status === 'completed').length,
      pending: pendingPayments,
      totalRevenue
    },
    blockchain: {
      totalTransactions: db.blockchainTransactions.length
    },
    institutions: {
      total: db.institutions.length,
      verified: db.institutions.filter(i => i.verified).length
    },
    logs: {
      total: db.systemLogs.length
    }
  });
});

// Verify/Update institution status
app.put('/api/admin/institutions/:institutionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { verified, name, code } = req.body;

    const institution = db.institutions.find(i => i.id === institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (verified !== undefined) institution.verified = verified;
    if (name) institution.name = name;
    if (code) institution.code = code;
    institution.updatedAt = new Date().toISOString();

    res.json({ message: 'Institution updated successfully', institution });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete institution
app.delete('/api/admin/institutions/:institutionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { institutionId } = req.params;

    const index = db.institutions.findIndex(i => i.id === institutionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    db.institutions.splice(index, 1);
    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      blockchain: 'simulated',
      ipfs: 'simulated'
    }
  });
});
// ==================== ADMIN ANALYTICS DASHBOARD ====================

// Get comprehensive admin analytics
app.get('/api/admin/analytics', authenticateToken, (req, res) => {
  // Department-wise performance
  const departments = [...new Set(db.students.map(s => s.department))];
  const departmentStats = departments.map(dept => {
    const deptStudents = db.students.filter(s => s.department === dept);
    const deptResults = db.results.filter(r =>
      deptStudents.some(s => s.studentId === r.studentId)
    );
    const avgSGPA = deptResults.length > 0
      ? (deptResults.reduce((sum, r) => sum + r.sgpa, 0) / deptResults.length).toFixed(2)
      : 0;
    return { department: dept, studentCount: deptStudents.length, avgSGPA: parseFloat(avgSGPA) };
  });

  // Fee collection stats
  const totalFees = db.students.length * 50000;
  const collectedFees = db.students.filter(s => s.verified).length * 50000;
  const pendingFees = totalFees - collectedFees;

  // Attendance patterns
  const attendanceStats = db.attendance.reduce((acc, a) => {
    const percentage = ((a.presentDays / a.totalDays) * 100).toFixed(1);
    if (percentage >= 90) acc.excellent++;
    else if (percentage >= 75) acc.good++;
    else acc.poor++;
    return acc;
  }, { excellent: 0, good: 0, poor: 0 });

  // Activity log (recent activities)
  const recentActivities = [
    { type: 'registration', message: 'New student registered', time: new Date().toISOString(), count: db.students.length },
    { type: 'login', message: 'Student logins today', time: new Date().toISOString(), count: Math.floor(Math.random() * 20) + 5 },
    { type: 'assignment', message: 'Assignments submitted', time: new Date().toISOString(), count: db.assignments.length },
    { type: 'grievance', message: 'Pending grievances', time: new Date().toISOString(), count: db.grievances.filter(g => g.status === 'pending').length }
  ];

  // Trend analysis
  const monthlyTrend = [
    { month: 'Jan', registrations: 12, fees: 600000 },
    { month: 'Feb', registrations: 15, fees: 750000 },
    { month: 'Mar', registrations: 8, fees: 400000 },
    { month: 'Apr', registrations: 20, fees: 1000000 },
    { month: 'May', registrations: 18, fees: 900000 },
    { month: 'Jun', registrations: 25, fees: 1250000 }
  ];

  res.json({
    summary: {
      totalStudents: db.students.length,
      verifiedStudents: db.students.filter(s => s.verified).length,
      pendingVerification: db.students.filter(s => !s.verified).length,
      totalRecords: db.records.length
    },
    departmentStats,
    feeCollection: {
      total: totalFees,
      collected: collectedFees,
      pending: pendingFees,
      collectionRate: ((collectedFees / totalFees) * 100).toFixed(1)
    },
    attendanceStats,
    recentActivities,
    monthlyTrend,
    performanceDistribution: {
      excellent: db.results.filter(r => r.sgpa >= 9).length,
      good: db.results.filter(r => r.sgpa >= 7 && r.sgpa < 9).length,
      average: db.results.filter(r => r.sgpa >= 5 && r.sgpa < 7).length,
      poor: db.results.filter(r => r.sgpa < 5).length
    }
  });
});

// ==================== CERTIFICATE GENERATOR ====================

// Get certificate templates
app.get('/api/admin/certificates/templates', authenticateToken, (req, res) => {
  const templates = [
    { id: 'bonafide', name: 'Bonafide Certificate', description: 'Proof of enrollment', fields: ['name', 'studentId', 'department', 'year'] },
    { id: 'character', name: 'Character Certificate', description: 'Character and conduct', fields: ['name', 'studentId', 'department', 'conduct'] },
    { id: 'course', name: 'Course Completion', description: 'Course completion certificate', fields: ['name', 'studentId', 'course', 'grade'] },
    { id: 'internship', name: 'Internship Letter', description: 'Internship completion', fields: ['name', 'studentId', 'company', 'duration'] },
    { id: 'degree', name: 'Degree Certificate', description: 'Graduation degree', fields: ['name', 'studentId', 'department', 'cgpa', 'year'] },
    { id: 'merit', name: 'Merit Certificate', description: 'Academic excellence', fields: ['name', 'studentId', 'achievement', 'rank'] }
  ];
  res.json({ templates });
});

// Generate certificate
app.post('/api/admin/certificates/generate', authenticateToken, (req, res) => {
  const { templateId, studentIds, customData } = req.body;

  const generatedCertificates = studentIds.map(studentId => {
    const student = db.students.find(s => s.studentId === studentId);
    if (!student) return null;

    const certId = uuidv4();
    const qrCode = `https://verify.blockedu.com/cert/${certId}`;
    const blockchainHash = crypto.createHash('sha256').update(certId + studentId + Date.now()).digest('hex');

    const certificate = {
      id: certId,
      templateId,
      studentId,
      studentName: student.name,
      department: student.department,
      issueDate: new Date().toISOString(),
      qrCode,
      blockchainHash,
      verified: true,
      customData: customData || {}
    };

    db.certificates.push(certificate);
    return certificate;
  }).filter(Boolean);

  res.json({
    success: true,
    message: `Generated ${generatedCertificates.length} certificates`,
    certificates: generatedCertificates
  });
});

// Get all certificates
app.get('/api/admin/certificates', authenticateToken, (req, res) => {
  res.json({ certificates: db.certificates });
});

// Verify certificate by ID
app.get('/api/certificates/verify/:certId', (req, res) => {
  const certificate = db.certificates.find(c => c.id === req.params.certId);
  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  res.json({ valid: true, certificate });
});

// ==================== WORKFLOW AUTOMATION ====================

// Get all tasks
app.get('/api/admin/tasks', authenticateToken, (req, res) => {
  res.json({ tasks: db.tasks });
});

// Create task
app.post('/api/admin/tasks', authenticateToken, (req, res) => {
  const { title, description, assignedTo, priority, dueDate, category } = req.body;

  const task = {
    id: uuidv4(),
    title,
    description,
    assignedTo,
    priority: priority || 'medium',
    status: 'todo',
    category: category || 'general',
    dueDate,
    createdAt: new Date().toISOString(),
    createdBy: req.user.id
  };

  db.tasks.push(task);
  res.json({ success: true, task });
});

// Update task status
app.put('/api/admin/tasks/:taskId', authenticateToken, (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  Object.assign(task, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, task });
});

// Delete task
app.delete('/api/admin/tasks/:taskId', authenticateToken, (req, res) => {
  const index = db.tasks.findIndex(t => t.id === req.params.taskId);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.tasks.splice(index, 1);
  res.json({ success: true, message: 'Task deleted' });
});

// Get workflow templates
app.get('/api/admin/workflows', authenticateToken, (req, res) => {
  const defaultWorkflows = [
    {
      id: 'new-admission',
      name: 'New Admission',
      description: 'Automated workflow for new student admissions',
      steps: [
        { order: 1, action: 'Receive Application', status: 'completed' },
        { order: 2, action: 'Verify Documents', status: 'pending' },
        { order: 3, action: 'Generate Fee Structure', status: 'pending' },
        { order: 4, action: 'Send Welcome Email', status: 'pending' },
        { order: 5, action: 'Assign Class', status: 'pending' }
      ],
      triggers: ['student_registered']
    },
    {
      id: 'fee-payment',
      name: 'Fee Payment',
      description: 'Workflow triggered when fee is paid',
      steps: [
        { order: 1, action: 'Receive Payment', status: 'pending' },
        { order: 2, action: 'Generate Receipt', status: 'pending' },
        { order: 3, action: 'Update Student Status', status: 'pending' },
        { order: 4, action: 'Send Confirmation', status: 'pending' }
      ],
      triggers: ['fee_paid']
    },
    {
      id: 'certificate-request',
      name: 'Certificate Request',
      description: 'Workflow for certificate generation requests',
      steps: [
        { order: 1, action: 'Receive Request', status: 'pending' },
        { order: 2, action: 'Verify Eligibility', status: 'pending' },
        { order: 3, action: 'Generate Certificate', status: 'pending' },
        { order: 4, action: 'Add Blockchain Hash', status: 'pending' },
        { order: 5, action: 'Notify Student', status: 'pending' }
      ],
      triggers: ['certificate_requested']
    }
  ];

  res.json({ workflows: [...defaultWorkflows, ...db.workflows] });
});

// Create custom workflow
app.post('/api/admin/workflows', authenticateToken, (req, res) => {
  const { name, description, steps, triggers } = req.body;

  const workflow = {
    id: uuidv4(),
    name,
    description,
    steps: steps.map((s, i) => ({ order: i + 1, action: s, status: 'pending' })),
    triggers: triggers || [],
    createdAt: new Date().toISOString(),
    createdBy: req.user.id
  };

  db.workflows.push(workflow);
  res.json({ success: true, workflow });
});

// Get task statistics for Kanban
app.get('/api/admin/tasks/stats', authenticateToken, (req, res) => {
  const stats = {
    todo: db.tasks.filter(t => t.status === 'todo').length,
    inProgress: db.tasks.filter(t => t.status === 'in-progress').length,
    review: db.tasks.filter(t => t.status === 'review').length,
    done: db.tasks.filter(t => t.status === 'done').length,
    overdue: db.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };
  res.json({ stats });
});

// Initialize demo data and start server
initDemoData();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║     Student Records Blockchain API Server                    ║
  ║     Running on http://localhost:${PORT}                         ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  Demo Accounts:                                              ║
  ║  Admin: admin@university.edu / admin123                      ║
  ║  Institution: institution@university.edu / institution123    ║
  ║  Student: student@university.edu / student123                ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
