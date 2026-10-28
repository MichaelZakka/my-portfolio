import { useTranslations } from 'next-intl';
import { Github, Linkedin, Mail } from 'lucide-react';
import styles from './Contact.module.css';
import Reveal from './motion/Reveal';
import ContactForm from './ContactForm';
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from '../lib/site';

export default function Contact() {
  const t = useTranslations('contact');
  const channels = [
    { icon: Mail, label: t('email'), value: EMAIL, href: `mailto:${EMAIL}` },
    { icon: Linkedin, label: t('linkedin'), value: 'in/michael-zakka', href: LINKEDIN_URL },
    ...(GITHUB_URL
      ? [{ icon: Github, label: t('github'), value: GITHUB_URL.replace('https://', ''), href: GITHUB_URL }]
      : []),
  ];

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="08">{t('eyebrow')}</p>
          <h2 id="contact-title" className="section-title">
            {t('title')}
          </h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className={styles.description}>{t('description')}</p>
        </Reveal>

        <div className={styles.layout}>
          <ul className={styles.channels}>
            {channels.map(({ icon: Icon, label, value, href }, idx) => (
              <Reveal as="li" key={label} index={idx} className={styles.item}>
                <a
                  href={href}
                  className={`card card-interactive ${styles.channel}`}
                  {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span className={styles.icon}>
                    <Icon size={22} aria-hidden />
                  </span>
                  <span>
                    <span className={styles.label}>{label}</span>
                    <span className={styles.value} dir="ltr">
                      {value}
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
          <Reveal index={1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
