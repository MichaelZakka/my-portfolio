import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import JsonLd from '../../components/JsonLd';
import CircuitBackground from '../../components/CircuitBackground';
import { buildPageMetadata, workWithMeJsonLd } from '../../lib/seo';
import styles from './page.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'workWithMe' });
  return buildPageMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
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
}

const ProjectIntakeSurvey = dynamic(() => import('../../components/ProjectIntakeSurvey'), {
  loading: () => <div className={styles.surveyFallback} aria-busy="true" />,
});

export default async function WorkWithMePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('workWithMe');

  return (
    <>
      <JsonLd data={workWithMeJsonLd(locale)} />
      <CircuitBackground />
      <Navigation />
      <main id="main" tabIndex={-1} className={styles.main}>
        {/* TODO(michael): the intake survey is English-only; translate ProjectIntakeSurvey for /ar */}
        <section className={styles.section} aria-label={t('metaTitle')} lang="en" dir="ltr">
          <div className={styles.container}>
            <ProjectIntakeSurvey />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
