'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Github, Lock } from 'lucide-react';
import styles from './ProjectLinks.module.css';
import { trackEvent } from '../lib/analyticsClient';
import type { Project } from '../../data/projects';

type Props = Pick<Project, 'title' | 'liveUrl' | 'repoUrl' | 'repoPrivateNote'> & {
  size?: 'sm' | 'md';
};

/** Live / Code buttons, or a "Client code private" label (any repoPrivateNote) when the source isn't public. */
export default function ProjectLinks({ title, liveUrl, repoUrl, repoPrivateNote, size = 'sm' }: Props) {
  const t = useTranslations();
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
          {t('projects.live')}
          <span className="visually-hidden">
            : {t('projects.liveLabel', { title })} {t('common.opensInNewTab')}
          </span>
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
          {t('projects.code')}
          <span className="visually-hidden">
            : {t('projects.codeLabel', { title })} {t('common.opensInNewTab')}
          </span>
        </a>
      ) : repoPrivateNote ? (
        <span className={styles.private}>
          <Lock size={14} aria-hidden />
          {t('projects.private')}
        </span>
      ) : null}
    </div>
  );
}
