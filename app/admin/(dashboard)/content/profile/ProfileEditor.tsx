'use client';

import { PROFILE_TEXT_KEYS, type Profile } from '../../../../lib/content/schema';
import { LocalizedField, Section, TextField, Toggle } from '../_editor/fields';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor, type TextState } from '../_editor/useContentEditor';
import c from '../content.module.css';

const K = PROFILE_TEXT_KEYS;

export default function ProfileEditor({
  initial,
  initialText,
  edited,
}: {
  initial: Profile;
  initialText: TextState;
  edited: boolean;
}) {
  const editor = useContentEditor({ part: 'profile', initial, initialText, initiallyEdited: edited });
  const profile = editor.value;
  const set = (patch: Partial<Profile>) => editor.setValue({ ...profile, ...patch });
  const textField = (key: string) => ({
    value: { en: editor.text[key]?.en ?? '', ar: editor.text[key]?.ar ?? '' },
    placeholder: { en: editor.text[key]?.defaultEn, ar: editor.text[key]?.defaultAr },
    onChange: (next: { en: string; ar: string }) => editor.updateText(key, next),
  });
  const digits = profile.phone.replace(/\D/g, '');

  return (
    <div className={c.editor}>
      <Section title="Name & title" description="Shown in the hero, in search results and in link previews.">
        <div className={c.fields}>
          <LocalizedField label="Name" hint="The large heading at the top of the home page." {...textField(K.name)} />
          <LocalizedField
            label="Job title"
            hint="Text in (brackets) shows in search results, the menu and the footer, but not in the hero."
            {...textField(K.jobTitle)}
          />
        </div>
      </Section>

      <Section
        title="Contact"
        description="The email shows in the About card, the Contact section and the footer. The phone stays private unless you switch it on."
      >
        <div className={c.fields}>
          <TextField
            label="Email"
            type="email"
            ltr
            value={profile.email}
            onChange={(email) => set({ email })}
            placeholder="you@example.com"
            hint="Leave blank to hide it everywhere."
          />
          <TextField
            label="Phone (with country code)"
            type="tel"
            ltr
            value={profile.phone}
            onChange={(phone) => set({ phone })}
            placeholder="+963 9xx xxx xxx"
          />
          <div className={c.fieldWide}>
            <div className={c.toggles}>
              <Toggle
                label="Show the phone on the site"
                hint="Adds a Phone card to the Contact section."
                checked={profile.showPhone}
                onChange={(showPhone) => set({ showPhone })}
              />
              <Toggle
                label="Show WhatsApp on the site"
                hint={digits ? `Adds a WhatsApp card that opens wa.me/${digits}.` : 'Uses the phone number above.'}
                checked={profile.showWhatsApp}
                onChange={(showWhatsApp) => set({ showWhatsApp })}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Location & languages" description="The About card’s info rows.">
        <div className={c.fields}>
          <LocalizedField label="Location" {...textField(K.location)} />
          <LocalizedField label="Languages" {...textField(K.languages)} />
          <TextField
            label="City (for search engines)"
            ltr
            value={profile.city}
            onChange={(city) => set({ city })}
            hint="In English; used in the structured data Google reads."
          />
          <TextField
            label="Country code"
            ltr
            value={profile.countryCode}
            maxLength={2}
            onChange={(countryCode) => set({ countryCode: countryCode.toUpperCase() })}
            hint="Two letters, e.g. SY."
          />
        </div>
      </Section>

      <Section title="Files & links">
        <div className={c.fields}>
          <TextField
            label="CV / résumé"
            ltr
            value={profile.resumeUrl}
            onChange={(resumeUrl) => set({ resumeUrl })}
            placeholder="/michael-zakka-cv.pdf"
            hint="A file on this site (/…) or a full link. Leave blank to hide the download buttons."
          />
          <TextField
            label="Source code of this site"
            ltr
            value={profile.sourceRepoUrl}
            onChange={(sourceRepoUrl) => set({ sourceRepoUrl })}
            placeholder="https://github.com/…"
            hint="Adds a “view source” link to the footer."
          />
        </div>
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
        viewHref="/#about"
      />
    </div>
  );
}
