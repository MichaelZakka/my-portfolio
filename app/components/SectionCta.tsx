'use client';

import { ArrowRight } from 'lucide-react';
import styles from './SectionCta.module.css';
import { Link } from '../../i18n/navigation';
import { trackEvent } from '../lib/analyticsClient';

/**
 * One-line "Work with me" prompt at the end of a section.
 * Text comes translated from the server component (client messages are a picked subset).
 */
export default function SectionCta({
  text,
  button,
  label,
}: {
  text: string;
  button: string;
  label: string;
}) {
  return (
    <p className={styles.row}>
      <span className={styles.text}>{text}</span>
      <Link
        href="/work-with-me"
        className={styles.link}
        onClick={() => trackEvent('cta_click', { label })}
      >
        {button}
        <ArrowRight size={16} aria-hidden className="flip-rtl" />
      </Link>
    </p>
  );
}
