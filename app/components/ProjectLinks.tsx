'use client';

import { ExternalLink, Github, Lock } from 'lucide-react';
import styles from './ProjectLinks.module.css';
import { trackEvent } from '../lib/analyticsClient';
import type { Project } from '../../data/projects';

type Props = Pick<Project, 'title' | 'liveUrl' | 'repoUrl' | 'repoPrivateNote'> & {
  size?: 'sm' | 'md';
};

/** Live / Code buttons, or a "Client code private" label when the source isn't public. */
export default function ProjectLinks({ title, liveUrl, repoUrl, repoPrivateNote, size = 'sm' }: Props) {
  return (
    <div className={`${styles.links} ${size === 'sm' ? styles.sm : ''}`}>
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          onClick={() => trackEvent('cta_click', { label: 'project-live', meta: { project: title } })}
        >
          <ExternalLink size={16} aria-hidden />
          Live
          <span className="visually-hidden">: {title} (opens in a new tab)</span>
        </a>
      )}
      {repoUrl ? (
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          onClick={() => trackEvent('cta_click', { label: 'project-code', meta: { project: title } })}
        >
          <Github size={16} aria-hidden />
          Code
          <span className="visually-hidden">: {title} source on GitHub (opens in a new tab)</span>
        </a>
      ) : repoPrivateNote ? (
        <span className={styles.private}>
          <Lock size={14} aria-hidden />
          {repoPrivateNote}
        </span>
      ) : null}
    </div>
  );
}
