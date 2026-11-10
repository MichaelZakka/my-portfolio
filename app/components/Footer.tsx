import { getLocale, getTranslations } from 'next-intl/server';
import styles from './Footer.module.css';
import { LockKeyhole, Mail, type LucideIcon } from 'lucide-react';
import { getPortfolio } from '../lib/content/portfolio';
import { SOCIAL_ICONS } from '../lib/content/icons';

type FooterLink = { key: string; name: string; url: string; icon: LucideIcon };

export default async function Footer() {
  const t = await getTranslations();
  const locale = await getLocale();
  const { profile, socials } = await getPortfolio(locale);
  const socialLinks: FooterLink[] = [
    ...socials
      .filter((s) => s.footer)
      .map((s) => ({ key: s.id, name: s.name, url: s.url, icon: SOCIAL_ICONS[s.platform] })),
    ...(profile.email ? [{ key: 'email', name: t('contact.email'), url: `mailto:${profile.email}`, icon: Mail }] : []),
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.bar}`}>
        <div className={styles.brand}>
          <p className={styles.name}>
            Michael <span className={styles.accent}>Zakka</span>
          </p>
          <p className={styles.role}>
            {t('meta.jobTitle').replace(/\s*\([^)]*\)/, '')}
          </p>
        </div>

        <div className={styles.center}>
          <p className={styles.copyright}>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p className={styles.built}>
            {t('footer.builtWith')}
            {profile.sourceRepoUrl && (
              <>
                {', '}
                <a href={profile.sourceRepoUrl} target="_blank" rel="noopener noreferrer">
                  {t('footer.viewSource')}
                </a>
              </>
            )}
          </p>
        </div>

        <div className={styles.actions}>
          {/* A plain <a>: the portal isn't locale-prefixed and has its own root layout. */}
          <a href={`/portal/enter?lang=${locale}`} className={styles.portalLink} rel="nofollow">
            <LockKeyhole size={16} strokeWidth={2} aria-hidden />
            {t('footer.clientLogin')}
          </a>
          <ul className={styles.links} aria-label={t('footer.social')}>
            {socialLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <li key={link.key}>
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
      </div>
    </footer>
  );
}
