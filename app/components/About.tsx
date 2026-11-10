import { getLocale, getTranslations } from 'next-intl/server';
import { MapPin, Mail, Languages, Download, type LucideIcon } from 'lucide-react';
import styles from './About.module.css';
import Reveal from './motion/Reveal';
import { getPortfolio } from '../lib/content/portfolio';
import { SOCIAL_ICONS } from '../lib/content/icons';

type InfoRow = { key: string; icon: LucideIcon; label: string; value: string; href?: string; ltr?: boolean; external?: boolean };

export default async function About() {
  const t = await getTranslations('about');
  const { profile, socials } = await getPortfolio(await getLocale());

  const info: InfoRow[] = [
    { key: 'location', icon: MapPin, label: t('location'), value: t('locationValue') },
    ...(profile.email
      ? [{ key: 'email', icon: Mail, label: t('email'), value: profile.email, href: `mailto:${profile.email}`, ltr: true }]
      : []),
    ...socials
      .filter((s) => s.about)
      .map((s) => ({
        key: s.id,
        icon: SOCIAL_ICONS[s.platform],
        label: s.platform === 'linkedin' ? t('linkedin') : s.name,
        value: s.value,
        href: s.url,
        ltr: true,
        external: s.external,
      })),
    { key: 'languages', icon: Languages, label: t('languages'), value: t('languagesValue') },
  ];

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className={`container ${styles.grid}`}>
        <Reveal>
          <p className="eyebrow" data-index="01">{t('eyebrow')}</p>
          <h2 id="about-title" className="section-title">
            {t('title')}
          </h2>
          <p className={styles.paragraph}>{t('paragraph')}</p>

          {profile.resumeUrl && (
            <a href={profile.resumeUrl} download className="btn btn-primary">
              {t('downloadResume')}
              <Download size={17} aria-hidden />
            </a>
          )}
        </Reveal>

        <Reveal index={1} className={`card ${styles.infoCard}`}>
          <dl>
            {info.map(({ key, icon: Icon, label, value, href, ltr, external }) => (
              <div key={key} className={styles.infoRow}>
                <dt className={styles.infoLabel}>
                  <Icon size={22} aria-hidden className={styles.infoIcon} />
                  {label}
                </dt>
                <dd className={styles.infoValue} dir={ltr ? 'ltr' : undefined}>
                  {href ? (
                    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
