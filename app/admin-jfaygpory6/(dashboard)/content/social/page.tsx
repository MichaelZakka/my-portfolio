import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { StorageNotice } from '../_editor/StorageNotice';
import SocialEditor from './SocialEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Social links' };

export default async function SocialContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  return (
    <>
      <StorageNotice stored={stored} part="socials" />
      <SocialEditor initial={resolveDocs(stored).socials} edited={Boolean(stored.docs.socials)} />
    </>
  );
}
