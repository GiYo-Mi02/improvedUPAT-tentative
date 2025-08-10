import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">401</h1>
      <p className="mt-4 text-2xl font-semibold text-luxury-champagne">You need to log in</p>
      <p className="mt-2 text-gray-300 max-w-xl">Please sign in to access this page.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/login" className="btn-primary">Go to Login</Link>
        <Link to="/" className="btn-secondary">Back to Home</Link>
      </div>
    </div>
  );
};

export default Unauthorized;
