# UPAT Ticketing System

A modern, full-stack web application for managing ticket reservations, seating arrangements, and event bookings at the University of Makati Performing Arts and Theater (UPAT).

## 🏗️ Architecture

```
upat-ticketing-system/
├── src/                  # React + TypeScript frontend
│   ├── components/       # Reusable UI components
│   ├── pages/            # Application pages
│   ├── contexts/         # React contexts (Auth, Toast)
│   ├── services/         # API services
│   └── types/            # TypeScript type definitions
├── server/               # Node.js + Express backend
│   ├── routes/           # API route handlers
│   ├── controllers/      # Business logic
│   ├── models/           # Database models (Sequelize)
│   ├── middleware/       # Custom middleware
│   ├── config/           # Configuration files
│   ├── utils/            # Utility functions
│   └── package.json
└── README.md
```

## ✨ Features

### 🎭 User Features

- **Event Discovery**: Browse upcoming theater productions, academic events, and performances
- **Interactive Seat Selection**: Real-time seat map with availability status
- **Secure Reservations**: Book seats with payment integration
- **Digital Tickets**: QR code generation for easy venue entry
- **Email Confirmations**: Automated ticket delivery via email
- **Account Management**: Profile management and booking history

### 👑 Admin Features

- **Event Management**: Create, edit, and manage events
- **Seat Configuration**: Flexible seating arrangements (Orchestra, Balcony, Lodges, VIP)
- **User Management**: Monitor user accounts and reservations
- **Analytics Dashboard**: Event performance and revenue insights
- **Reservation Monitoring**: Real-time booking status and check-in management

### 🔒 Security & Performance

- JWT-based authentication with role-based access control
- Input validation and sanitization
- Rate limiting and CSRF protection
- Optimized database queries with Sequelize ORM
- Responsive design with Tailwind CSS

## 🛠️ Technology Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for modern, responsive styling
- **React Router** for client-side routing
- **Axios** for API communication
- **Lucide React** for beautiful icons

### Backend

- **Node.js** with Express.js framework
- **Sequelize ORM** with MySQL database
- **JWT** for authentication
- **Nodemailer** for email services
- **QRCode** generation for digital tickets
- **Express Rate Limit** for API protection

### Database Schema

- **Users**: Authentication and profile management
- **Events**: Event details and configurations
- **Seats**: Seating arrangements and availability
- **Reservations**: Booking records and status
- **Payments**: Transaction history and processing

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Installation

1. **Setup the database**

   ```sql
   CREATE DATABASE upat_ticketing;
   ```

2. **Configure environment variables**

   Create `server/.env`:

   ```env
   NODE_ENV=development
   PORT=3001
   CLIENT_URL=http://localhost:5173

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=upat_ticketing
   DB_USER=root
   DB_PASSWORD=your_password_here

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password_here
   EMAIL_FROM=UPAT Ticketing System <noreply@upat.edu.ph>
   ```

   The `.env` file in the root is already configured:

   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

   For Google login, also set:

   - In `server/.env`:
     ```env
     GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     ```
   - In project root `.env.local` (create if missing):
     ```env
     VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     ```

3. **Install dependencies**

   ```bash
   # Frontend dependencies
   npm install

   # Backend dependencies
   cd server
   npm install
   ```

4. **Start the development servers**

   Terminal 1 (Backend):

   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 (Frontend):

   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api

### Default Admin Account

After the first run, create an admin account through the registration form, then manually update the user role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your_admin_email@example.com';
```

## 📊 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Events

- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/seats` - Get event seats

### Reservations

- `POST /api/reservations` - Create reservation
- `GET /api/reservations` - Get user reservations
- `PUT /api/reservations/:id/cancel` - Cancel reservation

### Admin

- `GET /api/admin/dashboard` - Dashboard statistics
- `POST /api/admin/events` - Create event
- `GET /api/admin/events` - Get all events (admin)
- `PUT /api/admin/events/:id` - Update event

## 🎨 UI/UX Design

The application features a modern, luxury-themed design with:

- **Dark theme** with gold accents for elegance
- **Responsive design** that works on all devices
- **Interactive animations** for enhanced user experience
- **Accessibility features** with proper contrast and keyboard navigation
- **Loading states** and error handling for smooth interactions

### Color Palette

- **Primary**: Deep navy (#1a1a2e) and night blue (#16213e)
- **Accent**: Luxury gold (#D4AF37) and champagne (#F7E7CE)
- **Status colors**: Green (available), Red (reserved), Blue (selected)

## 🔧 Development

### Available Scripts

**Frontend:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

### Project Structure Guidelines

- Use TypeScript for type safety
- Follow React functional components with hooks
- Implement proper error boundaries and loading states
- Use Tailwind CSS utility classes for styling
- Follow RESTful API conventions
- Implement comprehensive input validation

## 🚀 Deployment

### Frontend (Vercel/Netlify)

1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in hosting platform

### Backend (Railway/Heroku)

1. Set up environment variables
2. Configure database connection
3. Deploy with auto-scaling enabled

### Database (PlanetScale/Amazon RDS)

1. Create production database
2. Run migrations: `npm run migrate`
3. Seed initial data if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Payment gateway integration (PayMaya, GCash)
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Social media integration
- [ ] Waitlist functionality for sold-out events
- [ ] Group booking discounts
- [ ] Event recommendations based on user preferences

## 📞 Support

For support and questions:

- Email: support@upat.edu.ph
- GitHub Issues: Create an issue for bug reports

---

Built with ❤️ for the University of Makati Performing Arts and Theater
