import type { StoredContent } from '../../../../lib/content/store';
import admin from '../../../admin.module.css';

/** Warns when content can't be saved yet, or when saved content no longer reads and the original shows. */
export function StorageNotice({ stored, part }: { stored: StoredContent; part?: string }) {
  if (!stored.available) {
    return (
      <div className={admin.bannerError} role="alert">
        The content table isn’t in the database yet, so changes can’t be saved. It’s created by the{' '}
        <code>20261110000000_site_content</code> migration, which runs on the next deploy (<code>prisma migrate deploy</code>).
      </div>
    );
  }
  if (part && stored.invalid.includes(part)) {
    return (
      <div className={admin.bannerError} role="alert">
        The saved version of this content couldn’t be read, so the site and this editor show the original content.
        Saving here replaces the unreadable version.
      </div>
    );
  }
  return null;
}
