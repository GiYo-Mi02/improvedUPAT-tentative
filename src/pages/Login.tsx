import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import Reveal from '../components/ui/Reveal';
import AuthCarousel from '../components/ui/AuthCarousel';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      showToast('Welcome back!', 'success');
      navigate(from, { replace: true });
    } catch (error: any) {
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-luxury-gold blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-luxury-deep blur-3xl" />
      </div>

      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left: Carousel */}
          <Reveal className="hidden md:block" variant="left">
            <AuthCarousel
              images={[
                { src: '/officers/cristof.jpg', alt: 'CCIS Council - Cristof', caption: 'Capturing Moments, Creating Memories' },
                { src: '/officers/czybelle.jpg', alt: 'CCIS Council - Czybelle', caption: 'UPAT Community and Culture' },
                { src: '/officers/james.jpg', alt: 'CCIS Council - James', caption: 'Experience the Performance' },
                { src: '/officers/jeane.jpg', alt: 'CCIS Council - Jeane', caption: 'Reserve your seats with ease' },
              ]}
            />
          </Reveal>

          {/* Right: Form */}
          <div>
            <div className="card-luxury h-full p-8 border border-luxury-gold/20 flex flex-col justify-center">
          <Reveal className="text-center">
            <div className="inline-flex items-center gap-2 bg-luxury-gold/15 border border-luxury-gold/30 backdrop-blur px-4 py-1.5 rounded-full mb-4">
              <span className="text-[11px] tracking-widest text-luxury-gold uppercase">Secure Access</span>
            </div>
            <h2 className="text-3xl font-heading font-normal text-white">Welcome Back</h2>
            <p className="mt-2 text-gray-400">Sign in to your CCIS account</p>
          </Reveal>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <Reveal className="space-y-4" variant="up">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-luxury pl-10 w-full"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="input-luxury pl-10 pr-10 w-full"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </Reveal>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-luxury-deep"></div>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>

            <Reveal className="text-center" variant="up" delay={60}>
              <p className="text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-luxury-gold hover:text-yellow-500 transition-colors">
                  Sign up here
                </Link>
              </p>
            </Reveal>
          </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
