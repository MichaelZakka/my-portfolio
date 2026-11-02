'use client';

import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import styles from './confirmDialog.module.css';

/**
 * In-page replacement for window.confirm: a native modal <dialog> (focus is
 * trapped, Esc and the backdrop cancel) in the site's own design.
 * `await confirmDialog({ message })` resolves true on confirm, false otherwise.
 * Labels are passed in because the dialog renders outside the app's providers.
 */
export type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive action: the confirm button is red. */
  danger?: boolean;
};

function Dialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose(false);
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      dir="auto"
      aria-labelledby={options.title ? 'confirm-title' : undefined}
      aria-describedby="confirm-message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
    >
      <div className={styles.body}>
        {options.title && (
          <h2 id="confirm-title" className={styles.title}>
            {options.title}
          </h2>
        )}
        <p id="confirm-message" className={styles.message}>
          {options.message}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => onClose(false)}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            className={`${styles.confirm} ${options.danger ? styles.danger : ''}`}
            autoFocus
            onClick={() => onClose(true)}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const returnFocus = document.activeElement as HTMLElement | null;
    const close = (ok: boolean) => {
      root.unmount();
      host.remove();
      returnFocus?.focus();
      resolve(ok);
    };
    root.render(<Dialog options={options} onClose={close} />);
  });
}
