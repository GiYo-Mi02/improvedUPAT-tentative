import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">404</h1>
      <p className="mt-4 text-2xl font-semibold text-luxury-champagne">Page not found</p>
      <p className="mt-2 text-gray-300 max-w-xl">The page you’re looking for doesn’t exist or was moved.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary">Go Home</Link>
        <button onClick={() => window.history.back()} className="btn-secondary">Go Back</button>
      </div>
    </div>
  );
};

export default NotFound;
