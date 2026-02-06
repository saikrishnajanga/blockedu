# BlockEdu - Blockchain-Based Student Records Management System

A secure, decentralized student records management system built with React, Node.js, and blockchain technology.

## 🌟 Features

- **Role-Based Access Control**: Separate portals for Students, Admins, and Institutions
- **Blockchain Integration**: Tamper-proof record storage with cryptographic hashing
- **MetaMask Support**: Web3 wallet authentication
- **Student Self-Registration**: Students can register and access payment portal
- **Payment Gateway**: UPI-based fee payment system for students
- **Settings Management**: Password and profile management
- **Responsive Design**: Mobile-friendly interface with modern UI

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- npm v8 or higher
- MetaMask browser extension (optional, for wallet features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd project
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 📖 Documentation

For detailed deployment instructions, see [Deployment Guide](../brain/4e77c4b2-d53f-41b0-9510-c9b5a8fbbbc4/deployment_guide.md)

## 🔐 Demo Credentials

### Admin Login
- Email: `admin@university.edu`
- Password: `admin123`

### Student Login
- Email: `student@university.edu`
- Password: `student123`

### Institution Login
- Email: `institution@university.edu`
- Password: `institution123`

## 🏗️ Tech Stack

### Frontend
- React 18
- React Router v6
- Axios
- Ethers.js (Web3)

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcryptjs
- CORS

### Blockchain
- Ethereum (via Ethers.js)
- MetaMask Integration
- Cryptographic Hashing (SHA-256)

## 📁 Project Structure

```
project/
├── backend/
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── index.css      # Styles
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── package.json       # Frontend dependencies
│   └── .env.example       # Environment template
└── contracts/
    └── StudentRecords.sol # Smart contract (reference)
```

## 🎯 User Roles

### Student
- Self-registration
- Login (email or MetaMask)
- View dashboard
- Pay fees via UPI
- Manage profile and password

### Admin
- Login
- View dashboard with statistics
- Register students
- Upload records to blockchain
- Manage student records
- View all students

### Institution
- Login
- View dashboard
- Register students
- Upload records
- Manage records

## 🔧 Configuration

### Backend Environment Variables

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🌐 Deployment

The application can be deployed to various platforms:

- **Render** (Recommended for both frontend and backend)
- **Heroku** (Backend) + **Vercel** (Frontend)
- **Railway** (Backend) + **Vercel** (Frontend)

See the [Deployment Guide](../brain/4e77c4b2-d53f-41b0-9510-c9b5a8fbbbc4/deployment_guide.md) for detailed instructions.

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Environment-based configuration
- Blockchain hash verification
- Tamper-proof record storage

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/wallet-login` - Login with MetaMask
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `PUT /api/auth/update-profile` - Update profile

### Students
- `POST /api/student/register` - Register student (admin/institution)
- `POST /api/student/self-register` - Student self-registration
- `POST /api/student/uploadRecord` - Upload student record
- `GET /api/student/verify/:studentId` - Verify student records
- `GET /api/students` - Get all students (admin/institution)

### Blockchain
- `POST /api/blockchain/storeHash` - Store hash on blockchain
- `GET /api/blockchain/verifyHash` - Verify hash
- `GET /api/blockchain/transactions` - Get all transactions

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by blockchain education initiatives
- Designed for secure, transparent record management

---

**Note**: This is a demonstration project. For production use, implement a real blockchain network and enhance security measures.
