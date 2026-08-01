import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import JsonLd from '../components/JsonLd';
import { buildPageMetadata, workWithMeJsonLd } from '../lib/seo';
import styles from './page.module.css';

const PAGE_TITLE = 'Work with me';
const PAGE_DESCRIPTION =
  'Tell Michael Zakka about your freelancing project — web apps, landing pages, Shopify stores, or Flutter mobile apps. Share goals, brand, and visual direction.';

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/work-with-me',
  keywords: [
    'Hire Michael Zakka',
    'Freelance web developer',
    'Next.js freelancing',
    'Shopify developer',
    'Flutter developer for hire',
    'Project intake survey',
  ],
});

const ProjectIntakeSurvey = dynamic(
  () => import('../components/ProjectIntakeSurvey'),
  {
    loading: () => (
      <div
        className={styles.surveyFallback}
        aria-busy="true"
        aria-label="Loading project survey"
      />
    ),
  }
);

export default function WorkWithMePage() {
  return (
    <>
      <JsonLd data={workWithMeJsonLd()} />
      <Navigation />
      <main className={styles.main}>
        <section className={styles.section} aria-label="Work with me">
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
