import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import CircuitBackground from '../../components/CircuitBackground';
import JsonLd from '../../components/JsonLd';
import ProjectLinks from '../../components/ProjectLinks';
import { buildPageMetadata, projectJsonLd } from '../../lib/seo';
import { getSiteUrl } from '../../lib/site';
import { PUBLISHED_PROJECTS, getProject } from '../../../data/projects';
import { isTodo, showValue, visible } from '../../../data/todo';
import styles from './page.module.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  const cover = project.images[0];
  return buildPageMetadata({
    title: `${project.title} case study`,
    description: project.summary,
    path: `/projects/${project.slug}`,
    keywords: [project.title, ...project.stack, 'case study', 'Michael Zakka'],
    image: cover ? `${getSiteUrl()}${cover.src}` : undefined,
  });
}

function TodoAware({ value }: { value: string }) {
  return <li className={isTodo(value) ? 'todo' : undefined}>{value}</li>;
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = PUBLISHED_PROJECTS.findIndex((p) => p.slug === project.slug);
  const total = PUBLISHED_PROJECTS.length;
  const prev = PUBLISHED_PROJECTS[(index - 1 + total) % total];
  const next = PUBLISHED_PROJECTS[(index + 1) % total];

  const challenges = visible(project.challenges);
  const solutions = visible(project.solutions);
  const results = visible(project.results);
  const [cover, ...gallery] = project.images;

  return (
    <>
      <JsonLd data={projectJsonLd(project)} />
      <CircuitBackground />
      <Navigation />
      <main className={styles.main}>
        <article className="container">
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/#projects">
              <ArrowLeft size={16} aria-hidden className="flip-rtl" />
              All projects
            </Link>
          </nav>

          <header className={styles.header}>
            <p className="eyebrow">
              Case study{project.personal ? ' · Personal project' : ''}
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
                alt={`${project.title} homepage screenshot`}
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
                  Overview
                </h2>
                <p className={styles.text}>{project.overview}</p>
              </section>

              {(challenges.length > 0 || solutions.length > 0) && (
                <section aria-labelledby="challenge" className={styles.pair}>
                  <div className={`card ${styles.panel}`}>
                    <h2 id="challenge" className={styles.h2}>
                      Challenge
                    </h2>
                    <ul className={styles.list}>
                      {challenges.map((c) => (
                        <TodoAware key={c} value={c} />
                      ))}
                    </ul>
                  </div>
                  <ArrowRight size={22} aria-hidden className={`${styles.pairArrow} flip-rtl`} />
                  <div className={`card ${styles.panel} ${styles.solution}`}>
                    <h2 className={styles.h2}>Solution</h2>
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
                    Results
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
                    Screenshots
                  </h2>
                  <div className={styles.gallery}>
                    {gallery.map((img, i) => (
                      <figure key={img.src} className={styles.shot}>
                        <Image
                          src={img}
                          alt={`${project.title} screenshot ${i + 2}`}
                          placeholder="blur"
                          sizes="(max-width: 767px) 100vw, 600px"
                        />
                      </figure>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className={`card ${styles.facts}`} aria-label="Project facts">
              <dl>
                {showValue(project.role) && (
                  <div>
                    <dt>My role</dt>
                    <dd className={isTodo(project.role) ? 'todo' : undefined}>{project.role}</dd>
                  </div>
                )}
                {showValue(project.team) && (
                  <div>
                    <dt>Team</dt>
                    <dd>
                      {project.team}
                      {project.collaborators?.map((c) => (
                        <span key={c.url} className={styles.collab}>
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            {c.name}
                          </a>
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {project.employer && (
                  <div>
                    <dt>Built at</dt>
                    <dd>
                      <a href={project.employer.url} target="_blank" rel="noopener noreferrer">
                        {project.employer.name}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Tech stack</dt>
                  <dd>
                    <ul className={styles.stack}>
                      {visible(project.stack).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          {total > 1 && (
            <nav className={styles.pager} aria-label="More projects">
              <Link href={`/projects/${prev.slug}`} className={`card card-interactive ${styles.pagerLink}`}>
                <span className={styles.pagerLabel}>
                  <ArrowLeft size={16} aria-hidden className="flip-rtl" /> Previous
                </span>
                <span className={styles.pagerTitle}>{prev.title}</span>
              </Link>
              <Link
                href={`/projects/${next.slug}`}
                className={`card card-interactive ${styles.pagerLink} ${styles.pagerNext}`}
              >
                <span className={styles.pagerLabel}>
                  Next <ArrowRight size={16} aria-hidden className="flip-rtl" />
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
