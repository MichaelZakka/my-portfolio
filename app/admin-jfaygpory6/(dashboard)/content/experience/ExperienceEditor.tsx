'use client';

import type { RoleDoc } from '../../../../lib/content/schema';
import { LocalizedField, Section, TextField } from '../_editor/fields';
import { ItemList, RowList } from '../_editor/ItemList';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor } from '../_editor/useContentEditor';
import c from '../content.module.css';

const blank = { en: '', ar: '' };

export default function ExperienceEditor({ initial, edited }: { initial: RoleDoc[]; edited: boolean }) {
  const editor = useContentEditor({
    part: 'experience',
    initial,
    initiallyEdited: edited,
    itemName: (roles, i) => (roles[i] ? [roles[i].role.en, roles[i].company.en].filter(Boolean).join(' · ') : undefined),
  });

  return (
    <div className={c.editor}>
      <Section title="Experience" description="Your work history, newest first. The order here is the order on the site.">
        <ItemList
          items={editor.value}
          onChange={editor.setValue}
          noun="role"
          max={20}
          addLabel="Add a role"
          empty="No roles yet."
          title={(r) => [r.role.en, r.company.en].filter(Boolean).join(' · ') || 'New role'}
          meta={(r) => (
            <>
              {r.duration.en && <span className={c.preview}>{r.duration.en}</span>}
              <span className={c.status}>
                {r.achievements.length} achievement{r.achievements.length === 1 ? '' : 's'}
              </span>
            </>
          )}
          create={(): RoleDoc => ({
            id: `role-${Date.now().toString(36)}`,
            company: blank,
            companyNote: blank,
            website: '',
            role: blank,
            duration: blank,
            location: blank,
            achievements: [],
          })}
        >
          {(role, update) => (
            <>
              <div className={c.fields}>
                <LocalizedField label="Job title" value={role.role} onChange={(v) => update({ role: v })} />
                <LocalizedField label="Company" value={role.company} onChange={(company) => update({ company })} />
                <LocalizedField
                  label="About the company"
                  hint="Optional one-line note under the company name."
                  wide
                  multiline
                  value={role.companyNote}
                  onChange={(companyNote) => update({ companyNote })}
                />
                <LocalizedField
                  label="Dates"
                  hint="e.g. Oct 2025 – Present"
                  value={role.duration}
                  onChange={(duration) => update({ duration })}
                />
                <LocalizedField
                  label="Location"
                  hint="e.g. Remote · Full time"
                  value={role.location}
                  onChange={(location) => update({ location })}
                />
                <TextField
                  label="Company website"
                  type="url"
                  ltr
                  wide
                  value={role.website}
                  onChange={(website) => update({ website })}
                  placeholder="https://…"
                />
              </div>

              <div className={c.field}>
                <span className={c.label}>Achievements</span>
                <RowList
                  items={role.achievements}
                  onChange={(achievements) => update({ achievements })}
                  noun="achievement"
                  max={15}
                  addLabel="Add an achievement"
                  create={() => ({ text: blank, result: blank })}
                  render={(a, set, i) => (
                    <div className={c.fields}>
                      <LocalizedField
                        label={`Achievement ${i + 1}`}
                        wide
                        multiline
                        value={a.text}
                        onChange={(text) => set({ text })}
                      />
                      <LocalizedField
                        label="Result (optional)"
                        hint="A real number or outcome, shown highlighted after the text."
                        wide
                        value={a.result}
                        onChange={(result) => set({ result })}
                      />
                    </div>
                  )}
                />
              </div>
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
        viewHref="/#experience"
      />
    </div>
  );
}
