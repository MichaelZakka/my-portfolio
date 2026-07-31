import type { Metadata } from 'next';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import ProjectIntakeSurvey from '../components/ProjectIntakeSurvey';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Work with me | Michael Zakka',
  description:
    'Tell Michael Zakka about your freelancing project — web apps, landing pages, Shopify stores, or Flutter mobile apps. Share goals, brand, and visual direction.',
};

export default function WorkWithMePage() {
  return (
    <>
      <Navigation />
      <main className={styles.main}>
        <section className={styles.section}>
          <div className={styles.container}>
            <ProjectIntakeSurvey />
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
