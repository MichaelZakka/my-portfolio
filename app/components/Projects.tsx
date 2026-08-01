'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Projects.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { PROJECTS } from '../lib/projectsData';

export default function Projects() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [imageSlideDirection, setImageSlideDirection] = useState<'next' | 'prev'>('next');

  const projects = PROJECTS;
  const project = projects[currentIndex];
  const total = projects.length;
  const hasGallery = Boolean(project.images?.length);
  const galleryTotal = project.images?.length ?? 0;

  useEffect(() => {
    setImageIndex(0);
  }, [currentIndex]);

  const goToProject = (index: number) => {
    if (index === currentIndex) return;
    setSlideDirection(index > currentIndex ? 'next' : 'prev');
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setSlideDirection('prev');
    setCurrentIndex((index) => (index === 0 ? total - 1 : index - 1));
  };

  const goToNext = () => {
    setSlideDirection('next');
    setCurrentIndex((index) => (index === total - 1 ? 0 : index + 1));
  };

  const goToPreviousImage = () => {
    if (!galleryTotal) return;
    setImageSlideDirection('prev');
    setImageIndex((index) => (index === 0 ? galleryTotal - 1 : index - 1));
  };

  const goToNextImage = () => {
    if (!galleryTotal) return;
    setImageSlideDirection('next');
    setImageIndex((index) => (index === galleryTotal - 1 ? 0 : index + 1));
  };

  const goToImage = (index: number) => {
    if (index === imageIndex) return;
    setImageSlideDirection(index > imageIndex ? 'next' : 'prev');
    setImageIndex(index);
  };

  return (
    <section id="projects" className={styles.projects}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>

        <div className={styles.carousel}>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navPrev}`}
            onClick={goToPrevious}
            aria-label="Previous project"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          <div className={styles.carouselViewport}>
            <article
              key={currentIndex}
              className={`${styles.projectCard} ${
                slideDirection === 'next' ? styles.cardFlipNext : styles.cardFlipPrev
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className={`${styles.projectImage} ${hasGallery ? styles.projectImageGallery : ''}`}
              >
                {hasGallery && project.images ? (
                  <div className={styles.imageGallery}>
                    <div className={styles.galleryViewport}>
                      <Image
                        key={imageIndex}
                        src={project.images[imageIndex]}
                        alt={`${project.title} — screenshot ${imageIndex + 1}`}
                        className={`${styles.galleryImage} ${
                          imageSlideDirection === 'next'
                            ? styles.galleryFlipNext
                            : styles.galleryFlipPrev
                        }`}
                        sizes="(max-width: 968px) 100vw, 520px"
                        priority={currentIndex === 0 && imageIndex === 0}
                        loading={currentIndex === 0 && imageIndex === 0 ? 'eager' : 'lazy'}
                        placeholder="blur"
                      />
                    </div>
                    {galleryTotal > 1 && (
                      <>
                        <div className={styles.galleryControls}>
                          <button
                            type="button"
                            className={styles.galleryNavButton}
                            onClick={goToPreviousImage}
                            aria-label="Previous screenshot"
                          >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                          </button>
                          <span className={styles.galleryCounter}>
                            {imageIndex + 1} / {galleryTotal}
                          </span>
                          <button
                            type="button"
                            className={styles.galleryNavButton}
                            onClick={goToNextImage}
                            aria-label="Next screenshot"
                          >
                            <ChevronRight size={20} strokeWidth={2.5} />
                          </button>
                        </div>
                        <div className={styles.galleryDots}>
                          {project.images.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              aria-label={`Screenshot ${idx + 1}`}
                              className={`${styles.galleryDot} ${idx === imageIndex ? styles.galleryDotActive : ''}`}
                              onClick={() => goToImage(idx)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className={styles.emoji}>{project.image}</span>
                )}
              </div>
              <div className={styles.projectContent}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectDescription}>{project.description}</p>
                {project.employer && (
                  <p className={styles.employerNote}>
                    Developed during employment at{' '}
                    {project.employerUrl ? (
                      <a
                        href={project.employerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.employerLink}
                      >
                        {project.employer}
                      </a>
                    ) : (
                      <span className={styles.employerName}>{project.employer}</span>
                    )}
                  </p>
                )}
                {project.collaborators && project.collaborators.length > 0 && (
                  <div className={styles.collaborators}>
                    <span className={styles.collaboratorText}>
                      Collaborated with:{' '}
                      {project.collaborators.map((collaborator, collabIdx) => (
                        <span key={collabIdx}>
                          {collabIdx > 0 && ', '}
                          <a
                            href={collaborator.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.collaboratorLink}
                          >
                            {collaborator.name}
                          </a>
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                <div className={styles.highlights}>
                  {project.highlights.map((highlight, hIdx) => (
                    <span key={hIdx} className={styles.highlightBadge}>
                      {highlight}
                    </span>
                  ))}
                </div>
                <div className={styles.technologies}>
                  {project.technologies.map((tech, techIdx) => (
                    <span key={techIdx} className={styles.techTag}>
                      {tech}
                    </span>
                  ))}
                </div>
                {project.isSelfProject && (
                  <p className={styles.selfProjectNote}>
                    Personal learning project — built for practice and education, not for
                    commercial or business purposes.
                  </p>
                )}
                {(project.liveUrl || project.githubUrl) && (
                  <div className={styles.projectLinks}>
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        className={styles.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackEvent('cta_click', {
                            label: 'project-live',
                            meta: { project: project.title },
                          })
                        }
                      >
                        <span>
                          {project.isSelfProject || !project.githubUrl
                            ? 'Visit Website'
                            : 'Live Demo'}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            d="M13 8.5V13H3V3H7.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M10 3H13V6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 9L13 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </a>
                    )}
                    {!project.isSelfProject && project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        className={styles.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>GitHub</span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          </div>

          <button
            type="button"
            className={`${styles.navButton} ${styles.navNext}`}
            onClick={goToNext}
            aria-label="Next project"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.carouselFooter}>
          <span className={styles.counter}>
            {currentIndex + 1} / {total}
          </span>
          <div className={styles.dots} role="tablist" aria-label="Project slides">
            {projects.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Go to project ${idx + 1}`}
                className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                onClick={() => goToProject(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
