import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, UserPlus } from 'lucide-react';
import Reveal from '../components/ui/Reveal';
import AuthCarousel from '../components/ui/AuthCarousel';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    studentId: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        studentId: formData.studentId || undefined,
        role: formData.role,
      });
      showToast('Account created successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -top-16 right-0 w-72 h-72 rounded-full bg-luxury-gold blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-luxury-deep blur-3xl" />
      </div>

      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left: Carousel */}
          <Reveal className="hidden md:block" variant="left">
            <AuthCarousel
              images={[
                { src: '/officers/isabel.jpg', alt: 'CCIS Council - Isabel', caption: 'Join the CCIS Community' },
                { src: '/officers/pole.jpg', alt: 'CCIS Council -Pole', caption: 'Creativity turns ideas to Reality' },
                { src: '/officers/raem.jpg', alt: 'CCIS Council - Raem', caption: 'Create your account and start booking' },
                { src: '/officers/shaina.jpg', alt: 'CCIS Council - Shaina', caption: 'Discover upcoming events' },
                { src: '/officers/shaun.jpg', alt: 'CCIS Council - Shaun', caption: 'Enjoy a seamless ticketing experience' },
              ]}
            />
          </Reveal>

          {/* Right: Form */}
          <div>
            <div className="card-luxury h-full p-8 border border-luxury-gold/20 flex flex-col justify-center">
          <Reveal className="text-center">
            <div className="inline-flex items-center gap-2 bg-luxury-gold/15 border border-luxury-gold/30 backdrop-blur px-4 py-1.5 rounded-full mb-4">
              <span className="text-[11px] tracking-widest text-luxury-gold uppercase">Create Account</span>
            </div>
            <h2 className="text-3xl font-heading font-normal text-white">Join CCIS</h2>
            <p className="mt-2 text-gray-400">Create your account to start booking tickets</p>
          </Reveal>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <Reveal className="space-y-4" variant="up">
              <div>
                <label htmlFor="name" className="sr-only">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="name" name="name" type="text" autoComplete="name" required className="input-luxury pl-10 w-full" placeholder="Full Name" value={formData.name} onChange={handleChange} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="email" name="email" type="email" autoComplete="email" required className="input-luxury pl-10 w-full" placeholder="Email address" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div>
                <label htmlFor="studentId" className="sr-only">Student ID (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="studentId" name="studentId" type="text" className="input-luxury pl-10 w-full" placeholder="Student ID (Optional)" value={formData.studentId} onChange={handleChange} />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="sr-only">Phone Number (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="phone" name="phone" type="tel" className="input-luxury pl-10 w-full" placeholder="Phone Number (Optional)" value={formData.phone} onChange={handleChange} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required className="input-luxury pl-10 pr-10 w-full" placeholder="Password" value={formData.password} onChange={handleChange} />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (<EyeOff className="h-5 w-5 text-gray-400" />) : (<Eye className="h-5 w-5 text-gray-400" />)}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-luxury-gold/80" />
                  </div>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required className="input-luxury pl-10 pr-10 w-full" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? (<EyeOff className="h-5 w-5 text-gray-400" />) : (<Eye className="h-5 w-5 text-gray-400" />)}
                  </button>
                </div>
              </div>
            </Reveal>

            <div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-luxury-deep"></div>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>

            <Reveal className="text-center" variant="up" delay={60}>
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-luxury-gold hover:text-yellow-500 transition-colors">
                  Sign in here
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

export default Register;
