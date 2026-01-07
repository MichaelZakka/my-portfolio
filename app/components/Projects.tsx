'use client';

import { useState } from 'react';
import styles from './Projects.module.css';

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState('All');

  const projects = [
    {
      title: 'Personal Portfolio Website',
      description:
        'A modern, responsive portfolio website built with Next.js 14+ featuring smooth animations, custom color scheme, and optimized performance. Showcases professional experience, skills, and projects with a clean, contemporary design.',
      technologies: ['Next.js', 'React', 'TypeScript', 'CSS Modules'],
      image: '💼',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Fully Responsive', 'Smooth Animations', 'SEO Optimized'],
      category: 'Next.js',
    },
    {
      title: 'E-Commerce Store',
      description:
        'Full-featured Shopify store with custom theme development, product management, and payment gateway integration. Optimized for conversions with SEO best practices.',
      technologies: ['Shopify', 'Liquid', 'JavaScript', 'CSS'],
      image: '🛍️',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Custom Theme', 'Payment Integration', 'SEO Optimized'],
      category: 'Shopify',
    },
    {
      title: 'Task Management App',
      description:
        'Cross-platform mobile application for task management with real-time synchronization, built using Flutter. Features include task categorization, reminders, and team collaboration.',
      technologies: ['Flutter', 'Dart', 'Firebase', 'GetX'],
      image: '📱',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Cross-Platform', 'Real-time Sync', 'Offline Support'],
      category: 'Flutter',
    },
    {
      title: 'Business Landing Page',
      description:
        'High-converting landing page for a SaaS product with modern animations, lead capture forms, and performance optimization. Built with React for fast, interactive user experience.',
      technologies: ['React', 'JavaScript', 'CSS Modules'],
      image: '🚀',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['High Conversion', 'Fast Loading', 'Mobile First'],
      category: 'React',
      collaborators: [
        { name: 'John Doe', linkedIn: 'https://www.linkedin.com/in/johndoe' }
      ],
    },
    {
      title: 'Social Media Dashboard',
      description:
        'Analytics dashboard built with Next.js for tracking social media metrics. Features real-time data visualization, export capabilities, and responsive design.',
      technologies: ['Next.js', 'React', 'TypeScript', 'Chart.js'],
      image: '📊',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Real-time Analytics', 'Data Visualization', 'Export Reports'],
      category: 'Next.js',
    },
    {
      title: 'Fitness Tracker Mobile App',
      description:
        'Cross-platform fitness tracking application with workout plans, progress tracking, and nutrition logging. Built with Flutter for iOS and Android.',
      technologies: ['Flutter', 'Dart', 'Firebase', 'BLOC'],
      image: '💪',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Workout Plans', 'Progress Tracking', 'Nutrition Logs'],
      category: 'Flutter',
    },
  ];

  const filters = ['All', 'React', 'Next.js', 'Flutter', 'Shopify'];

  const filteredProjects = activeFilter === 'All' 
    ? projects 
    : projects.filter(project => project.category === activeFilter);

  return (
    <section id="projects" className={styles.projects}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        
        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter}
              className={`${styles.filterButton} ${activeFilter === filter ? styles.active : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className={styles.projectsGrid}>
          {filteredProjects.map((project, idx) => (
            <div key={idx} className={styles.projectCard}>
              <div className={styles.projectImage}>
                <span className={styles.emoji}>{project.image}</span>
              </div>
              <div className={styles.projectContent}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectDescription}>{project.description}</p>
                {project.collaborators && project.collaborators.length > 0 && (
                  <div className={styles.collaborators}>
                    <span className={styles.collaboratorIcon}>👥</span>
                    <span className={styles.collaboratorText}>
                      Collaborated with:{' '}
                      {project.collaborators.map((collaborator, collabIdx) => (
                        <span key={collabIdx}>
                          {collabIdx > 0 && ', '}
                          <a 
                            href={collaborator.linkedIn} 
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
                <div className={styles.projectLinks}>
                  <a href={project.liveUrl} className={styles.link}>
                    <span>Live Demo</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
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
                  <a href={project.githubUrl} className={styles.link}>
                    <span>GitHub</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

