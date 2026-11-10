import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../../lib/session';
import { readStoredContent } from '../../../../../lib/content/store';
import {
  NAMESPACE_LABELS,
  TEXT_SECTIONS,
  currentText,
  defaultText,
  keyLabel,
  placeholders,
  sectionKeys,
} from '../../../../../lib/content/text';
import { StorageNotice } from '../../_editor/StorageNotice';
import TextEditor, { type TextGroup } from '../TextEditor';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  return { title: TEXT_SECTIONS.find((s) => s.id === section)?.label ?? 'Section text' };
}

export default async function SectionTextPage({ params }: Params) {
  await requireAdminSession();
  const { section: id } = await params;
  const section = TEXT_SECTIONS.find((s) => s.id === id);
  if (!section) notFound();

  const stored = await readStoredContent();
  const keys = sectionKeys(section);
  const multi = section.namespaces.length > 1;
  const groups: TextGroup[] = section.namespaces
    .map((ns) => ({
      title: multi ? (NAMESPACE_LABELS[ns] ?? ns) : null,
      fields: keys
        .filter((key) => key.startsWith(`${ns}.`))
        .map((key) => {
          const original = defaultText(key, 'en');
          return {
            key,
            label: keyLabel(key),
            multiline: original.length > 70 || defaultText(key, 'ar').length > 70,
            tokens: placeholders(original),
          };
        }),
    }))
    .filter((group) => group.fields.length > 0);
  const edited = keys.some((key) => key in stored.text.en || key in stored.text.ar);

  return (
    <>
      <StorageNotice stored={stored} />
      <TextEditor
        section={{ id: section.id, label: section.label, description: section.description, view: section.view }}
        groups={groups}
        initialText={currentText(keys, stored.text)}
        edited={edited}
      />
    </>
  );
}
