'use client';

import { SOCIAL_PLACEMENTS, SOCIAL_PLATFORMS, type SocialLink, type SocialPlatform } from '../../../../lib/content/schema';
import { SOCIAL_ICONS } from '../../../../lib/content/icons';
import { SelectField, Section, TextField, Toggle } from '../_editor/fields';
import { ItemList } from '../_editor/ItemList';
import { SaveBar } from '../_editor/SaveBar';
import { useContentEditor } from '../_editor/useContentEditor';
import c from '../content.module.css';

const URL_HINTS: Partial<Record<SocialPlatform, string>> = {
  linkedin: 'https://www.linkedin.com/in/your-name',
  github: 'https://github.com/your-name',
  gitlab: 'https://gitlab.com/your-name',
  x: 'https://x.com/your-name',
  instagram: 'https://instagram.com/your-name',
  facebook: 'https://facebook.com/your-name',
  youtube: 'https://youtube.com/@your-channel',
  dribbble: 'https://dribbble.com/your-name',
  behance: 'https://behance.net/your-name',
  figma: 'https://figma.com/@your-name',
  codepen: 'https://codepen.io/your-name',
  whatsapp: 'https://wa.me/9639xxxxxxxx',
  telegram: 'https://t.me/your-name',
  email: 'mailto:you@example.com',
  website: 'https://example.com',
};

const PLATFORM_OPTIONS = (Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).map((value) => ({
  value,
  label: SOCIAL_PLATFORMS[value],
}));

function shortUrl(url: string) {
  return url.replace(/^(mailto:|tel:|https?:\/\/(www\.)?)/i, '').replace(/\/$/, '');
}

export default function SocialEditor({ initial, edited }: { initial: SocialLink[]; edited: boolean }) {
  const editor = useContentEditor({
    part: 'socials',
    initial,
    initiallyEdited: edited,
    itemName: (links, i) => (links[i] ? SOCIAL_PLATFORMS[links[i].platform] : undefined),
  });

  return (
    <div className={c.editor}>
      <Section
        title="Social links"
        description="Choose where each link appears. The order here is the order on the site. Your email is set under Profile & contact."
      >
        <ItemList
          items={editor.value}
          onChange={editor.setValue}
          noun="link"
          max={20}
          addLabel="Add a link"
          empty="No social links yet."
          title={(link) => SOCIAL_PLATFORMS[link.platform]}
          leading={(link) => {
            const Icon = SOCIAL_ICONS[link.platform];
            return (
              <span className={c.platform} aria-hidden="true">
                <Icon size={17} />
              </span>
            );
          }}
          meta={(link) => (
            <>
              <span className={c.preview}>{link.label || shortUrl(link.url) || 'No link yet'}</span>
              {(Object.keys(SOCIAL_PLACEMENTS) as (keyof typeof SOCIAL_PLACEMENTS)[])
                .filter((place) => link[place])
                .map((place) => (
                  <span key={place} className={c.status}>
                    {SOCIAL_PLACEMENTS[place]}
                  </span>
                ))}
            </>
          )}
          create={(): SocialLink => ({
            id: `link-${Date.now().toString(36)}`,
            platform: 'website',
            url: '',
            label: '',
            hero: false,
            about: false,
            contact: true,
            footer: true,
          })}
        >
          {(link, update) => (
            <>
              <div className={c.fields}>
                <SelectField
                  label="Platform"
                  value={link.platform}
                  options={PLATFORM_OPTIONS}
                  onChange={(platform) => update({ platform })}
                />
                <TextField
                  label="Link"
                  type="url"
                  ltr
                  value={link.url}
                  onChange={(url) => update({ url })}
                  placeholder={URL_HINTS[link.platform] ?? 'https://…'}
                />
                <TextField
                  label="Text shown on the site"
                  ltr
                  value={link.label}
                  onChange={(label) => update({ label })}
                  placeholder={shortUrl(link.url) || 'in/your-name'}
                  hint="Leave blank to show the link itself without https://."
                  wide
                />
              </div>
              <div className={c.field}>
                <span className={c.label}>Show it in</span>
                <div className={c.toggles}>
                  {(Object.keys(SOCIAL_PLACEMENTS) as (keyof typeof SOCIAL_PLACEMENTS)[]).map((place) => (
                    <Toggle
                      key={place}
                      label={SOCIAL_PLACEMENTS[place]}
                      checked={link[place]}
                      onChange={(on) => update({ [place]: on } as Partial<SocialLink>)}
                    />
                  ))}
                </div>
                <p className={c.hint}>Hero shows an icon under the buttons; the others show the icon with its text.</p>
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
        viewHref="/#contact"
      />
    </div>
  );
}
