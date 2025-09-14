import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

import AdminRoute from './components/auth/AdminRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Footer from './components/layout/Footer';
import Navbar from './components/layout/Navbar';

import ErrorBoundary from './components/ui/ErrorBoundary';
import Toast from './components/ui/Toast';

const Council = lazy(() => import('./pages/Council'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const Profile = lazy(() => import('./pages/Profile'));
const Register = lazy(() => import('./pages/Register'));
const ReserveSeats = lazy(() => import('./pages/ReserveSeats'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminEvents = lazy(() => import('./pages/admin/Events'));
const AdminReservations = lazy(() => import('./pages/admin/Reservations'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminGallery = lazy(() => import('./pages/admin/Gallery'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));

const BadRequest = lazy(() => import('./pages/errors/BadRequest'));
const Forbidden = lazy(() => import('./pages/errors/Forbidden'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));
const ServerError = lazy(() => import('./pages/errors/ServerError'));
const ServiceUnavailable = lazy(() => import('./pages/errors/ServiceUnavailable'));
const Unauthorized = lazy(() => import('./pages/errors/Unauthorized'));

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
              <Suspense fallback={<div className="text-gray-400 p-6">Loading…</div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/council" element={<Council />} />

                {/* Protected Routes */}
                <Route path="/reserve/:eventId" element={
                  <ProtectedRoute>
                    <ReserveSeats />
                  </ProtectedRoute>
                } />
                <Route path="/my-tickets" element={
                  <ProtectedRoute>
                    <MyTickets />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin/events" element={
                  <AdminRoute>
                    <AdminEvents />
                  </AdminRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                } />
                <Route path="/admin/reservations" element={
                  <AdminRoute>
                    <AdminReservations />
                  </AdminRoute>
                } />
                <Route path="/admin/gallery" element={
                  <AdminRoute>
                    <AdminGallery />
                  </AdminRoute>
                } />
                <Route path="/admin/announcements" element={
                  <AdminRoute>
                    <AdminAnnouncements />
                  </AdminRoute>
                } />
                {/* Error Routes */}
                <Route path="/401" element={<Unauthorized />} />
                <Route path="/403" element={<Forbidden />} />
                <Route path="/400" element={<BadRequest />} />
                <Route path="/500" element={<ServerError />} />
                <Route path="/503" element={<ServiceUnavailable />} />
                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
          <Toast />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
