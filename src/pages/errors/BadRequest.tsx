import { Link } from 'react-router-dom';

const BadRequest = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">400</h1>
      <p className="mt-4 text-2xl font-semibold text-luxury-champagne">Bad request</p>
      <p className="mt-2 text-gray-300 max-w-xl">The request could not be understood or was missing required parameters.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );
};

export default BadRequest;
