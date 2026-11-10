import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { StorageNotice } from '../_editor/StorageNotice';
import StrengthsEditor from './StrengthsEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Strengths' };

export default async function StrengthsContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  return (
    <>
      <StorageNotice stored={stored} part="strengths" />
      <StrengthsEditor initial={resolveDocs(stored).strengths} edited={Boolean(stored.docs.strengths)} />
    </>
  );
}
