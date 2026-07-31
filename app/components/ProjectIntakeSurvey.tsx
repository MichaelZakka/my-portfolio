'use client';

import { useId, useState, FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code,
  Send,
  ShoppingCart,
  Smartphone,
  Target,
} from 'lucide-react';
import {
  buildWhatsAppMessage,
  INBOX_EMAIL,
  type ProjectBriefPayload,
} from '../lib/projectBrief';
import styles from './ProjectIntakeSurvey.module.css';

const TOTAL_STEPS = 5;

const BUDGET_OPTIONS = [
  'Under $500',
  '$500–$1.5k',
  '$1.5k–$5k',
  '$5k+',
  'Not sure yet',
] as const;

const PROJECT_TYPES = [
  { id: 'web', label: 'Web Project', icon: Code },
  { id: 'landing', label: 'Landing Page', icon: Target },
  { id: 'shopify', label: 'Shopify Store', icon: ShoppingCart },
  { id: 'mobile', label: 'Mobile Application', icon: Smartphone },
  { id: 'other', label: 'Other', icon: null },
] as const;

const BUSINESS_DOMAINS = [
  'E-commerce / Retail',
  'SaaS / Tech',
  'Education',
  'Healthcare',
  'Food & Hospitality',
  'Real Estate',
  'Creative / Portfolio / Personal Brand',
  'Nonprofit / Community',
  'Other',
] as const;

const BRAND_STATUS = ['Yes', 'No', 'In progress'] as const;

const PERSONALITY_OPTIONS = [
  'Modern',
  'Minimal',
  'Bold',
  'Playful',
  'Luxury',
  'Technical',
  'Friendly',
  'Corporate',
] as const;

const MOOD_OPTIONS = ['Dark', 'Light', 'Either'] as const;

const COLOR_APPROACH_OPTIONS = [
  { id: 'match', label: 'Match my existing brand colors' },
  { id: 'open', label: 'Open to recommendations' },
] as const;

const STEP_LABELS = [
  'Overview',
  'Type',
  'Domain',
  'Brand',
  'Visuals',
] as const;

type FormData = ProjectBriefPayload;
type FormErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_DATA: FormData = {
  projectTitle: '',
  projectDescription: '',
  timeline: '',
  budget: '',
  clientName: '',
  clientEmail: '',
  company: '',
  phone: '',
  projectTypes: [],
  projectTypeOther: '',
  businessDomains: [],
  businessDomainOther: '',
  hasBrand: '',
  brandName: '',
  tagline: '',
  personalities: [],
  references: '',
  logoUrl: '',
  primaryColor: '#dc2626',
  secondaryColor: '#e0e0e0',
  accentColor: '#b91c1c',
  mood: '',
  colorApproach: '',
  visualNotes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_NUMBER = '963992833739';

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const COLOR_DEFAULTS = {
  primaryColor: '#dc2626',
  secondaryColor: '#e0e0e0',
  accentColor: '#b91c1c',
} as const;

type ColorKey = keyof typeof COLOR_DEFAULTS;

function isHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{6})$/.test(value);
}

