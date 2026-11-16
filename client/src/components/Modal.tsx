import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  large?: boolean;
  wide?: boolean;
  busy?: boolean;
  busyLabel?: string;
}

let openModals = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function lockPageScroll(): void {
  if (openModals === 0) {
    const { body } = document;
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    body.classList.add('modal-open');
  }
  openModals += 1;
}

function unlockPageScroll(): void {
  openModals = Math.max(0, openModals - 1);
  if (openModals > 0) return;
  const { body } = document;
  body.style.overflow = savedOverflow;
  body.style.paddingRight = savedPaddingRight;
  body.classList.remove('modal-open');
}

export default function Modal({
  title,
  onClose,
  children,
  large = false,
  wide = false,
  busy = false,
  busyLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  function handleTab(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') return;
    const node = dialogRef.current;
    if (!node) return;
    const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement,
    );
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, busy]);

  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);

  const className = ['modal', large ? 'modal-lg' : '', wide ? 'modal-wide' : '']
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      className="modal-overlay"
      data-testid="modal-overlay"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-busy={busy || undefined}
        data-testid="modal"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleTab}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
        {busy && (
          <div className="modal-busy" role="status" aria-live="polite">
            <div className="spinner modal-busy-spinner" />
            {busyLabel && <span className="modal-busy-label">{busyLabel}</span>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
