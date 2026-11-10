'use client';

import type { KeyboardEvent } from 'react';
import { STRENGTH_ICONS, type StrengthDoc, type StrengthIcon } from '../../../../lib/content/schema';
import { STRENGTH_ICON_COMPONENTS } from '../../../../lib/content/icons';
import { Field, LocalizedField, Section } from '../_editor/fields';
import { ItemList } from '../_editor/ItemList';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor } from '../_editor/useContentEditor';
import c from '../content.module.css';

const blank = { en: '', ar: '' };

/** A radio group of icons: one Tab stop, arrow keys move the choice. */
function IconPicker({ value, onChange }: { value: StrengthIcon; onChange: (icon: StrengthIcon) => void }) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const index = STRENGTH_ICONS.indexOf(value);
    const next = STRENGTH_ICONS[(index + delta + STRENGTH_ICONS.length) % STRENGTH_ICONS.length];
    onChange(next);
    const group = event.currentTarget;
    window.requestAnimationFrame(() => group.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };
  return (
    <Field label="Icon">
      <div role="radiogroup" aria-label="Icon" className={c.iconPicker} onKeyDown={onKeyDown}>
        {STRENGTH_ICONS.map((name) => {
          const Icon = STRENGTH_ICON_COMPONENTS[name];
          const checked = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={name.replace('-', ' ')}
              title={name.replace('-', ' ')}
              tabIndex={checked ? 0 : -1}
              className={c.iconOption}
              onClick={() => onChange(name)}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export default function StrengthsEditor({ initial, edited }: { initial: StrengthDoc[]; edited: boolean }) {
  const editor = useContentEditor({
    part: 'strengths',
    initial,
    initiallyEdited: edited,
    itemName: (items, i) => items[i]?.title.en || undefined,
  });

  return (
    <div className={c.editor}>
      <Section
        title="Strengths"
        description="The “What I bring to a team” cards. Keep each proof line verifiably true."
      >
        <ItemList
          items={editor.value}
          onChange={editor.setValue}
          noun="strength"
          max={12}
          addLabel="Add a strength"
          empty="No strengths yet."
          title={(s) => s.title.en || 'New strength'}
          leading={(s) => {
            const Icon = STRENGTH_ICON_COMPONENTS[s.icon];
            return (
              <span className={c.platform} aria-hidden="true">
                <Icon size={17} />
              </span>
            );
          }}
          create={(): StrengthDoc => ({
            id: `strength-${Date.now().toString(36)}`,
            icon: 'sparkles',
            title: blank,
            proof: blank,
          })}
        >
          {(strength, update) => (
            <>
              <IconPicker value={strength.icon} onChange={(icon) => update({ icon })} />
              <div className={c.fields}>
                <LocalizedField label="Title" wide value={strength.title} onChange={(title) => update({ title })} />
                <LocalizedField
                  label="Proof"
                  hint="One sentence backing the claim up."
                  wide
                  multiline
                  value={strength.proof}
                  onChange={(proof) => update({ proof })}
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
        viewHref="/#strengths"
      />
    </div>
  );
}
