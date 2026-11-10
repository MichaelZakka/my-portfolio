import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Navigation from '../../../components/Navigation';
import Footer from '../../../components/Footer';
import CircuitBackground from '../../../components/CircuitBackground';
import JsonLd from '../../../components/JsonLd';
import ProjectLinks from '../../../components/ProjectLinks';
import { buildPageMetadata, projectJsonLd } from '../../../lib/seo';
import { getSiteUrl } from '../../../lib/site';
import { getPortfolio } from '../../../lib/content/portfolio';
import { isTodo, showValue, visible } from '../../../../data/todo';
import { Link } from '../../../../i18n/navigation';
import styles from './page.module.css';

type Params = { params: Promise<{ locale: string; slug: string }> };

// Projects published in the admin after a deploy render on first visit; unknown slugs 404
export const dynamicParams = true;

export async function generateStaticParams() {
  const { projects } = await getPortfolio('en');
  return projects.map((p) => ({ slug: p.slug }));
}

/** The published project and its neighbours in display order. */
async function load(locale: string, slug: string) {
  const { projects } = await getPortfolio(locale);
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  return { project: projects[index], projects, index };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const loaded = await load(locale, slug);
  if (!loaded) return {};
  const { project } = loaded;
  const t = await getTranslations({ locale, namespace: 'caseStudy' });
  const cover = project.images[0];
  return buildPageMetadata({
    locale,
    title: t('metaTitle', { title: project.title }),
    description: project.summary,
    path: `/projects/${project.slug}`,
    keywords: [project.title, ...visible(project.stack), 'case study', 'Michael Zakka'],
    image: cover ? `${getSiteUrl()}${cover.src}` : undefined,
  });
}

function TodoAware({ value }: { value: string }) {
  return <li className={isTodo(value) ? 'todo' : undefined}>{value}</li>;
}

export default async function ProjectPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loaded = await load(locale, slug);
  if (!loaded) notFound();
  const { project, projects, index } = loaded;
  const t = await getTranslations('caseStudy');

  const total = projects.length;
  const prev = projects[(index - 1 + total) % total];
  const next = projects[(index + 1) % total];

  const challenges = visible(project.challenges);
  const solutions = visible(project.solutions);
  const results = visible(project.results);
  const [cover, ...gallery] = project.images;

  return (
    <>
      <JsonLd data={projectJsonLd(project, locale)} />
      <CircuitBackground />
      <Navigation />
      <main id="main" tabIndex={-1} className={styles.main}>
        <article className="container">
          <nav aria-label={t('breadcrumb')} className={styles.breadcrumb}>
            <Link href={{ pathname: '/', hash: 'projects' }}>
              <ArrowLeft size={16} aria-hidden className="flip-rtl" />
              {t('allProjects')}
            </Link>
          </nav>

          <header className={styles.header}>
            <p className="eyebrow">
              {t('eyebrow')}
              {project.personal ? ` · ${t('personalSuffix')}` : ''}
            </p>
            <h1 className={styles.title}>{project.title}</h1>
            <p className={styles.summary}>{project.summary}</p>
            <ProjectLinks
              size="md"
              title={project.title}
              liveUrl={project.liveUrl}
              repoUrl={project.repoUrl}
              repoPrivateNote={project.repoPrivateNote}
            />
          </header>

          {cover && (
            <div className={styles.cover}>
              <Image
                src={cover}
                alt={t('coverAlt', { title: project.title })}
                placeholder="blur"
                sizes="(max-width: 1240px) 100vw, 1200px"
                priority
              />
            </div>
          )}

          <div className={styles.layout}>
            <div className={styles.content}>
              <section aria-labelledby="overview">
                <h2 id="overview" className={styles.h2}>
                  {t('overview')}
                </h2>
                <p className={styles.text}>{project.overview}</p>
              </section>

              {(challenges.length > 0 || solutions.length > 0) && (
                <section aria-labelledby="challenge" className={styles.pair}>
                  <div className={`card ${styles.panel}`}>
                    <h2 id="challenge" className={styles.h2}>
                      {t('challenge')}
                    </h2>
                    <ul className={styles.list}>
                      {challenges.map((c) => (
                        <TodoAware key={c} value={c} />
                      ))}
                    </ul>
                  </div>
                  <ArrowRight size={22} aria-hidden className={`${styles.pairArrow} flip-rtl`} />
                  <div className={`card ${styles.panel} ${styles.solution}`}>
                    <h2 className={styles.h2}>{t('solution')}</h2>
                    <ul className={styles.list}>
                      {solutions.map((s) => (
                        <TodoAware key={s} value={s} />
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {results.length > 0 && (
                <section aria-labelledby="results">
                  <h2 id="results" className={styles.h2}>
                    {t('results')}
                  </h2>
                  <ul className={styles.list}>
                    {results.map((r) => (
                      <TodoAware key={r} value={r} />
                    ))}
                  </ul>
                </section>
              )}

              {gallery.length > 0 && (
                <section aria-labelledby="screenshots">
                  <h2 id="screenshots" className={styles.h2}>
                    {t('screenshots')}
                  </h2>
                  <div className={styles.gallery}>
                    {gallery.map((img, i) => (
                      <figure key={img.src} className={styles.shot}>
                        <Image
                          src={img}
                          alt={t('shotAlt', { title: project.title, n: i + 2 })}
                          placeholder="blur"
                          sizes="(max-width: 767px) 100vw, 600px"
                        />
                      </figure>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className={`card ${styles.facts}`} aria-label={t('facts')}>
              <dl>
                {showValue(project.role) && (
                  <div>
                    <dt>{t('myRole')}</dt>
                    <dd className={isTodo(project.role) ? 'todo' : undefined}>{project.role}</dd>
                  </div>
                )}
                {showValue(project.team) && (
                  <div>
                    <dt>{t('team')}</dt>
                    <dd>
                      {project.team}
                      {project.collaborators?.map((c) => (
                        <span key={c.name} className={styles.collab}>
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer">
                              {c.name}
                            </a>
                          ) : (
                            c.name
                          )}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {project.employer && (
                  <div>
                    <dt>{t('builtAt')}</dt>
                    <dd>
                      {project.employer.url ? (
                        <a href={project.employer.url} target="_blank" rel="noopener noreferrer">
                          {project.employer.name}
                        </a>
                      ) : (
                        project.employer.name
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('stack')}</dt>
                  <dd>
                    <ul className={styles.stack} dir="ltr">
                      {visible(project.stack).map((tech) => (
                        <li key={tech}>{tech}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          {total > 1 && (
            <nav className={styles.pager} aria-label={t('more')}>
              <Link href={`/projects/${prev.slug}`} className={`card card-interactive ${styles.pagerLink}`}>
                <span className={styles.pagerLabel}>
                  <ArrowLeft size={16} aria-hidden className="flip-rtl" /> {t('previous')}
                </span>
                <span className={styles.pagerTitle}>{prev.title}</span>
              </Link>
              <Link
                href={`/projects/${next.slug}`}
                className={`card card-interactive ${styles.pagerLink} ${styles.pagerNext}`}
              >
                <span className={styles.pagerLabel}>
                  {t('next')} <ArrowRight size={16} aria-hidden className="flip-rtl" />
                </span>
                <span className={styles.pagerTitle}>{next.title}</span>
              </Link>
            </nav>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
