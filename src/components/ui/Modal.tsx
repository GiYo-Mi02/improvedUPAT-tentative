import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string; 
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, maxWidthClass = 'max-w-2xl', children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClass} mx-4`} role="dialog" aria-modal="true">
        <div className="card-luxury p-5 shadow-xl">
          <div className="flex items-start justify-between mb-3">
            {title ? <h3 className="text-lg font-medium text-white">{title}</h3> : <span />}
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-white rounded px-2 py-1"
            >
              ✕
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
