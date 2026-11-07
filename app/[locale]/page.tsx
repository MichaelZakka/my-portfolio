import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navigation from '../components/Navigation';
import Hero from '../components/Hero';
import About from '../components/About';
import Skills from '../components/Skills';
import Experience from '../components/Experience';
import Education from '../components/Education';
import Volunteering from '../components/Volunteering';
import Strengths from '../components/Strengths';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import JsonLd from '../components/JsonLd';
import CircuitBackground from '../components/CircuitBackground';
import { buildPageMetadata, homePageJsonLd, personJsonLd, websiteJsonLd } from '../lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    path: '/',
    ogType: 'profile',
    absoluteTitle: true,
  });
}

const Projects = dynamic(() => import('../components/Projects'), {
  loading: () => (
    <section id="projects" aria-busy="true" style={{ minHeight: '28rem' }} />
  ),
});

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <JsonLd
        data={[
          personJsonLd(),
          websiteJsonLd(),
          homePageJsonLd(locale),
        ]}
      />
      <CircuitBackground />
      <Navigation />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Strengths />
        <Projects />
        <Experience />
        <Skills />
        <Education />
        <Volunteering />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
