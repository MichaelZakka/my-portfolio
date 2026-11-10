'use client';

import type { ProjectDoc } from '../../../../lib/content/schema';
import { LocalizedField, LocalizedLines, SelectField, Section, TagsField, TextField, Toggle } from '../_editor/fields';
import { ItemList, RowList } from '../_editor/ItemList';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor } from '../_editor/useContentEditor';
import c from '../content.module.css';

const blank = { en: '', ar: '' };
const blankList = { en: [] as string[], ar: [] as string[] };
const NEW_SLUG = /^new-project(-[a-z0-9]+)?$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export default function ProjectsEditor({
  initial,
  edited,
  screenshotSets,
}: {
  initial: ProjectDoc[];
  edited: boolean;
  screenshotSets: { value: string; label: string }[];
}) {
  const editor = useContentEditor({
    part: 'projects',
    initial,
    initiallyEdited: edited,
    itemName: (projects, i) => projects[i]?.title.en || undefined,
  });
  const published = editor.value.filter((p) => p.published).length;
  const screenshotOptions = [{ value: '', label: 'None yet (a branded placeholder)' }, ...screenshotSets];

  return (
    <div className={c.editor}>
      <Section
        title="Portfolio projects"
        description={`Published projects show on the home page, in this order, each with its own case-study page. ${published} of ${editor.value.length} published.`}
      >
        <ItemList
          items={editor.value}
          onChange={editor.setValue}
          noun="project"
          max={40}
          addLabel="Add a project"
          empty="No projects yet."
          title={(p) => p.title.en || 'Untitled project'}
          meta={(p) => (
            <>
              <span className={`${c.status} ${p.published ? c.statusEdited : ''}`}>{p.published ? 'Published' : 'Draft'}</span>
              {p.personal && <span className={c.status}>Personal</span>}
              {!p.screenshots && <span className={c.status}>No screenshots</span>}
            </>
          )}
          create={(): ProjectDoc => ({
            slug: `new-project-${Date.now().toString(36)}`,
            published: false,
            personal: false,
            title: blank,
            summary: blank,
            overview: blank,
            role: blank,
            team: blank,
            challenges: blankList,
            solutions: blankList,
            results: blankList,
            stack: [],
            liveUrl: '',
            repoUrl: '',
            codePrivate: false,
            screenshots: '',
            employer: { name: '', url: '' },
            collaborators: [],
          })}
        >
          {(project, update) => (
            <>
              <div className={c.toggles}>
                <Toggle
                  label="Published"
                  hint="Listed on the home page with its own case-study page."
                  checked={project.published}
                  onChange={(on) => update({ published: on })}
                />
                <Toggle
                  label="Personal project"
                  hint="Shows a “Personal project” badge."
                  checked={project.personal}
                  onChange={(on) => update({ personal: on })}
                />
              </div>

              <div className={c.fields}>
                <LocalizedField
                  label="Title"
                  wide
                  value={project.title}
                  onChange={(title) =>
                    update((p) => ({
                      ...p,
                      title,
                      // A new project's address follows its English title until it's edited
                      slug: NEW_SLUG.test(p.slug) && slugify(title.en) ? slugify(title.en) : p.slug,
                    }))
                  }
                />
                <LocalizedField
                  label="Summary"
                  hint="One line for the card and search results."
                  wide
                  multiline
                  value={project.summary}
                  onChange={(summary) => update({ summary })}
                />
                <LocalizedField
                  label="Overview"
                  hint="The opening paragraph of the case study."
                  wide
                  multiline
                  rows={4}
                  value={project.overview}
                  onChange={(overview) => update({ overview })}
                />
                <LocalizedField label="My role" value={project.role} onChange={(role) => update({ role })} wide />
                <LocalizedField label="Team" value={project.team} onChange={(team) => update({ team })} wide />
                <LocalizedLines label="Challenges" value={project.challenges} onChange={(challenges) => update({ challenges })} />
                <LocalizedLines label="Solutions" value={project.solutions} onChange={(solutions) => update({ solutions })} />
                <LocalizedLines
                  label="Results"
                  hint="Real, measurable outcomes only; the section is hidden while empty. One per line."
                  value={project.results}
                  onChange={(results) => update({ results })}
                />
                <TagsField label="Tech stack" max={25} value={project.stack} onChange={(stack) => update({ stack })} />
                <TextField
                  label="Live site"
                  type="url"
                  ltr
                  value={project.liveUrl}
                  onChange={(liveUrl) => update({ liveUrl })}
                  placeholder="https://…"
                />
                <TextField
                  label="Source code"
                  type="url"
                  ltr
                  value={project.repoUrl}
                  onChange={(repoUrl) => update({ repoUrl })}
                  placeholder="https://github.com/…"
                />
                <div className={c.fieldWide}>
                  <Toggle
                    label="The code is private"
                    hint="Shows “Client code private” instead of a Code button."
                    checked={project.codePrivate}
                    onChange={(codePrivate) => update({ codePrivate })}
                  />
                </div>
                <SelectField
                  label="Screenshots"
                  wide
                  value={project.screenshots}
                  options={screenshotOptions}
                  onChange={(screenshots) => update({ screenshots })}
                  hint="Screenshot sets ship with the site’s code; new images can’t be uploaded here yet."
                />
                <TextField
                  label="Built at (company)"
                  value={project.employer.name}
                  onChange={(name) => update((p) => ({ ...p, employer: { ...p.employer, name } }))}
                  placeholder="e.g. TGMENA"
                />
                <TextField
                  label="Company website"
                  type="url"
                  ltr
                  value={project.employer.url}
                  onChange={(url) => update((p) => ({ ...p, employer: { ...p.employer, url } }))}
                  placeholder="https://…"
                />
              </div>

              <div className={c.field}>
                <span className={c.label}>Collaborators</span>
                <RowList
                  items={project.collaborators}
                  onChange={(collaborators) => update({ collaborators })}
                  noun="collaborator"
                  max={10}
                  addLabel="Add a collaborator"
                  create={() => ({ name: '', url: '' })}
                  render={(person, set, i) => (
                    <div className={c.fields}>
                      <TextField label={`Name ${i + 1}`} value={person.name} onChange={(name) => set({ name })} />
                      <TextField
                        label="Website"
                        type="url"
                        ltr
                        value={person.url}
                        onChange={(url) => set({ url })}
                        placeholder="https://…"
                      />
                    </div>
                  )}
                />
              </div>

              <TextField
                label="Web address"
                ltr
                value={project.slug}
                onChange={(slug) => update({ slug: slug.toLowerCase() })}
                hint={`The case study lives at /projects/${project.slug || '…'}. Changing it breaks existing links to it.`}
              />
            </>
          )}
        </ItemList>
      </Section>

      <SaveBar
        dirty={editor.dirty}
        edited={editor.edited}
        pending={editor.pending}
        error={editor.error}
        notice={editor.notice}
        onSave={editor.save}
        onDiscard={editor.discard}
        onReset={editor.reset}
        viewHref="/#projects"
      />
    </div>
  );
}
