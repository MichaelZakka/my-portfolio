'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import styles from './MediaLightbox.module.css';

export type LightboxItem = { id: string; src: string; title: string; meta: string };

/**
 * Full-size view of one image from a gallery, as a native modal <dialog>
 * (focus trap, Escape and inert page come from the browser). Previous/next
 * buttons and the arrow keys move through the gallery; in right-to-left
 * pages the arrows follow reading direction.
 */
export default function MediaLightbox({
  items,
  index,
  onIndex,
  onClose,
  labels,
}: {
  items: LightboxItem[];
  /** The open item, or null when closed. */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  labels: { close: string; previous: string; next: string; download: string; position: (n: number, total: number) => string };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const item = index !== null ? items[index] : undefined;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  const go = (step: number) => {
    if (index === null || items.length < 2) return;
    onIndex((index + step + items.length) % items.length);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    event.preventDefault();
    go(forward ? 1 : -1);
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={item?.title}
      onClose={onClose}
      onKeyDown={onKeyDown}
      // A click on the backdrop (the dialog box itself, outside the content) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      {item && (
        <div className={styles.frame}>
          <div className={styles.bar}>
            <div className={styles.caption}>
              <span className={styles.title}>
                <bdi>{item.title}</bdi>
              </span>
              <span className={styles.meta}>
                {item.meta}
                {items.length > 1 && ` · ${labels.position(index! + 1, items.length)}`}
              </span>
            </div>
            <a href={item.src} className={styles.button} download aria-label={`${labels.download}: ${item.title}`}>
              <Download size={18} aria-hidden="true" />
            </a>
            <button type="button" className={styles.button} onClick={() => ref.current?.close()} aria-label={labels.close} autoFocus>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.stage}>
            {items.length > 1 && (
              <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(-1)} aria-label={labels.previous}>
                <ChevronLeft size={22} aria-hidden="true" className="flip-rtl" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- private files stream through an authorized route */}
            <img key={item.id} src={item.src} alt={item.title} className={styles.image} />
            {items.length > 1 && (
              <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(1)} aria-label={labels.next}>
                <ChevronRight size={22} aria-hidden="true" className="flip-rtl" />
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
