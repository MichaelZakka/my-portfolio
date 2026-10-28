import { MapPin, Mail, Phone, Languages, Download } from 'lucide-react';
import styles from './About.module.css';
import Reveal from './motion/Reveal';
import { RESUME_URL } from '../lib/site';

const INFO = [
  { icon: MapPin, label: 'Location', value: 'Damascus, Syria' },
  { icon: Mail, label: 'Email', value: 'michealzakka@gmail.com', href: 'mailto:michealzakka@gmail.com' },
  { icon: Phone, label: 'Phone / WhatsApp', value: '+963 992 833 739', href: 'tel:+963992833739', ltr: true },
  { icon: Languages, label: 'Languages', value: 'Arabic, English' },
];

export default function About() {
  return (
    <section id="about" className="section">
      <div className={`container ${styles.grid}`}>
        <Reveal>
          <p className="eyebrow" data-index="01">About Me</p>
          <h2 className="section-title">Building Solutions That Make an Impact</h2>
          <p className={styles.paragraph}>
            I&apos;m a frontend developer in Damascus who builds production websites and web apps
            with React, Next.js and TypeScript. I&apos;ve shipped bilingual Arabic/English sites for
            businesses in Saudi Arabia, handling RTL layouts, responsive design and Vercel
            deployments end to end. I care about fast pages, accessible UI and components that stay
            easy to change. I&apos;m looking for a frontend role on a product team where I can own
            features from design to production.
          </p>

          <a href={RESUME_URL} download className="btn btn-primary">
            Download Resume
            <Download size={17} aria-hidden />
          </a>
        </Reveal>

        <Reveal index={1} className={`card ${styles.infoCard}`}>
          <dl>
            {INFO.map(({ icon: Icon, label, value, href, ltr }) => (
              <div key={label} className={styles.infoRow}>
                <Icon size={22} aria-hidden className={styles.infoIcon} />
                <div>
                  <dt className={styles.infoLabel}>{label}</dt>
                  <dd className={styles.infoValue} dir={ltr ? 'ltr' : undefined}>
                    {href ? <a href={href}>{value}</a> : value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
