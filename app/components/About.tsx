import { Briefcase, FolderCheck, CalendarCheck, Globe2, MapPin, Mail, Phone, Languages, Download } from 'lucide-react';
import styles from './About.module.css';
import Reveal from './motion/Reveal';

const FACTS = [
  { icon: Briefcase, label: '2+ years shipping production work' },
  { icon: FolderCheck, label: '5 featured client & personal projects' },
  { icon: CalendarCheck, label: 'Available for freelance' },
  { icon: Globe2, label: 'Clients in Syria & Saudi Arabia' },
];

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
            Information Technology Engineering graduate and Frontend Developer specializing in building
            complete web solutions. I&apos;m driven by the intersection of technology and business, creating
            digital products that deliver both technical quality and measurable value. Always exploring new
            opportunities to turn innovative ideas into impactful applications.
          </p>



          <a href="/michael-zakka-cv.pdf" download className="btn btn-primary">
            Download CV
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