function safeHex(value: string, fallback: string): string {
  if (isHexColor(value)) return value;
  if (/^#([A-Fa-f0-9]{3})$/.test(value)) {
    return `#${value
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return fallback;
}

const COLOR_SWATCHES: { key: ColorKey; label: string; hint: string }[] = [
  { key: 'primaryColor', label: 'Primary', hint: 'Main brand color' },
  { key: 'secondaryColor', label: 'Secondary', hint: 'Supporting color' },
  { key: 'accentColor', label: 'Accent', hint: 'Highlights & CTAs' },
];

export default function ProjectIntakeSurvey() {
  const formId = useId();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateStep = (current: number): boolean => {
    const nextErrors: FormErrors = {};

    if (current === 1) {
      if (!data.projectDescription.trim()) {
        nextErrors.projectDescription = 'Please describe your project.';
      }
      if (!data.clientName.trim()) {
        nextErrors.clientName = 'Name is required.';
      }
      if (!data.clientEmail.trim()) {
        nextErrors.clientEmail = 'Email is required.';
      } else if (!EMAIL_RE.test(data.clientEmail.trim())) {
        nextErrors.clientEmail = 'Enter a valid email address.';
      }
    }

    if (current === 2) {
      if (data.projectTypes.length === 0) {
        nextErrors.projectTypes = 'Select at least one project type.';
      }
      if (data.projectTypes.includes('other') && !data.projectTypeOther.trim()) {
        nextErrors.projectTypeOther = 'Please specify the project type.';
      }
    }

    if (current === 3) {
      if (data.businessDomains.length === 0) {
        nextErrors.businessDomains = 'Select at least one business domain.';
      }
      if (data.businessDomains.includes('Other') && !data.businessDomainOther.trim()) {
        nextErrors.businessDomainOther = 'Please specify the domain.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(step) || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/project-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as { error?: string; success?: boolean };

      if (!response.ok || !result.success) {
        setSubmitError(
          result.error || 'Could not send your brief. Please try again or email me directly.'
        );
        return;
      }

      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(data))}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setSubmitted(true);
    } catch {
      setSubmitError('Could not send your brief. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => `${formId}-${name}-error`;

  if (submitted) {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <div className={styles.successIcon} aria-hidden="true">
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h2 className={styles.successTitle}>Brief sent</h2>
        <p className={styles.successText}>
          Thanks — your project brief was emailed to me. I&apos;ll review it and get back to you
          soon. A WhatsApp draft also opened if you want to follow up there.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setSubmitted(false);
            setStep(1);
            setData(INITIAL_DATA);
            setErrors({});
            setSubmitError('');
          }}
        >
          Start another brief
        </button>
      </div>
    );
  }

  return (
    <div className={styles.survey}>
      <header className={styles.header}>
        <h1 className={styles.title}>Work with me</h1>
        <p className={styles.subtitle}>
          Tell me about your project — a few details help me respond with a clear plan.
        </p>
      </header>

      <div
        className={styles.progress}
        role="navigation"
        aria-label={`Step ${step} of ${TOTAL_STEPS}`}
      >
        <div className={styles.progressTrack} aria-hidden="true">
          <div
            className={styles.progressFill}
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
        <ol className={styles.steps}>
          {STEP_LABELS.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === step;
            const isDone = stepNumber < step;
            return (
              <li
                key={label}
                className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={styles.stepDot} aria-hidden="true">
                  {isDone ? <Check size={14} strokeWidth={3} /> : stepNumber}
                </span>
                <span className={styles.stepLabel}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Project overview</legend>

            <div className={styles.formGroup}>
              <label htmlFor={fieldId('projectTitle')}>Project title / working name</label>
              <input
                id={fieldId('projectTitle')}
                type="text"
                value={data.projectTitle}
                onChange={(e) => updateField('projectTitle', e.target.value)}
                placeholder="e.g. Store redesign, booking app…"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={fieldId('projectDescription')}>
                Project description <span className={styles.required}>*</span>
              </label>
              <textarea
                id={fieldId('projectDescription')}
                value={data.projectDescription}
                onChange={(e) => updateField('projectDescription', e.target.value)}
                placeholder="Goals, problem, audience, and what success looks like…"
                required
                aria-invalid={!!errors.projectDescription}
                aria-describedby={errors.projectDescription ? errorId('projectDescription') : undefined}
              />
              {errors.projectDescription && (
                <p id={errorId('projectDescription')} className={styles.error} role="alert">
                  {errors.projectDescription}
                </p>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('timeline')}>Timeline / deadline</label>
                <input
                  id={fieldId('timeline')}
                  type="text"
                  value={data.timeline}
                  onChange={(e) => updateField('timeline', e.target.value)}
                  placeholder="e.g. 6 weeks, by Sept 1…"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('budget')}>Budget range</label>
                <select
                  id={fieldId('budget')}
                  value={data.budget}
                  onChange={(e) => updateField('budget', e.target.value)}
                >
                  <option value="">Select a range</option>
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('clientName')}>
                  Your name <span className={styles.required}>*</span>
                </label>
                <input
                  id={fieldId('clientName')}
                  type="text"
                  value={data.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  autoComplete="name"
                  required
                  aria-invalid={!!errors.clientName}
                  aria-describedby={errors.clientName ? errorId('clientName') : undefined}
                />
                {errors.clientName && (
                  <p id={errorId('clientName')} className={styles.error} role="alert">
                    {errors.clientName}
                  </p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('clientEmail')}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id={fieldId('clientEmail')}
                  type="email"
                  value={data.clientEmail}
                  onChange={(e) => updateField('clientEmail', e.target.value)}
                  autoComplete="email"
                  required
                  aria-invalid={!!errors.clientEmail}
                  aria-describedby={errors.clientEmail ? errorId('clientEmail') : undefined}
                />
                {errors.clientEmail && (
                  <p id={errorId('clientEmail')} className={styles.error} role="alert">
                    {errors.clientEmail}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('company')}>Company (optional)</label>
                <input
                  id={fieldId('company')}
                  type="text"
                  value={data.company}
                  onChange={(e) => updateField('company', e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('phone')}>Phone (optional)</label>
                <input
                  id={fieldId('phone')}
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Project type</legend>
            <p className={styles.hint} id={fieldId('projectTypes-hint')}>
              Select all that apply.
            </p>
            <div
              className={styles.chipGrid}
              role="group"
              aria-describedby={`${fieldId('projectTypes-hint')}${errors.projectTypes ? ` ${errorId('projectTypes')}` : ''}`}
            >
              {PROJECT_TYPES.map((type) => {
                const selected = data.projectTypes.includes(type.id);
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={`${styles.typeCard} ${selected ? styles.selected : ''}`}
                    aria-pressed={selected}
                    onClick={() => updateField('projectTypes', toggleInList(data.projectTypes, type.id))}
                  >
                    {Icon && (
                      <span className={styles.typeIcon} aria-hidden="true">
                        <Icon size={28} strokeWidth={2} />
                      </span>
                    )}
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.projectTypes && (
              <p id={errorId('projectTypes')} className={styles.error} role="alert">
                {errors.projectTypes}
              </p>
            )}
            {data.projectTypes.includes('other') && (
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('projectTypeOther')}>
                  Describe other type <span className={styles.required}>*</span>
                </label>
                <input
                  id={fieldId('projectTypeOther')}
                  type="text"
                  value={data.projectTypeOther}
                  onChange={(e) => updateField('projectTypeOther', e.target.value)}
                  aria-invalid={!!errors.projectTypeOther}
                  aria-describedby={errors.projectTypeOther ? errorId('projectTypeOther') : undefined}
                />
                {errors.projectTypeOther && (
                  <p id={errorId('projectTypeOther')} className={styles.error} role="alert">
                    {errors.projectTypeOther}
                  </p>
                )}
              </div>
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Business domain</legend>
            <p className={styles.hint}>What space is this project in?</p>
            <div className={styles.chipWrap} role="group">
              {BUSINESS_DOMAINS.map((domain) => {
                const selected = data.businessDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.selected : ''}`}
                    aria-pressed={selected}
                    onClick={() =>
                      updateField('businessDomains', toggleInList(data.businessDomains, domain))
                    }
                  >
                    {domain}
                  </button>
                );
              })}
            </div>
            {errors.businessDomains && (
              <p id={errorId('businessDomains')} className={styles.error} role="alert">
                {errors.businessDomains}
              </p>
            )}
            {data.businessDomains.includes('Other') && (
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('businessDomainOther')}>
                  Specify domain <span className={styles.required}>*</span>
                </label>
                <input
                  id={fieldId('businessDomainOther')}
                  type="text"
                  value={data.businessDomainOther}
                  onChange={(e) => updateField('businessDomainOther', e.target.value)}
                  aria-invalid={!!errors.businessDomainOther}
                  aria-describedby={
                    errors.businessDomainOther ? errorId('businessDomainOther') : undefined
                  }
                />
                {errors.businessDomainOther && (
                  <p id={errorId('businessDomainOther')} className={styles.error} role="alert">
                    {errors.businessDomainOther}
                  </p>
                )}
              </div>
            )}
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Brand identity</legend>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel} id={fieldId('hasBrand-label')}>
                Do you have an existing brand?
              </span>
              <div className={styles.chipWrap} role="group" aria-labelledby={fieldId('hasBrand-label')}>
                {BRAND_STATUS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`${styles.chip} ${data.hasBrand === status ? styles.selected : ''}`}
                    aria-pressed={data.hasBrand === status}
                    onClick={() => updateField('hasBrand', status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('brandName')}>Brand name</label>
                <input
                  id={fieldId('brandName')}
                  type="text"
                  value={data.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor={fieldId('tagline')}>Tagline or positioning (optional)</label>
                <input
                  id={fieldId('tagline')}
                  type="text"
                  value={data.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="Short positioning line…"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel} id={fieldId('personality-label')}>
                Brand personality
              </span>
              <div
                className={styles.chipWrap}
                role="group"
                aria-labelledby={fieldId('personality-label')}
              >
                {PERSONALITY_OPTIONS.map((trait) => {
                  const selected = data.personalities.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      className={`${styles.chip} ${selected ? styles.selected : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        updateField('personalities', toggleInList(data.personalities, trait))
                      }
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={fieldId('references')}>Reference websites or competitors</label>
              <textarea
                id={fieldId('references')}
                value={data.references}
                onChange={(e) => updateField('references', e.target.value)}
                placeholder="URLs or names of sites you like (or want to avoid)…"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={fieldId('logoUrl')}>Link to logo / brand assets (optional)</label>
              <input
                id={fieldId('logoUrl')}
                type="url"
                value={data.logoUrl}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </div>
          </fieldset>
        )}

        {step === 5 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Colors & visual direction</legend>

            <div className={styles.colorSection}>
              <p className={styles.hint}>Pick your palette — tap a swatch to open the color picker.</p>
              <div className={styles.palettePreview} aria-hidden="true">
                {COLOR_SWATCHES.map((swatch) => (
                  <span
                    key={swatch.key}
                    className={styles.paletteStripe}
                    style={{
                      background: safeHex(data[swatch.key], COLOR_DEFAULTS[swatch.key]),
                    }}
                  />
                ))}
              </div>
              <div className={styles.colorRow}>
                {COLOR_SWATCHES.map((swatch) => {
                  const display = safeHex(data[swatch.key], COLOR_DEFAULTS[swatch.key]);
                  return (
                    <div key={swatch.key} className={styles.colorCard}>
                      <label className={styles.swatch} htmlFor={fieldId(swatch.key)}>
                        <span
                          className={styles.swatchFill}
                          style={{ background: display }}
                        />
                        <input
                          id={fieldId(swatch.key)}
                          type="color"
                          className={styles.colorPicker}
                          value={display}
                          onChange={(e) => updateField(swatch.key, e.target.value)}
                          aria-label={`${swatch.label} color picker`}
                        />
                        <span className={styles.swatchOverlay}>
                          <span className={styles.swatchAction}>Pick color</span>
                        </span>
                      </label>
                      <div className={styles.colorMeta}>
                        <span className={styles.colorLabel}>{swatch.label}</span>
                        <span className={styles.colorHint}>{swatch.hint}</span>
                        <div className={styles.hexField}>
                          <span className={styles.hexPrefix} aria-hidden="true">
                            #
                          </span>
                          <input
                            type="text"
                            className={styles.hexInput}
                            value={data[swatch.key].replace(/^#/, '')}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^A-Fa-f0-9]/g, '').slice(0, 6);
                              updateField(swatch.key, raw ? `#${raw}` : '#');
                            }}
                            onBlur={() => {
                              updateField(
                                swatch.key,
                                safeHex(data[swatch.key], COLOR_DEFAULTS[swatch.key])
                              );
                            }}
                            aria-label={`${swatch.label} color hex`}
                            spellCheck={false}
                            inputMode="text"
                            maxLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel} id={fieldId('mood-label')}>
                Mood
              </span>
              <div className={styles.chipWrap} role="group" aria-labelledby={fieldId('mood-label')}>
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    className={`${styles.chip} ${data.mood === mood ? styles.selected : ''}`}
                    aria-pressed={data.mood === mood}
                    onClick={() => updateField('mood', mood)}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel} id={fieldId('colorApproach-label')}>
                Color approach
              </span>
              <div
                className={styles.chipWrap}
                role="group"
                aria-labelledby={fieldId('colorApproach-label')}
              >
                {COLOR_APPROACH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.chip} ${data.colorApproach === opt.id ? styles.selected : ''}`}
                    aria-pressed={data.colorApproach === opt.id}
                    onClick={() => updateField('colorApproach', opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={fieldId('visualNotes')}>Must-have / avoid visuals (optional)</label>
              <textarea
                id={fieldId('visualNotes')}
                value={data.visualNotes}
                onChange={(e) => updateField('visualNotes', e.target.value)}
                placeholder="Imagery, motifs, or styles to include or avoid…"
              />
            </div>
          </fieldset>
        )}

        <div className={styles.actions}>
          {step > 1 ? (
            <button type="button" className={styles.secondaryButton} onClick={goBack}>
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}

          {step < TOTAL_STEPS ? (
            <button type="button" className={styles.primaryButton} onClick={goNext}>
              Next
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              <Send size={18} strokeWidth={2} aria-hidden="true" />
              {isSubmitting ? 'Sending…' : 'Send project brief'}
            </button>
          )}
        </div>

        {submitError && (
          <p className={styles.submitError} role="alert">
            {submitError}{' '}
            <a href={`mailto:${INBOX_EMAIL}`}>Email me directly</a>
          </p>
        )}
      </form>
    </div>
  );
}
