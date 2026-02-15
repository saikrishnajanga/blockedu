# 🎓 BlockEdu — Blockchain-Based Student Records Management System

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![React](https://img.shields.io/badge/react-18.2-61dafb)
![Capacitor](https://img.shields.io/badge/capacitor-7.x-119EFF)
![License](https://img.shields.io/badge/license-MIT-yellow)

**A secure, decentralized, and feature-rich student records management system powered by blockchain technology. Available as a Web App, PWA, and Android APK.**

[Features](#-features) · [Live Demo](#-live-demo) · [Quick Start](#-quick-start) · [Demo Credentials](#-demo-credentials) · [Mobile App](#-mobile-app) · [Tech Stack](#️-tech-stack) · [API Reference](#-api-reference)

</div>

---

## 🌐 Live Demo

| Platform | URL |
|----------|-----|
| **Web App** | [blockedu-tau.vercel.app](https://blockedu-tau.vercel.app) |
| **Backend API** | Hosted on [Render](https://render.com) |
| **Android APK** | Build locally (see [Mobile App](#-mobile-app)) |

---

## ✨ Features

### 🔐 Core Platform
| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Separate portals for Students, Admins, and Institutions |
| **Blockchain Verification** | Tamper-proof record storage with SHA-256 hashing |
| **MetaMask Integration** | Web3 wallet-based authentication via Ethers.js |
| **JWT Authentication** | Secure token-based session management |
| **OTP Email Verification** | Multi-provider email support (Gmail, Outlook, Resend, Brevo) |
| **Multilingual Support** | i18n with English, Hindi, and Telugu |
| **Session Timeout** | Auto-logout after inactivity with countdown warning modal |
| **PWA Support** | Installable as a Progressive Web App on any device |

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
| **ID Card** | Digital student identity card with **3D flip animation** and QR code |
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
| **3D Flip Cards** | Interactive flip animation on student ID cards |
| **QR Code** | Auto-generated QR codes on ID cards for verification |
| **Notification Badges** | Pulsing red dots on sidebar for unread items |
| **Swipe Gestures** | Touch swipe-to-dismiss on notification cards |
| **Custom Scrollbar** | Thin, themed scrollbar matching the color scheme |
| **Mobile Bottom Nav** | Responsive tab bar for mobile screens (≤768px) |

### 📱 Mobile App
| Feature | Description |
|---------|-------------|
| **Android APK** | Native Android app via Capacitor |
| **Status Bar Support** | Proper spacing below phone status bar |
| **Mobile Sidebar** | Slide-in overlay with tap-outside-to-close |
| **Compact Top Bar** | Ultra-compact header optimized for mobile |
| **Responsive Layout** | Single-column cards, scrollable tables |
| **PWA Installable** | Install directly from browser — no APK needed |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- **MetaMask** browser extension _(optional, for wallet features)_

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/saikrishnajanga/blockedu.git
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

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@university.edu` | `admin123` |
| **Student** | `student@university.edu` | `student123` |
| **Institution** | `admin@university.edu` | `admin123` |

> **Note:** Institution login uses the same credentials as Admin.

---

## 📱 Mobile App

BlockEdu is available as a native Android APK built with **Capacitor**.

### Build the APK

```bash
# From the frontend directory
cd frontend

# Install Capacitor dependencies (if not already)
npm install @capacitor/core @capacitor/cli @capacitor/status-bar

# Sync web assets to Android
npx cap sync android

# Build the debug APK
cd android
.\gradlew.bat assembleDebug    # Windows
./gradlew assembleDebug        # macOS/Linux

# APK output location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Capacitor Configuration

The APK loads the live Vercel deployment, so frontend updates don't require rebuilding the APK.

```json
{
    "appId": "com.blockedu.app",
    "appName": "BlockEdu",
    "webDir": "build",
    "server": {
        "url": "https://blockedu-tau.vercel.app",
        "cleartext": true
    },
    "plugins": {
        "StatusBar": {
            "overlaysWebView": false,
            "style": "DARK",
            "backgroundColor": "#0f0f23"
        }
    }
}
```

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
| Nodemailer / Resend / Brevo | Email delivery |
| uuid | Unique ID generation |
| Ethers.js | Blockchain interaction |

### Mobile
| Technology | Purpose |
|-----------|---------|
| Capacitor 7 | Native Android wrapper |
| @capacitor/status-bar | Status bar management |

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
│   └── uploads/               # Uploaded PDFs (papers)
│       └── papers/
│
├── frontend/
│   ├── public/
│   │   ├── index.html         # HTML template (viewport-fit=cover)
│   │   ├── manifest.json      # PWA manifest
│   │   └── service-worker.js  # PWA service worker
│   ├── src/
│   │   ├── App.js             # All components (5600+ lines)
│   │   │   ├── AuthContext     # Auth state + session timeout
│   │   │   ├── ProtectedRoute  # Role-based route guard
│   │   │   ├── Sidebar         # Slide-in navigation (mobile overlay)
│   │   │   ├── TopBar          # Header + theme toggle
│   │   │   ├── MobileBottomNav # Mobile tab bar
│   │   │   ├── PageWrapper     # Transition animations
│   │   │   ├── SkeletonLoader  # Loading placeholders
│   │   │   ├── ProgressRing    # SVG circular progress
│   │   │   ├── ConfettiEffect  # Celebration animation
│   │   │   ├── ThemeToggle     # Dark/light switch
│   │   │   └── 17+ Page components
│   │   └── index.css          # 3600+ lines — full design system
│   ├── capacitor.config.json  # Capacitor mobile config
│   ├── vercel.json            # Vercel deployment config
│   └── package.json
│
├── frontend/android/          # Auto-generated Android project
│   ├── app/src/main/
│   │   ├── java/.../MainActivity.java
│   │   └── res/values/styles.xml
│   └── build/outputs/apk/     # Built APKs
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

### 📚 Academic
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

### 📊 Dashboard & Analytics
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

# Brevo
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🌐 Deployment

### Current Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | **Vercel** | [blockedu-tau.vercel.app](https://blockedu-tau.vercel.app) |
| Backend | **Render** | Auto-configured via Render dashboard |

### Deploy Your Own

```bash
# Production build (frontend)
cd frontend && npm run build
# The build/ folder is ready for static hosting

# Backend — deploy to Render, Railway, or Heroku
# Set environment variables in the platform dashboard
```

---

## 🔒 Security

- **JWT Authentication** — Stateless token-based sessions
- **bcrypt Hashing** — Salted password storage
- **CORS Protection** — Configurable origin whitelist
- **Role-Based Access Control** — Middleware-enforced permissions
- **Blockchain Verification** — SHA-256 hash integrity checks
- **OTP Verification** — Email-based identity confirmation
- **Session Timeout** — Auto-logout after 15 min inactivity with warning modal
- **Environment Variables** — No secrets in source code

---

## 🗺️ Roadmap

- [x] ~~Mobile app (Capacitor APK)~~
- [x] ~~PWA support~~
- [x] ~~3D flip cards & QR codes~~
- [x] ~~Session timeout with warning modal~~
- [ ] PostgreSQL / MongoDB persistent database
- [ ] Real Ethereum smart contract deployment
- [ ] IPFS / Arweave decentralized file storage
- [ ] Push notifications (WebSocket)
- [ ] iOS app (Capacitor)
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

- Built with modern web technologies (React 18, Express, Ethers.js, Capacitor)
- Inspired by blockchain education initiatives
- Designed for secure, transparent academic record management

---

<div align="center">

**⚠️ Note**: This is a demonstration project using an in-memory database. For production use, integrate a persistent database (PostgreSQL/MongoDB), deploy real smart contracts, and implement additional security hardening.

Made with ❤️ by the BlockEdu Team

</div>
