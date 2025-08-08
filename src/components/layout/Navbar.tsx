import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Menu, 
  X, 
  User, 
  Calendar, 
  Ticket, 
  Settings, 
  LogOut,
  Crown,
  Theater
} from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { state, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Theater },
    { to: '/events', label: 'Events', icon: Calendar },
    { to: '/council', label: 'Council', icon: User },
  ];

  const userLinks = [
    { to: '/my-tickets', label: 'My Tickets', icon: Ticket },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: Settings },
    { to: '/admin/events', label: 'Manage Events', icon: Calendar },
    { to: '/admin/users', label: 'Users', icon: User },
    { to: '/admin/reservations', label: 'Reservations', icon: Ticket },
  ];

  return (
    <nav className="bg-luxury-deep/95 backdrop-blur-md border-b border-luxury-gold/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-3xl">
              <img
                src="./logo (1).png"
                alt="CCIS Student Council Logo"
                className="h-8 w-8"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-heading font-normal text-white">
                CCIS Student Council
              </h1>
              <p className="text-xs text-luxury-champagne opacity-80">
                College of Computing Information Sciences
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-200 ${
                      isActive
                        ? 'bg-luxury-gold text-luxury-deep'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {state.isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-luxury-gold to-yellow-500 flex items-center justify-center">
                      {isAdmin && <Crown className="h-4 w-4 text-luxury-deep" />}
                      {!isAdmin && <User className="h-4 w-4 text-luxury-deep" />}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 max-h-80 overflow-y-auto scrollbar-luxury">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                          <p className="font-medium text-white">{state.user?.name}</p>
                          <p className="text-xs text-luxury-gold">{state.user?.role?.toUpperCase()}</p>
                        </div>

                        {userLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.to}
                              to={link.to}
                              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{link.label}</span>
                            </Link>
                          );
                        })}

                        {(isAdmin || isStaff) && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            {adminLinks.map((link) => {
                              const Icon = link.icon;
                              return (
                                <Link
                                  key={link.to}
                                  to={link.to}
                                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                  onClick={() => setShowUserMenu(false)}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{link.label}</span>
                                </Link>
                              );
                            })}
                          </>
                        )}

                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 max-h-[70vh] overflow-y-auto scrollbar-luxury">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-luxury-gold text-luxury-deep'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {state.isAuthenticated ? (
              <>
                <div className="border-t border-gray-700 pt-4">
                  <div className="px-3 py-2">
                    <div className="text-base font-medium text-white">{state.user?.name}</div>
                    <div className="text-sm font-medium text-luxury-gold">{state.user?.email}</div>
                  </div>
                </div>

                {userLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                {(isAdmin || isStaff) && (
                  <>
                    <div className="border-t border-gray-700 pt-2">
                      {adminLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setIsOpen(false)}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <div className="border-t border-gray-700 pt-4 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-lg text-base font-medium bg-luxury-gold text-luxury-deep hover:bg-yellow-500"
                  onClick={() => setIsOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
