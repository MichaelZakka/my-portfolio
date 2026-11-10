import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import styles from './Projects.module.css';
import Reveal from './motion/Reveal';
import ProjectLinks from './ProjectLinks';
import { isTodo, showValue } from '../../data/todo';
import { Link } from '../../i18n/navigation';
import { getPortfolio } from '../lib/content/portfolio';

export default async function Projects() {
  const t = await getTranslations('projects');
  const { projects } = await getPortfolio(await getLocale());

  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="03">{t('eyebrow')}</p>
          <h2 id="projects-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>

        <ul className={styles.grid}>
          {projects.map((project, idx) => {
            const cover = project.images[0];
            const href = `/projects/${project.slug}`;
            return (
              <Reveal as="li" key={project.slug} index={idx % 3} className={styles.item}>
                <article className={`card card-interactive ${styles.card}`}>
                  <div className={styles.media}>
                    {!cover && (
                      // No screenshots yet (e.g. a project added in the admin): a branded placeholder
                      <span className={styles.placeholder} aria-hidden="true">
                        {project.title
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                    {cover && (
                      <Image
                        src={cover}
                        alt={t('screenshotAlt', { title: project.title })}
                        fill
                        sizes="(max-width: 599px) 100vw, (max-width: 1023px) 50vw, 380px"
                        placeholder="blur"
                        className={styles.image}
                      />
                    )}
                    {project.personal && <span className={styles.badge}>{t('personal')}</span>}
                  </div>

                  <div className={styles.body}>
                    <h3 className={styles.title}>
                      <Link href={href} className={styles.titleLink}>
                        {project.title}
                        <ArrowUpRight size={18} aria-hidden className={styles.arrow} />
                        <span className="visually-hidden"> {t('caseStudy')}</span>
                      </Link>
                    </h3>
                    <p className={styles.summary}>{project.summary}</p>
                    {showValue(project.role) && (
                      <p className={`${styles.role} ${isTodo(project.role) ? 'todo' : ''}`}>
                        <span className={styles.roleLabel}>{t('myRole')}</span> {project.role}
                      </p>
                    )}
                    <ul className={styles.stack} aria-label={t('stack')} dir="ltr">
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
