<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# UPAT Ticketing System - Copilot Instructions

This is a full-stack web application for the University of Makati Performing Arts and Theater (UPAT) ticketing system.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Sequelize ORM
- **Database**: MySQL
- **Authentication**: JWT with role-based access control
- **UI Components**: Lucide React icons, custom Tailwind components

## Code Standards

### Frontend (React/TypeScript)

- Use functional components with React hooks
- Implement TypeScript interfaces for all props and data structures
- Use custom hooks for reusable logic
- Follow the established folder structure: `components/`, `pages/`, `contexts/`, `services/`
- Use Tailwind CSS utility classes for styling
- Implement proper error handling with try-catch blocks
- Use the `useAuth` and `useToast` contexts for authentication and notifications

### Backend (Node.js/Express)

- Use CommonJS syntax (require/module.exports)
- Implement proper error handling middleware
- Use Sequelize ORM for database operations
- Follow RESTful API conventions
- Implement input validation with express-validator
- Use JWT for authentication and role-based access control
- Follow the MVC pattern: routes → controllers → models

### Styling Guidelines

- Use the luxury color palette: `luxury-deep`, `luxury-night`, `luxury-gold`, `luxury-champagne`
- Implement responsive design with mobile-first approach
- Use custom CSS classes like `btn-primary`, `btn-secondary`, `card-luxury`, `input-luxury`
- Maintain consistent spacing and typography
- Use gradients and shadows for modern luxury feel

### Security Considerations

- Always validate and sanitize user inputs
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on API endpoints
- Use CORS and helmet for security headers
- Hash passwords with bcryptjs
- Implement proper role-based access control

### Database Schema

- Users: id, name, email, password, role, studentId, phone, isActive
- Events: id, title, description, type, category, eventDate, venue, isPaid, prices
- Seats: id, eventId, section, row, number, isReserved, isVip, price, status
- Reservations: id, userId, eventId, seatId, reservationCode, status, totalAmount
- Payments: id, reservationId, amount, paymentMethod, status

## Key Features to Implement

1. Real-time seat selection with interactive seat maps
2. QR code generation for digital tickets
3. Email notifications for ticket confirmations
4. Admin dashboard with analytics
5. Event management with seat configuration
6. User profile and booking history
7. Payment integration (future enhancement)

## API Endpoints Structure

- `/api/auth/*` - Authentication routes
- `/api/events/*` - Event management
- `/api/seats/*` - Seat operations
- `/api/reservations/*` - Booking management
- `/api/admin/*` - Administrative functions

## Context Usage

- `AuthContext`: User authentication, login/logout, role checking
- `ToastContext`: Global notifications and alerts

When generating code, ensure consistency with the existing codebase and follow these established patterns.
