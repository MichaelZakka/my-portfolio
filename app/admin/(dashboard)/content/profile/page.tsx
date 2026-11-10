import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { currentText } from '../../../../lib/content/text';
import { PROFILE_TEXT_KEYS } from '../../../../lib/content/schema';
import { StorageNotice } from '../_editor/StorageNotice';
import ProfileEditor from './ProfileEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile & contact' };

export default async function ProfileContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  const keys = Object.values(PROFILE_TEXT_KEYS);
  const edited =
    Boolean(stored.docs.profile) || keys.some((key) => key in stored.text.en || key in stored.text.ar);

  return (
    <>
      <StorageNotice stored={stored} part="profile" />
      <ProfileEditor initial={resolveDocs(stored).profile} initialText={currentText(keys, stored.text)} edited={edited} />
    </>
  );
}
