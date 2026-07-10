import { useEffect, useRef } from 'react';

// LEARN (sprint 14): an accessible modal has to do several things a <div> won't:
// - role="dialog" + aria-modal + a labelled title, so a screen reader announces
//   it as a dialog and not just some text that appeared.
// - TRAP focus inside while open (Tab from the last element wraps to the first),
//   so keyboard users can't tab out into the page behind the overlay.
// - Close on Escape.
// - Return focus to the element that opened it when it closes — otherwise the
//   keyboard user is dumped at the top of the page with no idea where they are.
//
// LEARN (sprint 14 review fix): the focus-RETURN. We save the trigger when the
// dialog opens and restore focus to it on close (WCAG 2.4.3). Without it the
// keyboard user is dumped on <body> at the top of the page — the review caught
// exactly that.
export function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Remember what had focus so we can (should) restore it on close.
    previouslyFocused.current = document.activeElement;

    // Move focus into the dialog.
    const dialog = dialogRef.current;
    const focusables = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusables[0] ?? dialog).focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      // Focus trap: wrap Tab / Shift+Tab at the edges.
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to whatever opened the dialog (WCAG 2.4.3). Guard with
      // optional chaining in case the trigger was removed while the modal was up.
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="gj-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="gj-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="gj-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
