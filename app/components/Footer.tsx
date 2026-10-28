import { useTranslations } from 'next-intl';
import styles from './Footer.module.css';
import JobTitle from './JobTitle';
import { Github, Linkedin, Mail } from 'lucide-react';
import { EMAIL, GITHUB_URL, LINKEDIN_URL, SOURCE_REPO_URL } from '../lib/site';

export default function Footer() {
  const t = useTranslations();
  const socialLinks = [
    ...(GITHUB_URL ? [{ name: 'GitHub', url: GITHUB_URL, icon: Github }] : []),
    { name: 'LinkedIn', url: LINKEDIN_URL, icon: Linkedin },
    { name: t('contact.email'), url: `mailto:${EMAIL}`, icon: Mail },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.bar}`}>
        <div className={styles.brand}>
          <p className={styles.name}>
            Michael <span className={styles.accent}>Zakka</span>
          </p>
          <p className={styles.role}>
            <JobTitle title={t('meta.jobTitle')} />
          </p>
        </div>

        <div className={styles.center}>
          <p className={styles.copyright}>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p className={styles.built}>
            {t('footer.builtWith')}
            {SOURCE_REPO_URL && (
              <>
                {', '}
                <a href={SOURCE_REPO_URL} target="_blank" rel="noopener noreferrer">
                  {t('footer.viewSource')}
                </a>
              </>
            )}
          </p>
        </div>

        <ul className={styles.links} aria-label={t('footer.social')}>
          {socialLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <li key={link.name}>
                <a
                  href={link.url}
                  className={styles.socialLink}
                  {...(link.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
