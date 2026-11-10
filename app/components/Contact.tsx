import { getLocale, getTranslations } from 'next-intl/server';
import { Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import styles from './Contact.module.css';
import Reveal from './motion/Reveal';
import ContactForm from './ContactForm';
import { getPortfolio } from '../lib/content/portfolio';
import { SOCIAL_ICONS } from '../lib/content/icons';

type Channel = { key: string; icon: LucideIcon; label: string; value: string; href: string };

export default async function Contact() {
  const t = await getTranslations('contact');
  const { profile, socials } = await getPortfolio(await getLocale());

  const channels: Channel[] = [
    ...(profile.email
      ? [{ key: 'email', icon: Mail, label: t('email'), value: profile.email, href: `mailto:${profile.email}` }]
      : []),
    ...(profile.telUrl ? [{ key: 'phone', icon: Phone, label: t('phone'), value: profile.phone, href: profile.telUrl }] : []),
    ...(profile.whatsappUrl
      ? [{ key: 'whatsapp', icon: MessageCircle, label: t('whatsapp'), value: profile.phone, href: profile.whatsappUrl }]
      : []),
    ...socials
      .filter((s) => s.contact)
      .map((s) => ({
        key: s.id,
        icon: SOCIAL_ICONS[s.platform],
        label: s.platform === 'linkedin' ? t('linkedin') : s.platform === 'github' ? t('github') : s.name,
        value: s.value,
        href: s.url,
      })),
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
            {channels.map(({ key, icon: Icon, label, value, href }, idx) => (
              <Reveal as="li" key={key} index={idx} className={styles.item}>
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
