'use client';

import styles from './Contact.module.css';
import { Mail, Phone, MapPin } from 'lucide-react';
import { trackEvent } from '../lib/analyticsClient';
import Reveal from './motion/Reveal';

export default function Contact() {
  const items = [
    {
      icon: Mail,
      label: 'Email',
      value: 'michealzakka@gmail.com',
      href: 'mailto:michealzakka@gmail.com',
      track: 'mailto',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '+963 992 833 739',
      href: 'tel:+963992833739',
      track: 'tel',
    },
    { icon: MapPin, label: 'Location', value: 'Damascus - Syria' },
  ];

  return (
    <section id="contact" className="section">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="08">Contact</p>
          <h2 className="section-title">Get In Touch</h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className={styles.description}>
            I&apos;m always open to discussing new projects, creative ideas, or opportunities to be part
            of your vision. Feel free to reach out!
          </p>
        </Reveal>
        <ul className={styles.grid}>
          {items.map(({ icon: Icon, label, value, href, track }, idx) => (
            <Reveal as="li" key={label} index={idx} className={styles.item}>
              <div className={`card ${href ? 'card-interactive' : ''} ${styles.card}`}>
                <span className={styles.icon}>
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className={styles.label}>{label}</h3>
                {href ? (
                  <a
                    href={href}
                    className={styles.value}
                    dir={track === 'tel' ? 'ltr' : undefined}
                    onClick={() => trackEvent('cta_click', { label: track })}
                  >
                    {value}
                  </a>
                ) : (
                  <p className={styles.value}>{value}</p>
                )}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
