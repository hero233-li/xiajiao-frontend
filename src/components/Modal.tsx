import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}
const modalStack: string[] = [];
let initialInert = false;
let initialOverflow = '';
const selector =
  'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
export function Modal({ open, title, onClose, children }: ModalProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const first = modalStack.length === 0;
    modalStack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const app = document.getElementById('root');
    if (first) {
      initialInert = app?.inert ?? false;
      initialOverflow = document.body.style.overflow;
    }
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>(selector) ?? []).filter(
        (element) =>
          !element.closest('[hidden],[inert]') && element.getAttribute('aria-hidden') !== 'true',
      );
    (focusable()[0] ?? panel.current)?.focus();
    const trap = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) {
        event.preventDefault();
        panel.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const guard = (event: FocusEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (!panel.current?.contains(event.target as Node))
        (focusable()[0] ?? panel.current)?.focus();
    };
    document.addEventListener('keydown', trap);
    document.addEventListener('focusin', guard);
    return () => {
      modalStack.splice(modalStack.indexOf(id), 1);
      document.removeEventListener('keydown', trap);
      document.removeEventListener('focusin', guard);
      if (app) app.inert = modalStack.length ? true : initialInert;
      document.body.style.overflow = modalStack.length ? 'hidden' : initialOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, id]);
  if (!open) return null;
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={id}>{title}</h2>
          <Button variant="ghost" aria-label="关闭弹窗" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
