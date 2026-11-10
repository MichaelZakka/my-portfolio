import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { StorageNotice } from '../_editor/StorageNotice';
import SkillsEditor from './SkillsEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Skills' };

export default async function SkillsContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  return (
    <>
      <StorageNotice stored={stored} part="skills" />
      <SkillsEditor initial={resolveDocs(stored).skills} edited={Boolean(stored.docs.skills)} />
    </>
  );
}
