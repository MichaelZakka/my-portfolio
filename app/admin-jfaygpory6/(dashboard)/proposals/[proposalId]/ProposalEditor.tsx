'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, Plus, Save, Send, Trash2 } from 'lucide-react';
import { PROPOSAL_CURRENCIES, PROPOSAL_MAX_PHASES, type PortalLocale } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../../projects/useAdminAction';
import type { SendResult } from './ProposalLinkResult';
import styles from '../../../admin.module.css';
import projectStyles from '../../projects/projects.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';

export type ProposalDraft = {
  locale: PortalLocale;
  title: string;
  summary: string;
  phases: { title: string; description: string; durationDays: number }[];
  included: string[];
  excluded: string[];
  clientProvides: string[];
  currency: string;
  totalAmount: number;
  paymentTerms: string;
  revisionRounds: number;
  /** "YYYY-MM-DD", or "" when work starts on acceptance. */
  startDate: string;
  validDays: number;
};

type Phase = ProposalDraft['phases'][number] & { key: number };

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * The whole draft is edited locally and saved at once (PATCH). Sending saves
 * first, then locks this version; later changes go into the next version.
 */
export default function ProposalEditor({
  proposalId,
  leadId,
  version,
  recipient,
  hints,
  initial,
  onSent,
}: {
  proposalId: string;
  leadId: string;
  version: number;
  recipient: string;
  hints: { budget: string; timeline: string };
  initial: ProposalDraft;
  onSent: (result: SendResult) => void;
}) {
  const router = useRouter();
  const { run, pending, error } = useAdminAction();
  const nextKey = useRef(initial.phases.length);
  const [locale, setLocale] = useState<PortalLocale>(initial.locale);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [phases, setPhases] = useState<Phase[]>(() => initial.phases.map((phase, key) => ({ ...phase, key })));
  const [included, setIncluded] = useState(initial.included.join('\n'));
  const [excluded, setExcluded] = useState(initial.excluded.join('\n'));
  const [clientProvides, setClientProvides] = useState(initial.clientProvides.join('\n'));
  const [currency, setCurrency] = useState(initial.currency);
  const [totalAmount, setTotalAmount] = useState(initial.totalAmount > 0 ? String(initial.totalAmount) : '');
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [revisionRounds, setRevisionRounds] = useState(String(initial.revisionRounds));
  const [startDate, setStartDate] = useState(initial.startDate);
  const [validDays, setValidDays] = useState(String(initial.validDays));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const totalDays = phases.reduce((sum, phase) => sum + (phase.durationDays || 0), 0);

  /** Wraps a setter so any edit marks the draft unsaved. */
  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setDirty(true);
      setSaved(false);
    };

  const updatePhase = (key: number, patch: Partial<Phase>) =>
    edit(setPhases)(phases.map((phase) => (phase.key === key ? { ...phase, ...patch } : phase)));

  const movePhase = (index: number, delta: -1 | 1) => {
    const next = [...phases];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    edit(setPhases)(next);
  };

  const addPhase = () =>
    edit(setPhases)([...phases, { key: nextKey.current++, title: '', description: '', durationDays: 5 }]);

  const payload = () => ({
    locale,
    title,
    summary,
    phases: phases.map(({ title, description, durationDays }) => ({ title, description, durationDays })),
    included: lines(included),
    excluded: lines(excluded),
    clientProvides: lines(clientProvides),
    currency,
    totalAmount: Number(totalAmount) || 0,
    paymentTerms,
    revisionRounds: Number(revisionRounds) || 0,
    startDate: startDate || null,
    validDays: Number(validDays) || 0,
  });

  const save = async (key: string) => {
    const result = await run(key, `/api/admin/proposals/${proposalId}`, jsonInit('PATCH', payload()));
    if (!result) return false;
    setDirty(false);
    setSaved(true);
    return true;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    await save('save');
  };

  const handleSend = async () => {
    const question = `Send version ${version} to ${recipient}?\n\nIt is locked once sent. To change it later, you revise it as a new version.`;
    if (pending || !(await confirmDialog({ title: 'Send proposal?', message: question, confirmLabel: 'Send' }))) return;
    if (!(await save('send'))) return;
    const result = await run<SendResult>('send', `/api/admin/proposals/${proposalId}/send`, jsonInit('POST'));
    if (result) onSent(result);
  };

  const handleDelete = async () => {
    if (pending || !(await confirmDialog({ title: 'Delete draft?', message: `The version ${version} draft will be deleted.`, confirmLabel: 'Delete', danger: true }))) return;
    const result = await run('delete', `/api/admin/proposals/${proposalId}`, jsonInit('DELETE'));
    if (result) router.push(`/admin-jfaygpory6/requests/${leadId}`);
  };

  const textField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    { hint, rows }: { hint?: string; rows?: number } = {}
  ) => (
    <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
      <label className={styles.filterLabel} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        dir={dir}
        rows={rows}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <span id={`${id}-hint`} className={projectStyles.muted}>
          {hint}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Content</span>
          <span className={styles.cardMeta}>The client sees this exactly as written.</span>
        </div>
        <div className={projectStyles.formGrid}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-locale">
              Written in
            </label>
            <select
              id="proposal-locale"
              className={styles.select}
              value={locale}
              onChange={(e) => edit(setLocale)(e.target.value as PortalLocale)}
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>
          <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
            <label className={styles.filterLabel} htmlFor="proposal-title">
              Project name
            </label>
            <input
              id="proposal-title"
              className={styles.input}
              dir={dir}
              required
              maxLength={200}
              value={title}
              onChange={(e) => edit(setTitle)(e.target.value)}
            />
          </div>
          {textField('proposal-summary', 'Overview: what you understood and what you will deliver', summary, edit(setSummary), {
            rows: 5,
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Phases</span>
          <span className={styles.cardMeta}>
            Each phase becomes a milestone when the client accepts · {totalDays} days in total
          </span>
        </div>
        <ol className={projectStyles.list}>
          {phases.map((phase, index) => (
            <li key={phase.key} className={projectStyles.item}>
              <div className={projectStyles.moveButtons}>
                <button
                  type="button"
                  className={projectStyles.iconButton}
                  onClick={() => movePhase(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move phase ${index + 1} up`}
                >
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={projectStyles.iconButton}
                  onClick={() => movePhase(index, 1)}
                  disabled={index === phases.length - 1}
                  aria-label={`Move phase ${index + 1} down`}
                >
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
              </div>
              <div className={projectStyles.itemMain}>
                <div className={projectStyles.phaseFields}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel} htmlFor={`phase-${phase.key}-title`}>
                      Phase {index + 1}
                    </label>
                    <input
                      id={`phase-${phase.key}-title`}
                      className={styles.input}
                      dir={dir}
                      required
                      maxLength={200}
                      value={phase.title}
                      onChange={(e) => updatePhase(phase.key, { title: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel} htmlFor={`phase-${phase.key}-days`}>
                      Days
                    </label>
                    <input
                      id={`phase-${phase.key}-days`}
                      className={styles.input}
                      type="number"
                      required
                      min={1}
                      max={365}
                      value={phase.durationDays || ''}
                      onChange={(e) => updatePhase(phase.key, { durationDays: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel} htmlFor={`phase-${phase.key}-description`}>
                    What happens in this phase
                  </label>
                  <textarea
                    id={`phase-${phase.key}-description`}
                    className={styles.textarea}
                    dir={dir}
                    rows={2}
                    maxLength={2000}
                    value={phase.description}
                    onChange={(e) => updatePhase(phase.key, { description: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
                onClick={() => edit(setPhases)(phases.filter((p) => p.key !== phase.key))}
                aria-label={`Remove phase ${index + 1}`}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        {phases.length < PROPOSAL_MAX_PHASES && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={addPhase}
            style={{ marginTop: '0.75rem' }}
          >
            <Plus size={15} aria-hidden="true" />
            Add phase
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Scope</span>
          <span className={styles.cardMeta}>One item per line</span>
        </div>
        <div className={projectStyles.formGrid}>
          {textField('proposal-included', 'What’s included', included, edit(setIncluded), { rows: 4 })}
          {textField('proposal-excluded', 'Not included', excluded, edit(setExcluded), {
            rows: 3,
            hint: 'Saying what is out of scope up front is what makes later change requests easy to discuss.',
          })}
          {textField('proposal-client', 'What you need from the client', clientProvides, edit(setClientProvides), {
            rows: 3,
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Price and terms</span>
          <span className={styles.cardMeta}>
            Client’s budget: {hints.budget || '—'} · timeline: {hints.timeline || '—'}
          </span>
        </div>
        <div className={projectStyles.formGrid}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-currency">
              Currency
            </label>
            <select
              id="proposal-currency"
              className={styles.select}
              value={currency}
              onChange={(e) => edit(setCurrency)(e.target.value)}
            >
              {PROPOSAL_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-total">
              Total price (whole units)
            </label>
            <input
              id="proposal-total"
              className={styles.input}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={totalAmount}
              onChange={(e) => edit(setTotalAmount)(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-revisions">
              Revision rounds included
            </label>
            <input
              id="proposal-revisions"
              className={styles.input}
              type="number"
              min={0}
              max={10}
              value={revisionRounds}
              onChange={(e) => edit(setRevisionRounds)(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-start">
              Start date (empty: on acceptance)
            </label>
            <input
              id="proposal-start"
              className={styles.input}
              type="date"
              value={startDate}
              onChange={(e) => edit(setStartDate)(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="proposal-valid">
              Valid for (days after sending)
            </label>
            <input
              id="proposal-valid"
              className={styles.input}
              type="number"
              min={1}
              max={90}
              value={validDays}
              onChange={(e) => edit(setValidDays)(e.target.value)}
            />
          </div>
          {textField('proposal-payment', 'Payment terms', paymentTerms, edit(setPaymentTerms), { rows: 2 })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={projectStyles.formActions} style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
          <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`} aria-disabled={pending !== null}>
            <Save size={16} aria-hidden="true" />
            {pending === 'save' ? 'Saving…' : 'Save draft'}
          </button>
          <a
            href={`/admin-jfaygpory6/proposals/${proposalId}/preview`}
            target="_blank"
            rel="noopener"
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            <Eye size={16} aria-hidden="true" />
            Preview as client
          </a>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSend}
            aria-disabled={pending !== null}
          >
            <Send size={16} aria-hidden="true" />
            {pending === 'send' ? 'Sending…' : `Send to ${recipient}`}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleDelete}
            aria-disabled={pending !== null}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete draft
          </button>
        </div>
        <p className={projectStyles.muted} role="status" style={{ marginTop: '0.6rem' }}>
          {dirty ? 'Unsaved changes. The preview shows the last saved version.' : saved ? 'Draft saved.' : ''}
        </p>
      </div>
    </form>
  );
}
