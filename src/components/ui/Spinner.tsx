import React from 'react';

interface SpinnerProps { size?: number; className?: string; label?: string; }

const Spinner: React.FC<SpinnerProps> = ({ size = 32, className = '', label = 'Loading' }) => (
  <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status" aria-live="polite">
    <div
      className="animate-spin rounded-full border-b-2 border-luxury-gold border-t-transparent border-luxury-gold/40"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

export default Spinner;
