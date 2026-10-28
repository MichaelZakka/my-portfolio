'use client';

import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import styles from './Projects.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { PROJECTS } from '../lib/projectsData';
import Reveal from './motion/Reveal';

export default function Projects() {
  return (
    <section id="projects" className="section">
      <div className="container">
        <Reveal className={`section-head ${styles.head}`}>
          <div>
            <p className="eyebrow" data-index="03">Featured Projects</p>
            <h2 className="section-title">Recent Work</h2>
          </div>
        </Reveal>

        <ul className={styles.grid}>
          {PROJECTS.map((project, idx) => {
            const cover = project.images?.[0];
            return (
              <Reveal as="li" key={project.title} index={idx % 3} className={styles.item}>
                <article className={`card card-interactive ${styles.card}`}>
                  <div className={styles.media}>
                    {cover ? (
                      <Image
                        src={cover}
                        alt={`${project.title} website screenshot`}
                        fill
                        sizes="(max-width: 599px) 100vw, (max-width: 1023px) 50vw, 380px"
                        placeholder="blur"
                        className={styles.image}
                      />
                    ) : (
                      <span className={styles.emoji} aria-hidden="true">
                        {project.image}
                      </span>
                    )}
                    {project.isSelfProject && <span className={styles.badge}>Personal project</span>}
                  </div>

                  <div className={styles.body}>
                    <h3 className={styles.title}>
                      {project.liveUrl ? (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.titleLink}
                          onClick={() =>
                            trackEvent('cta_click', {
                              label: 'project-live',
                              meta: { project: project.title },
                            })
                          }
                        >
                          {project.title}
                          <ArrowUpRight size={18} aria-hidden className={styles.arrow} />
                          <span className="visually-hidden"> (opens live site)</span>
                        </a>
                      ) : (
                        project.title
                      )}
                    </h3>
                    <p className={styles.stack}>{project.technologies.join(' / ')}</p>
                    <p className={styles.description}>{project.description}</p>
                    {project.employer && (
                      <p className={styles.meta}>
                        Built at{' '}
                        {project.employerUrl ? (
                          <a href={project.employerUrl} target="_blank" rel="noopener noreferrer">
                            {project.employer}
                          </a>
                        ) : (
                          project.employer
                        )}
                        {project.collaborators?.length ? (
                          <>
                            {' '}with{' '}
                            {project.collaborators.map((c, i) => (
                              <span key={c.name}>
                                {i > 0 && ', '}
                                <a href={c.url} target="_blank" rel="noopener noreferrer">
                                  {c.name}
                                </a>
                              </span>
                            ))}
                          </>
                        ) : null}
                      </p>
                    )}
                    {project.githubUrl && !project.isSelfProject && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.meta}
                      >
                        View source on GitHub
                      </a>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
