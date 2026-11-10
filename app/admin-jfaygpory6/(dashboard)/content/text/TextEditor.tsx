'use client';

import { LocalizedField, Section } from '../_editor/fields';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor, type TextState } from '../_editor/useContentEditor';
import c from '../content.module.css';

export type TextFieldSpec = {
  key: string;
  label: string;
  multiline: boolean;
  /** {placeholders} the text must keep. */
  tokens: string[];
};

export type TextGroup = { title: string | null; fields: TextFieldSpec[] };

/** A friendly check before the server's: the placeholders must survive, no stray braces or tags. */
function problem(value: string, tokens: string[]): string | null {
  if (!value) return null;
  const found = [...value.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*\}/g)].map((m) => m[1]).sort();
  if (found.join() !== [...tokens].sort().join()) {
    return tokens.length ? `Keep ${tokens.map((t) => `{${t}}`).join(', ')} exactly as written.` : 'Remove the {…} placeholder.';
  }
  if (/[{}]/.test(value.replace(/\{\s*[a-zA-Z0-9_]+\s*\}/g, ''))) return 'Curly braces { } are reserved for placeholders.';
  if (/<\/?[a-zA-Z]/.test(value)) return 'Tags like <b> are not supported.';
  return null;
}

export default function TextEditor({
  section,
  groups,
  initialText,
  edited,
}: {
  section: { id: string; label: string; description: string; view: string };
  groups: TextGroup[];
  initialText: TextState;
  edited: boolean;
}) {
  const editor = useContentEditor<null>({ part: 'text', initial: null, initialText, initiallyEdited: edited });

  return (
    <div className={c.editor}>
      {groups.map((group) => (
        <Section
          key={group.title ?? section.id}
          title={group.title ?? section.label}
          description={group.title ? undefined : section.description}
        >
          <div className={c.textList}>
            {group.fields.map((field) => {
              const value = editor.text[field.key];
              if (!value) return null;
              const changed = value.en !== value.defaultEn || value.ar !== value.defaultAr;
              const issue = problem(value.en, field.tokens) ?? problem(value.ar, field.tokens);
              return (
                <LocalizedField
                  key={field.key}
                  label={field.label}
                  multiline={field.multiline}
                  rows={field.multiline ? 3 : 2}
                  value={{ en: value.en, ar: value.ar }}
                  placeholder={{ en: value.defaultEn, ar: value.defaultAr }}
                  onChange={(next) => editor.updateText(field.key, next)}
                  hint={
                    <>
                      {issue ? <span className={c.fieldError}>{issue} </span> : null}
                      {field.tokens.length > 0 && !issue && (
                        <>Keep {field.tokens.map((t) => `{${t}}`).join(', ')}: it’s filled in on the site. </>
                      )}
                      <span className={c.textKey}>{field.key}</span>
                    </>
                  }
                  extra={
                    changed ? (
                      <span className={c.edited}>
                        Edited ·{' '}
                        <button
                          type="button"
                          className={c.linkButton}
                          onClick={() => editor.updateText(field.key, { en: value.defaultEn, ar: value.defaultAr })}
                        >
                          Reset
                        </button>
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </Section>
      ))}

      <SaveBar
        dirty={editor.dirty}
        edited={editor.edited}
        pending={editor.pending}
        error={editor.error}
        notice={editor.notice}
        onSave={editor.save}
        onDiscard={editor.discard}
        onReset={editor.reset}
        viewHref={section.view}
      />
    </div>
  );
}
