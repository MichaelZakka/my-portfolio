import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { StorageNotice } from '../_editor/StorageNotice';
import ExperienceEditor from './ExperienceEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Experience' };

export default async function ExperienceContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  return (
    <>
      <StorageNotice stored={stored} part="experience" />
      <ExperienceEditor initial={resolveDocs(stored).experience} edited={Boolean(stored.docs.experience)} />
    </>
  );
}
