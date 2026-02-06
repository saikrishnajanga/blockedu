require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// In-memory database (simulating PostgreSQL/MongoDB)
const db = {
  users: [],
  students: [],
  records: [],
  institutions: [],
  blockchainTransactions: []
};

// Initialize demo data
function initDemoData() {
  // Demo admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
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
