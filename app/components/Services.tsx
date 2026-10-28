import styles from './Services.module.css';
import { Code, Target, ShoppingCart, Smartphone } from 'lucide-react';
import Reveal from './motion/Reveal';

export default function Services() {
  const services = [
    {
      icon: Code,
      title: 'Web Projects',
      description:
        'Building modern, scalable web applications using React, Next.js, and cutting-edge technologies. From dynamic websites to complex web platforms.',
      features: ['React & Next.js', 'Full-Stack Development', 'Responsive Design', 'API Integration'],
    },
    {
      icon: Target,
      title: 'Landing Pages',
      description:
        'Creating high-converting landing pages that capture attention and drive results. Optimized for performance and user experience.',
      features: ['Modern Design', 'Fast Loading', 'SEO Optimized', 'Mobile Responsive'],
    },
    {
      icon: ShoppingCart,
      title: 'Shopify Stores',
      description:
        'Designing and developing custom Shopify stores that showcase your products beautifully and provide seamless shopping experiences.',
      features: ['Custom Themes', 'Store Setup', 'Payment Integration', 'Product Management'],
    },
    {
      icon: Smartphone,
      title: 'Mobile Applications',
      description:
        'Developing cross-platform mobile applications using Flutter for iOS and Android. Delivering native-like performance and user experience.',
      features: ['Flutter Development', 'iOS & Android', 'UI/UX Implementation', 'API Integration'],
    },
  ];

  return (
    <section id="services" className="section">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="02">My Services</p>
          <h2 className="section-title">What I Can Do For You</h2>
          <span className="accent-bar" aria-hidden="true" />
        </Reveal>
        <ul className={styles.grid}>
          {services.map((service, idx) => {
            const IconComponent = service.icon;
            return (
              <Reveal as="li" key={service.title} index={idx} className={styles.item}>
                <div className={`card card-interactive ${styles.card}`}>
                  <IconComponent className={styles.icon} size={36} strokeWidth={1.6} aria-hidden />
                  <h3 className={styles.title}>{service.title}</h3>
                  <p className={styles.description}>{service.description}</p>
                  <ul className={styles.features}>
                    {service.features.map((feature, fIdx) => (
                      <li key={feature} style={{ '--i': fIdx } as React.CSSProperties}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
