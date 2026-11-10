'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Localized, LocalizedList } from '../../../../lib/content/schema';
import admin from '../../../admin.module.css';
import c from '../content.module.css';

/** Rows for a textarea: grows with its content, within limits. */
function rowsFor(value: string, min: number, max = 14): number {
  const lines = value.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 70)), 0);
  return Math.min(max, Math.max(min, lines));
}

export function Field({
  label,
  hint,
  htmlFor,
  wide,
  extra,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  wide?: boolean;
  /** Shown beside the label (e.g. "Edited · Reset"). */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${c.field} ${wide ? c.fieldWide : ''}`}>
      <div className={c.fieldHead}>
        {htmlFor ? (
          <label className={c.label} htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className={c.label}>{label}</span>
        )}
        {extra}
      </div>
      {children}
      {hint && <p className={c.hint}>{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  wide,
  type = 'text',
  placeholder,
  maxLength,
  ltr,
  multiline,
  rows = 3,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
  placeholder?: string;
  maxLength?: number;
  /** Links, emails, codes: always left-to-right. */
  ltr?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} wide={wide}>
      {multiline ? (
        <textarea
          id={id}
          className={`${admin.textarea} ${c.control}`}
          value={value}
          rows={rowsFor(value, rows)}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={`${admin.input} ${c.control}`}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          dir={ltr ? 'ltr' : undefined}
          spellCheck={ltr ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/** One text in English and Arabic, side by side. A blank Arabic value shows the English on the Arabic site. */
export function LocalizedField({
  label,
  hint,
  value,
  onChange,
  wide,
  multiline,
  rows = 2,
  maxLength,
  placeholder,
  extra,
}: {
  label: string;
  hint?: ReactNode;
  value: Localized;
  onChange: (value: Localized) => void;
  wide?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  /** Shown while a field is empty (e.g. the original text). */
  placeholder?: Partial<Localized>;
  extra?: ReactNode;
}) {
  const id = useId();
  const control = (locale: 'en' | 'ar') => {
    const common = {
      id: `${id}-${locale}`,
      value: value[locale],
      maxLength,
      lang: locale,
      dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
      'aria-label': `${label} (${locale === 'en' ? 'English' : 'Arabic'})`,
      placeholder:
        locale === 'ar'
          ? placeholder?.ar || (value.en ? 'Leave blank to show the English' : '')
          : placeholder?.en,
      onChange: (e: { target: { value: string } }) => onChange({ ...value, [locale]: e.target.value }),
    };
    return multiline ? (
      <textarea {...common} className={`${admin.textarea} ${c.control}`} rows={rowsFor(value[locale] || value.en, rows)} />
    ) : (
      <input {...common} className={`${admin.input} ${c.control}`} />
    );
  };
  return (
    <Field label={label} hint={hint} htmlFor={`${id}-en`} wide={wide} extra={extra}>
      <div className={c.langGrid}>
        <div className={c.lang}>
          {control('en')}
          <span className={c.langTag} aria-hidden="true">
            EN
          </span>
        </div>
        <div className={c.lang}>
          {control('ar')}
          <span className={`${c.langTag} ${c.langTagStart}`} aria-hidden="true">
            ع
          </span>
        </div>
      </div>
    </Field>
  );
}

const toLines = (list: string[]) => list.join('\n');
const fromLines = (text: string) => text.split('\n');

/** A list of sentences per language, one per line. */
export function LocalizedLines({
  label,
  hint,
  value,
  onChange,
  wide = true,
}: {
  label: string;
  hint?: ReactNode;
  value: LocalizedList;
  onChange: (value: LocalizedList) => void;
  wide?: boolean;
}) {
  return (
    <LocalizedField
      label={label}
      hint={hint ?? 'One item per line. Leave the Arabic blank to show the English list.'}
      wide={wide}
      multiline
      rows={3}
      value={{ en: toLines(value.en), ar: toLines(value.ar) }}
      onChange={(next) => onChange({ en: fromLines(next.en), ar: fromLines(next.ar) })}
    />
  );
}

/** Short labels (a tech stack): type and press Enter or comma; × removes. */
export function TagsField({
  label,
  hint,
  value,
  onChange,
  max,
  placeholder = 'Type and press Enter',
  wide = true,
}: {
  label: string;
  hint?: ReactNode;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  placeholder?: string;
  wide?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const full = max !== undefined && value.length >= max;

  const commit = () => {
    const tag = draft.trim().replace(/,$/, '').trim();
    if (tag && !value.includes(tag) && !full) onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Field
      label={label}
      hint={hint ?? (max ? `${value.length} of ${max}` : undefined)}
      htmlFor={id}
      wide={wide}
    >
      <div className={c.tags}>
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className={c.tag} dir="ltr">
            {tag}
            <button
              type="button"
              className={c.tagRemove}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`Remove ${tag}`}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className={c.tagInput}
          value={draft}
          placeholder={full ? 'List is full' : placeholder}
          disabled={full}
          dir="ltr"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={c.toggle}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={c.toggleTrack} aria-hidden="true" />
      <span className={c.toggleText}>
        {label}
        {hint && <span className={c.hint}>{hint}</span>}
      </span>
    </label>
  );
}

export function SelectField<V extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  hint?: ReactNode;
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string }[];
  wide?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} wide={wide}>
      <select id={id} className={`${admin.select} ${c.control}`} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** A titled block inside an editor. */
export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={c.section}>
      <div className={c.sectionHead}>
        <div>
          <h2 className={c.sectionTitle}>{title}</h2>
          {description && <p className={c.sectionText}>{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
