import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './Projects.module.css';
import Reveal from './motion/Reveal';
import ProjectLinks from './ProjectLinks';
import { PUBLISHED_PROJECTS } from '../../data/projects';
import { isTodo, showValue } from '../../data/todo';

export default function Projects() {
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="03">Featured Projects</p>
          <h2 id="projects-title" className="section-title">
            Case Studies
          </h2>
        </Reveal>

        <ul className={styles.grid}>
          {PUBLISHED_PROJECTS.map((project, idx) => {
            const cover = project.images[0];
            const href = `/projects/${project.slug}`;
            return (
              <Reveal as="li" key={project.slug} index={idx % 3} className={styles.item}>
                <article className={`card card-interactive ${styles.card}`}>
                  <div className={styles.media}>
                    {cover && (
                      <Image
                        src={cover}
                        alt={`${project.title} website screenshot`}
                        fill
                        sizes="(max-width: 599px) 100vw, (max-width: 1023px) 50vw, 380px"
                        placeholder="blur"
                        className={styles.image}
                      />
                    )}
                    {project.personal && <span className={styles.badge}>Personal project</span>}
                  </div>

                  <div className={styles.body}>
                    <h3 className={styles.title}>
                      <Link href={href} className={styles.titleLink}>
                        {project.title}
                        <ArrowUpRight size={18} aria-hidden className={styles.arrow} />
                        <span className="visually-hidden"> case study</span>
                      </Link>
                    </h3>
                    <p className={styles.summary}>{project.summary}</p>
                    {showValue(project.role) && (
                      <p className={`${styles.role} ${isTodo(project.role) ? 'todo' : ''}`}>
                        <span className={styles.roleLabel}>My role:</span> {project.role}
                      </p>
                    )}
                    <ul className={styles.stack} aria-label="Tech stack">
                      {project.stack.map((tech) => (
                        <li key={tech}>{tech}</li>
                      ))}
                    </ul>
                    <div className={styles.footer}>
                      <ProjectLinks
                        title={project.title}
                        liveUrl={project.liveUrl}
                        repoUrl={project.repoUrl}
                        repoPrivateNote={project.repoPrivateNote}
                      />
                    </div>
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
