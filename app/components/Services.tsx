import styles from './Services.module.css';

export default function Services() {
  const services = [
    {
      icon: '💻',
      title: 'Web Projects',
      description:
        'Building modern, scalable web applications using React, Next.js, and cutting-edge technologies. From dynamic websites to complex web platforms.',
      features: [
        'React & Next.js',
        'Full-Stack Development',
        'Responsive Design',
        'API Integration',
      ],
    },
    {
      icon: '🎯',
      title: 'Landing Pages',
      description:
        'Creating high-converting landing pages that capture attention and drive results. Optimized for performance and user experience.',
      features: [
        'Modern Design',
        'Fast Loading',
        'SEO Optimized',
        'Mobile Responsive',
      ],
    },
    {
      icon: '🛒',
      title: 'Shopify Stores',
      description:
        'Designing and developing custom Shopify stores that showcase your products beautifully and provide seamless shopping experiences.',
      features: [
        'Custom Themes',
        'Store Setup',
        'Payment Integration',
        'Product Management',
      ],
    },
    {
      icon: '📱',
      title: 'Mobile Applications',
      description:
        'Developing cross-platform mobile applications using Flutter for iOS and Android. Delivering native-like performance and user experience.',
      features: [
        'Flutter Development',
        'iOS & Android',
        'UI/UX Implementation',
        'API Integration',
      ],
    },
  ];

  return (
    <section id="services" className={styles.services}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Services I Offer</h2>
        <p className={styles.subtitle}>
          Comprehensive solutions tailored to your business needs
        </p>
        <div className={styles.servicesGrid}>
          {services.map((service, idx) => (
            <div key={idx} className={styles.serviceCard}>
              <div className={styles.iconWrapper}>
                <span className={styles.icon}>{service.icon}</span>
              </div>
              <h3 className={styles.serviceTitle}>{service.title}</h3>
              <p className={styles.serviceDescription}>{service.description}</p>
              <ul className={styles.featuresList}>
                {service.features.map((feature, fIdx) => (
                  <li key={fIdx}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

