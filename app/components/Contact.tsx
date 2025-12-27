import styles from './Contact.module.css';

export default function Contact() {
  return (
    <section id="contact" className={styles.contact}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Get In Touch</h2>
        <div className={styles.content}>
          <div className={styles.contactInfo}>
            <h3 className={styles.subtitle}>Let's Work Together</h3>
            <p className={styles.description}>
              I'm always open to discussing new projects, creative ideas, or
              opportunities to be part of your vision. Feel free to reach out!
            </p>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.icon}>📧</div>
                <div>
                  <h4>Email</h4>
                  <a href="mailto:michealzakka@gmail.com">michealzakka@gmail.com</a>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.icon}>📱</div>
                <div>
                  <h4>Phone</h4>
                  <a href="tel:+963992833739">+963 992 833 739</a>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.icon}>📍</div>
                <div>
                  <h4>Location</h4>
                  <p>Damascus - Syria</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

