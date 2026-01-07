import styles from './Footer.module.css';
import { Linkedin, Github, Mail } from 'lucide-react';

export default function Footer() {
  const socialLinks = [
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/in/michael-zakka',
      icon: Linkedin,
    },
    {
      name: 'GitHub',
      url: 'https://github.com/MichaelZakka',
      icon: Github,
    },
    {
      name: 'Email',
      url: 'mailto:michealzakka@gmail.com',
      icon: Mail,
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.branding}>
            <h3 className={styles.name}>Michael Zakka</h3>
            <p className={styles.tagline}>
              Building the future, one line of code at a time.
            </p>
          </div>
          
          <div className={styles.socialLinks}>
            <h4 className={styles.socialTitle}>Connect With Me</h4>
            <div className={styles.links}>
              {socialLinks.map((link, idx) => {
                const IconComponent = link.icon;
                return (
                  <a
                    key={idx}
                    href={link.url}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    title={link.name}
                  >
                    <IconComponent size={24} strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Michael Zakka. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

