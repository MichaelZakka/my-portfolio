import styles from './Footer.module.css';
import { Github, Linkedin, Mail } from 'lucide-react';
import { EMAIL, GITHUB_URL, JOB_TITLE, LINKEDIN_URL } from '../lib/site';

export default function Footer() {
  const socialLinks = [
    ...(GITHUB_URL ? [{ name: 'GitHub', url: GITHUB_URL, icon: Github }] : []),
    { name: 'LinkedIn', url: LINKEDIN_URL, icon: Linkedin },
    { name: 'Email', url: `mailto:${EMAIL}`, icon: Mail },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.bar}`}>
        <div className={styles.brand}>
          <p className={styles.name}>
            Michael <span className={styles.accent}>Zakka</span>
          </p>
          <p className={styles.role}>{JOB_TITLE}</p>
        </div>

        <p className={styles.copyright}>
          © {new Date().getFullYear()} Michael Zakka. All rights reserved.
        </p>

        <ul className={styles.links}>
          {socialLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <li key={link.name}>
                <a
                  href={link.url}
                  className={styles.socialLink}
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  title={link.name}
                >
                  <IconComponent size={18} strokeWidth={2} aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
