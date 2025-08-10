import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import ReserveSeats from './pages/ReserveSeats';
import MyTickets from './pages/MyTickets';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/Events';
import AdminUsers from './pages/admin/Users';
import AdminReservations from './pages/admin/Reservations';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Toast from './components/ui/Toast';
import Council from './pages/Council';
import NotFound from './pages/errors/NotFound';
import ServerError from './pages/errors/ServerError';
import Unauthorized from './pages/errors/Unauthorized';
import Forbidden from './pages/errors/Forbidden';
import BadRequest from './pages/errors/BadRequest';
import ServiceUnavailable from './pages/errors/ServiceUnavailable';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
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
                {/* Error Routes */}
                <Route path="/401" element={<Unauthorized />} />
                <Route path="/403" element={<Forbidden />} />
                <Route path="/400" element={<BadRequest />} />
                <Route path="/500" element={<ServerError />} />
                <Route path="/503" element={<ServiceUnavailable />} />
                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
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
