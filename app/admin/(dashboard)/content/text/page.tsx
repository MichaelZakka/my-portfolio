import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent } from '../../../../lib/content/store';
import { TEXT_SECTIONS, sectionKeys } from '../../../../lib/content/text';
import { StorageNotice } from '../_editor/StorageNotice';
import c from '../content.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Section text' };

export default async function SectionTextIndexPage() {
  await requireAdminSession();
  const stored = await readStoredContent();

  return (
    <>
      <StorageNotice stored={stored} />
      <p className={c.sectionText} style={{ marginBottom: '1rem' }}>
        Headings, paragraphs, buttons and labels of every section, in English and Arabic. Lists such as projects and
        skills have their own editors.
      </p>
      <div className={c.sectionList}>
        {TEXT_SECTIONS.map((section) => {
          const keys = sectionKeys(section);
          const edited = keys.filter((key) => key in stored.text.en || key in stored.text.ar).length;
          return (
            <Link key={section.id} href={`/admin/content/text/${section.id}`} className={c.sectionCard}>
              <span className={c.overviewTitle}>{section.label}</span>
              <span className={c.overviewText}>{section.description}</span>
              <span className={`${c.status} ${edited ? c.statusEdited : ''}`}>
                {edited ? `${edited} of ${keys.length} edited` : `${keys.length} texts · original`}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
