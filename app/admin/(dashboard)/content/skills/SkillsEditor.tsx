'use client';

import type { SkillsDoc } from '../../../../lib/content/schema';
import { LocalizedField, Section, TagsField } from '../_editor/fields';
import { ItemList, RowList } from '../_editor/ItemList';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor } from '../_editor/useContentEditor';
import c from '../content.module.css';

type Group = SkillsDoc['groups'][number];
const blank = { en: '', ar: '' };

export default function SkillsEditor({ initial, edited }: { initial: SkillsDoc; edited: boolean }) {
  const editor = useContentEditor({ part: 'skills', initial, initiallyEdited: edited });
  const skills = editor.value;
  const setGroups = (groups: Group[]) => editor.setValue({ ...skills, groups });

  return (
    <div className={c.editor}>
      <Section title="Hero terminal" description="The short stack typed out in the terminal card at the top of the home page.">
        <TagsField
          label="Top stack"
          max={10}
          value={skills.topStack}
          onChange={(topStack) => editor.setValue({ ...skills, topStack })}
        />
      </Section>

      <Section title="Skill groups" description="The Skills section. Add an Arabic name only where a skill is translated.">
        <ItemList
          items={skills.groups}
          onChange={setGroups}
          noun="group"
          max={12}
          addLabel="Add a group"
          empty="No skill groups yet."
          title={(g) => g.title.en || 'New group'}
          meta={(g) => (
            <span className={c.preview}>
              {g.skills.length ? g.skills.map((s) => s.en).filter(Boolean).join(', ') : 'No skills yet'}
            </span>
          )}
          create={(): Group => ({ id: `group-${Date.now().toString(36)}`, title: blank, skills: [] })}
        >
          {(group, update) => (
            <>
              <div className={c.fields}>
                <LocalizedField label="Group name" wide value={group.title} onChange={(title) => update({ title })} />
              </div>
              <div className={c.field}>
                <span className={c.label}>Skills</span>
                <RowList
                  items={group.skills}
                  onChange={(next) => update({ skills: next })}
                  noun="skill"
                  max={30}
                  addLabel="Add a skill"
                  create={() => ({ ...blank })}
                  render={(skill, set, i) => (
                    <LocalizedField
                      label={`Skill ${i + 1}`}
                      value={skill}
                      onChange={(next) => set(next)}
                      placeholder={{ en: 'e.g. React' }}
                    />
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
        viewHref="/#skills"
      />
    </div>
  );
}
