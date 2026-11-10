'use client';

import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import admin from '../../../admin.module.css';
import c from '../content.module.css';

/**
 * Sticky bar at the bottom of an editor: save state, Save / Discard / Reset,
 * a link to the live page, and the result of the last save. Ctrl/⌘ + S saves.
 */
export function SaveBar({
  dirty,
  edited,
  pending,
  error,
  notice,
  onSave,
  onDiscard,
  onReset,
  viewHref,
}: {
  dirty: boolean;
  edited: boolean;
  pending: 'save' | 'reset' | null;
  error: string;
  notice: string;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  viewHref?: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSave]);

  const state = pending === 'save'
    ? 'Saving…'
    : pending === 'reset'
      ? 'Resetting…'
      : dirty
        ? 'Unsaved changes'
        : edited
          ? 'All changes saved'
          : 'Showing the original content';

  return (
    <div className={c.saveDock}>
      {error && (
        <div className={admin.bannerError} role="alert">
          {error}
        </div>
      )}
      {notice && !error && (
        <div className={admin.bannerSuccess} role="status">
          {notice}
        </div>
      )}
      <div className={`${c.saveBar} ${dirty ? c.saveBarDirty : ''}`}>
        <span className={c.saveState} aria-live="polite">
          <span className={c.saveDot} aria-hidden="true" />
          {state}
        </span>
        {viewHref && (
          <a className={c.viewLink} href={viewHref} target="_blank" rel="noopener">
            View on site
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
        <div className={c.saveButtons}>
          {edited && !dirty && (
            <button type="button" className={c.ghostButton} onClick={onReset} disabled={pending !== null}>
              Reset to original
            </button>
          )}
          {dirty && (
            <button type="button" className={c.ghostButton} onClick={onDiscard} disabled={pending !== null}>
              Discard
            </button>
          )}
          <button
            type="button"
            className={`${admin.button} ${admin.buttonPrimary}`}
            onClick={onSave}
            aria-disabled={!dirty || pending !== null}
          >
            {pending === 'save' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
