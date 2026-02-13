# 🎓 BlockEdu — Blockchain-Based Student Records Management System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![React](https://img.shields.io/badge/react-18.2-61dafb)
![License](https://img.shields.io/badge/license-MIT-yellow)

**A secure, decentralized, and feature-rich student records management system powered by blockchain technology.**

[Features](#-features) · [Quick Start](#-quick-start) · [Demo Credentials](#-demo-credentials) · [Tech Stack](#️-tech-stack) · [API Reference](#-api-reference)

</div>

---

## ✨ Features

### 🔐 Core Platform
| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Separate portals for Students, Admins, and Institutions |
| **Blockchain Verification** | Tamper-proof record storage with SHA-256 hashing |
| **MetaMask Integration** | Web3 wallet-based authentication via Ethers.js |
| **JWT Authentication** | Secure token-based session management |
| **OTP Email Verification** | Multi-provider email support (Gmail, Outlook, Resend) |
| **Multilingual Support** | i18n with English, Hindi, and Telugu |

### 👨‍🎓 Student Portal
| Feature | Description |
|---------|-------------|
| **Dashboard** | Personalized stats — GPA, attendance, upcoming events |
| **Results** | Semester-wise grade view with blockchain verification |
| **Attendance** | Monthly tracker with circular **ProgressRing** visualizations |
| **Schedule** | Weekly timetable with day-wise class breakdown |
| **Assignments** | Track pending / submitted / graded assignments |
| **Papers** | Academic paper library — browse, bookmark, rate, download PDFs |
| **Certificates** | View earned certificates with blockchain hashes |
| **Fee Payments** | UPI-based payment with multiple fee types, **confetti** on success |
| **Notifications** | Real-time announcements with **swipe-to-dismiss** gestures |
| **ID Card** | Digital student identity card with barcode |
| **Events** | Campus events calendar with registration |
| **Grievances** | Submit and track grievance tickets |
| **AI Chatbot** | Intelligent study buddy for academic queries |
| **Analytics** | CGPA tracking, performance predictions, peer comparison |
| **Settings** | Profile editing, password change, profile picture upload |

### 🛡️ Admin Panel
| Feature | Description |
|---------|-------------|
| **Student Records** | Full CRUD — register, edit, delete, bulk Excel upload |
| **Analytics Dashboard** | Real-time stats, department comparison, fee revenue charts |
| **Certificate Generator** | 12 template types — Bonafide, TC, Merit, Sports, etc. with PDF export |
| **Workflow Manager** | Kanban-style task board with drag-and-drop and automation rules |

### 🏛️ Institution Portal
| Feature | Description |
|---------|-------------|
| **Dashboard** | Institution-level overview statistics |
| **Student Management** | Register and manage student records |
| **Settings** | Institution profile management |

### 🎨 UI / UX Polish
| Feature | Description |
|---------|-------------|
| **Dark / Light Theme** | Persistent toggle with smooth transitions |
| **Glassmorphism** | Frosted-glass card design with glow hover effects |
| **Skeleton Loaders** | Animated shimmer placeholders during data fetch |
| **Page Transitions** | Fade + slide animations between routes |
| **Button Ripple** | Material-style ripple on every button click |
| **Confetti Effect** | Celebratory burst on payment success & certificate download |
| **Progress Rings** | SVG circular progress for attendance percentages |
| **Notification Badges** | Pulsing red dots on sidebar for unread items |
| **Swipe Gestures** | Touch swipe-to-dismiss on notification cards |
| **Custom Scrollbar** | Thin, themed scrollbar matching the color scheme |
| **Mobile Bottom Nav** | Responsive tab bar for mobile screens (≤768px) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- **MetaMask** browser extension _(optional, for wallet features)_

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd project

# 2. Setup Backend
cd backend
npm install
cp .env.example .env    # Edit with your config
npm start               # Starts on http://localhost:5000

# 3. Setup Frontend (new terminal)
cd frontend
npm install
npm start               # Starts on http://localhost:3000
```

### Access the Application

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |

---

## � Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@university.edu` | `admin123` |
| **Student** | `student@university.edu` | `student123` |
| **Institution** | `institution@university.edu` | `institution123` |

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Ethers.js v5 | Web3 / MetaMask integration |
| XLSX | Excel import/export |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| Multer | File uploads (PDFs) |
| Nodemailer / Resend | Email delivery |
| uuid | Unique ID generation |
| Ethers.js | Blockchain interaction |

### Blockchain
| Technology | Purpose |
|-----------|---------|
| Ethereum (Ethers.js) | Smart contract interaction |
| MetaMask | Wallet authentication |
| SHA-256 Hashing | Record integrity verification |

---

## 📁 Project Structure

```
project/
├── README.md
├── .gitignore
│
├── backend/
│   ├── server.js              # Express server — all routes & in-memory DB
│   ├── aiChatbot.js           # AI Study Buddy module
│   ├── package.json
│   ├── .env                   # Environment variables
│   └── uploads/               # Uploaded PDFs (papers)
│       └── papers/
│
├── frontend/
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── App.js             # All components (5300+ lines)
│   │   │   ├── AuthContext     # Auth state management
│   │   │   ├── ProtectedRoute  # Role-based route guard
│   │   │   ├── Sidebar         # Grouped navigation
│   │   │   ├── TopBar          # Header + theme toggle
│   │   │   ├── PageWrapper     # Transition animations
│   │   │   ├── SkeletonLoader  # Loading placeholders
│   │   │   ├── ProgressRing    # SVG circular progress
│   │   │   ├── ConfettiEffect  # Celebration animation
│   │   │   ├── ThemeToggle     # Dark/light switch
│   │   │   ├── MobileBottomNav # Mobile tab bar
│   │   │   └── 17+ Page components
│   │   └── index.css          # 3000+ lines — full design system
│   └── package.json
│
└── contracts/
    └── StudentRecords.sol     # Solidity smart contract (reference)
```

---

## 📡 API Reference

### 🔐 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/wallet-login` | MetaMask wallet login |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/change-password` | Change password |
| `PUT` | `/api/auth/update-profile` | Update user profile |
| `POST` | `/api/auth/send-otp` | Send email OTP |
| `POST` | `/api/auth/verify-otp` | Verify email OTP |

### 👨‍🎓 Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/student/register` | Admin registers a student |
| `POST` | `/api/student/self-register` | Student self-registration |
| `POST` | `/api/student/bulk-upload` | Bulk upload from Excel |
| `POST` | `/api/student/uploadRecord` | Upload academic record |
| `GET` | `/api/student/verify/:studentId` | Verify student records |
| `GET` | `/api/students` | List all students |
| `PUT` | `/api/student/profile` | Update student profile |
| `GET` | `/api/student/attendance` | Get attendance data |
| `GET` | `/api/student/results` | Get academic results |
| `GET` | `/api/student/idcard` | Get digital ID card |
| `GET` | `/api/student/analytics` | Get performance analytics |

### � Academic
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schedule` | Get class timetable |
| `GET` | `/api/assignments` | Get assignments list |
| `GET` | `/api/papers` | Get academic papers |
| `POST` | `/api/papers` | Upload new paper (PDF) |
| `GET` | `/api/papers/:id/download` | Download paper PDF |
| `PUT` | `/api/admin/papers/:id` | Edit paper metadata |
| `DELETE` | `/api/admin/papers/:id` | Delete a paper |

### 💬 Communication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | Get notifications |
| `PUT` | `/api/notifications/:id/read` | Mark as read |
| `GET` | `/api/events` | Get campus events |
| `GET` | `/api/grievances` | Get grievances |
| `POST` | `/api/grievances` | Submit a grievance |

### 💳 Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payments` | Get payment history |
| `POST` | `/api/payments` | Record a payment |

### 🏆 Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/certificates` | Get student certificates |
| `POST` | `/api/admin/certificates/generate` | Generate certificates |

### ⛓️ Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/blockchain/storeHash` | Store hash on chain |
| `GET` | `/api/blockchain/verifyHash` | Verify a hash |
| `GET` | `/api/blockchain/transactions` | Get all transactions |

### � Dashboard & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Dashboard statistics |
| `GET` | `/api/admin/analytics` | Admin analytics data |

### 📋 Workflow (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/tasks` | Get all tasks |
| `POST` | `/api/admin/tasks` | Create a task |
| `PUT` | `/api/admin/tasks/:taskId` | Update a task |
| `GET` | `/api/admin/tasks/stats` | Task statistics |
| `GET` | `/api/admin/workflows` | Get automation workflows |
| `POST` | `/api/admin/workflows` | Create a workflow |

### 🤖 AI Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chatbot/message` | Send message to AI |
| `GET` | `/api/chatbot/history` | Get chat history |

---

## ⚙️ Configuration

### Backend `.env`

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000

# Email (choose one provider)
# Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password

# Outlook
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🔒 Security

- **JWT Authentication** — Stateless token-based sessions
- **bcrypt Hashing** — Salted password storage
- **CORS Protection** — Configurable origin whitelist
- **Role-Based Access Control** — Middleware-enforced permissions
- **Blockchain Verification** — SHA-256 hash integrity checks
- **OTP Verification** — Email-based identity confirmation
- **Environment Variables** — No secrets in source code

---

## 🌐 Deployment

| Platform | Best For |
|----------|----------|
| **Render** | Both frontend & backend |
| **Railway** | Backend API |
| **Vercel** | Frontend (static) |
| **Heroku** | Full-stack |

```bash
# Production build (frontend)
cd frontend && npm run build

# The build/ folder is ready for static hosting
```

---

## 🗺️ Roadmap

- [ ] PostgreSQL / MongoDB persistent database
- [ ] Real Ethereum smart contract deployment
- [ ] IPFS / Arweave decentralized file storage
- [ ] Push notifications (WebSocket)
- [ ] Mobile app (React Native / Capacitor)
- [ ] Two-factor authentication (2FA)
- [ ] Audit logging & compliance reports

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

- Built with modern web technologies (React 18, Express, Ethers.js)
- Inspired by blockchain education initiatives
- Designed for secure, transparent academic record management

---

<div align="center">

**⚠️ Note**: This is a demonstration project using an in-memory database. For production use, integrate a persistent database (PostgreSQL/MongoDB), deploy real smart contracts, and implement additional security hardening.

Made with ❤️ by the BlockEdu Team

</div>
