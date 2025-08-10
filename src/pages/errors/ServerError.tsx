import { Link } from 'react-router-dom';

type Props = {
  onRetry?: () => void;
  error?: Error;
};

const ServerError = ({ onRetry, error }: Props) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">500</h1>
      <p className="mt-4 text-2xl font-semibold text-luxury-champagne">Something went wrong</p>
      {error && (
        <p className="mt-2 text-gray-400 max-w-2xl text-sm">{error.message}</p>
      )}
      <div className="mt-8 flex gap-3">
        {onRetry && (
          <button className="btn-primary" onClick={onRetry}>Try Again</button>
        )}
        <button className="btn-secondary" onClick={() => window.location.reload()}>Reload Page</button>
        <Link to="/" className="btn-secondary">Go Home</Link>
      </div>
    </div>
  );
};

export default ServerError;
