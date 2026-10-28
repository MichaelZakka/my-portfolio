import { Github, Linkedin, Mail } from 'lucide-react';
import styles from './Contact.module.css';
import Reveal from './motion/Reveal';
import ContactForm from './ContactForm';
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from '../lib/site';

export default function Contact() {
  const channels = [
    { icon: Mail, label: 'Email', value: EMAIL, href: `mailto:${EMAIL}` },
    { icon: Linkedin, label: 'LinkedIn', value: 'in/michael-zakka', href: LINKEDIN_URL },
    ...(GITHUB_URL
      ? [{ icon: Github, label: 'GitHub', value: GITHUB_URL.replace('https://', ''), href: GITHUB_URL }]
      : []),
  ];

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="08">Contact</p>
          <h2 id="contact-title" className="section-title">
            Get In Touch
          </h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className={styles.description}>
            Hiring for a frontend role, or want to talk about a project? Send a message or reach me
            directly.
          </p>
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
