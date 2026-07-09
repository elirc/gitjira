import { useEffect } from 'react';

// LEARN: a minimal modal now; sprint 14 replaces it with a proper Radix-based
// one with focus trapping and full a11y. Building the throwaway version keeps
// this sprint about data, not dialogs — and naming its replacement sprint is
// honesty, not procrastination.
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="link-button" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
