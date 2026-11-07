import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './CtaBand.module.css';
import Reveal from './motion/Reveal';

export default function CtaBand() {
  return (
    <section className={styles.band} aria-labelledby="cta-title">
      <div className={styles.overlay} aria-hidden="true" />
      <Reveal className={`container ${styles.inner}`}>
        <h2 id="cta-title" className={styles.title}>
          Let&apos;s Work Together
        </h2>
        <p className={styles.text}>
          Have a project in mind, in Arabic, English, or both?
          <br />
          Tell me about it and let&apos;s build something that works.
        </p>
        <Link href="/work-with-me" className="btn btn-primary">
          Get In Touch
          <ArrowRight size={18} aria-hidden className="flip-rtl" />
        </Link>
      </Reveal>
    </section>
  );
}
