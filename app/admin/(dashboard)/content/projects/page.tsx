import type { Metadata } from 'next';
import { requireAdminSession } from '../../../../lib/session';
import { readStoredContent, resolveDocs } from '../../../../lib/content/store';
import { SCREENSHOT_SETS } from '../../../../lib/content/defaults';
import { StorageNotice } from '../_editor/StorageNotice';
import ProjectsEditor from './ProjectsEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Portfolio projects' };

export default async function ProjectsContentPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  const screenshotSets = Object.entries(SCREENSHOT_SETS).map(([value, set]) => ({ value, label: set.label }));
  return (
    <>
      <StorageNotice stored={stored} part="projects" />
      <ProjectsEditor
        initial={resolveDocs(stored).projects}
        edited={Boolean(stored.docs.projects)}
        screenshotSets={screenshotSets}
      />
    </>
  );
}
