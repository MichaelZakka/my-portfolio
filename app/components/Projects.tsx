import styles from './Projects.module.css';

export default function Projects() {
  const projects = [
    {
      title: 'E-Commerce Platform',
      description:
        'Full-featured online shopping platform with real-time inventory management, payment integration, and advanced search capabilities.',
      technologies: ['Next.js', 'TypeScript', 'PostgreSQL', 'Stripe', 'Redis'],
      image: '🛒',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['100K+ users', 'Real-time updates', 'Mobile responsive'],
    },
    {
      title: 'Cloud Analytics Dashboard',
      description:
        'Real-time analytics dashboard for monitoring cloud infrastructure metrics with customizable widgets and alerting system.',
      technologies: ['React', 'Python', 'AWS', 'Docker', 'MongoDB'],
      image: '📊',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Real-time data', 'Custom alerts', 'Multi-cloud'],
    },
    {
      title: 'Task Management System',
      description:
        'Collaborative project management tool with team workspaces, time tracking, and integration with popular development tools.',
      technologies: ['Vue.js', 'Node.js', 'WebSocket', 'MySQL', 'Redis'],
      image: '✅',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['Team collaboration', 'Real-time sync', 'API integrations'],
    },
    {
      title: 'AI Content Generator',
      description:
        'Machine learning powered content generation platform with natural language processing and multi-language support.',
      technologies: ['React', 'Python', 'TensorFlow', 'FastAPI', 'PostgreSQL'],
      image: '🤖',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['AI-powered', '10+ languages', 'API access'],
    },
    {
      title: 'Video Streaming App',
      description:
        'Netflix-style streaming platform with adaptive bitrate streaming, user profiles, and recommendation engine.',
      technologies: ['Next.js', 'Node.js', 'FFmpeg', 'AWS S3', 'MongoDB'],
      image: '🎬',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['1080p streaming', 'Smart recommendations', 'Offline mode'],
    },
    {
      title: 'Social Network API',
      description:
        'RESTful API for social networking features including posts, comments, likes, and real-time messaging.',
      technologies: ['Node.js', 'GraphQL', 'PostgreSQL', 'Redis', 'Docker'],
      image: '🌐',
      liveUrl: '#',
      githubUrl: '#',
      highlights: ['GraphQL API', 'Real-time chat', 'Highly scalable'],
    },
  ];

  return (
    <section id="projects" className={styles.projects}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.projectsGrid}>
          {projects.map((project, idx) => (
            <div key={idx} className={styles.projectCard}>
              <div className={styles.projectImage}>
                <span className={styles.emoji}>{project.image}</span>
              </div>
              <div className={styles.projectContent}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectDescription}>{project.description}</p>
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

