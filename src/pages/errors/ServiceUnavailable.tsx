import { Link } from 'react-router-dom';

const ServiceUnavailable = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">503</h1>
      <p className="mt-4 text-2xl font-semibold text-luxury-champagne">Service unavailable</p>
      <p className="mt-2 text-gray-300 max-w-xl">The service is temporarily unavailable. Please try again later.</p>
      <div className="mt-8 flex gap-3">
        <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        <Link to="/" className="btn-secondary">Go Home</Link>
      </div>
    </div>
  );
};

export default ServiceUnavailable;
