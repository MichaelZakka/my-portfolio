import dynamic from 'next/dynamic';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Education from './components/Education';
import Volunteering from './components/Volunteering';
import Strengths from './components/Strengths';
import Contact from './components/Contact';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import JsonLd from './components/JsonLd';
import CircuitBackground from './components/CircuitBackground';
import {
  SITE_DESCRIPTION,
  SITE_TITLE_DEFAULT,
  buildPageMetadata,
  homePageJsonLd,
  personJsonLd,
  websiteJsonLd,
} from './lib/seo';

export const metadata = buildPageMetadata({
  title: SITE_TITLE_DEFAULT,
  description: SITE_DESCRIPTION,
  path: '/',
  ogType: 'profile',
  absoluteTitle: true,
});

const Projects = dynamic(() => import('./components/Projects'), {
  loading: () => (
    <section id="projects" aria-busy="true" style={{ minHeight: '28rem' }} />
  ),
});

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          personJsonLd(),
          websiteJsonLd(),
          homePageJsonLd(),
        ]}
      />
      <CircuitBackground />
      <Navigation />
      <main>
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
      <WhatsAppButton />
    </>
  );
}
