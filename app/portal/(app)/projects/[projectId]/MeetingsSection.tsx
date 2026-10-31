'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import { MEETING_DURATIONS } from '../../../../lib/portal/constants';
import { isoToLocalInput, localInputToIso } from '../../../../lib/portal/datetimeInput';
import type { ClientMeeting } from '../../../../lib/portal/present';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import { useLive } from './LiveSections';
import styles from '../../../portal.module.css';

type Milestone = { id: string; title: string };

/**
 * Meetings either side can propose. The side that did not make the pending
 * proposal can accept it; either side can suggest another time or cancel.
 */
export function MeetingsSection({
  projectId,
  archived,
  milestones,
}: {
  projectId: string;
  archived: boolean;
  milestones: Milestone[];
}) {
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();
  const errorMessage = useErrorMessage();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /** Sends one meeting change; returns true on success. */
  const send = async (key: string, url: string, method: string, body: unknown): Promise<boolean> => {
    if (pending) return false;
    setPending(key);
    setError('');
    setNotice('');
    try {
      const response = await fetch(url, jsonRequest(method, body));
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return false;
      }
      await refresh(['meetings', 'activity']);
      setNotice(t('meetingSent'));
      return true;
    } catch {
      setError(errorMessage({ code: 'network' }));
      return false;
    } finally {
      setPending(null);
    }
  };

  const base = `/api/portal/projects/${projectId}/meetings`;

  return (
    <section id="meetings" aria-labelledby="meetings-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="meetings-title" className={styles.sectionTitle}>
        {t('meetingsTitle')}
      </h2>
      {data.meetings.length === 0 ? (
        <p className={styles.empty}>{t('meetingsEmpty')}</p>
      ) : (
        <ul className={styles.meetingList}>
          {data.meetings.map((meeting) => (
            <MeetingItem
              key={meeting.id}
              meeting={meeting}
              busy={pending !== null}
              pendingKey={pending}
              readOnly={archived}
              onAction={(key, body) => send(`${key}-${meeting.id}`, `${base}/${meeting.id}`, 'PATCH', body)}
            />
          ))}
        </ul>
      )}

      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <p className={styles.hint} role="status">
        {notice}
      </p>

      {!archived && (
        <ProposeForm
          milestones={milestones}
          busy={pending === 'create'}
          onSubmit={(body) => send('create', base, 'POST', body)}
        />
      )}
    </section>
  );
}

function MeetingItem({
  meeting,
  busy,
  pendingKey,
  readOnly,
  onAction,
}: {
  meeting: ClientMeeting;
  busy: boolean;
  pendingKey: string | null;
  readOnly: boolean;
  onAction: (key: string, body: unknown) => Promise<boolean>;
}) {
  const t = useTranslations('portal.project');
  const status = useTranslations('portal.meetingStatus');
  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState('');
  const tone = meeting.past && meeting.status !== 'cancelled' ? 'past' : meeting.status;

  const reschedule = async (event: FormEvent) => {
    event.preventDefault();
    const startsAt = localInputToIso(newTime);
    if (startsAt && (await onAction('reschedule', { action: 'reschedule', startsAt }))) setRescheduling(false);
  };

  const cancel = () => {
    if (window.confirm(t('meetingCancelConfirm'))) onAction('cancel', { action: 'cancel' });
  };

  return (
    <li className={styles.meeting} data-status={tone}>
      <div className={styles.meetingHead}>
        <CalendarClock size={18} strokeWidth={2} aria-hidden="true" className={styles.taskIcon} />
        <span className={styles.meetingTitle} dir="auto">
          {meeting.title}
        </span>
        <span className={styles.badge} data-tone={tone}>
          {status(tone)}
        </span>
      </div>
      <p className={styles.meetingMeta}>
        <time dateTime={meeting.startsAt}>{meeting.whenLabel}</time> ·{' '}
        {t('meetingDuration', { minutes: meeting.durationMinutes })}
      </p>
      {meeting.location && (
        <p className={styles.meetingMeta} dir="auto">
          {meeting.locationUrl ? (
            <a href={meeting.locationUrl} target="_blank" rel="noopener noreferrer" dir="ltr">
              {meeting.location}
            </a>
          ) : (
            meeting.location
          )}
        </p>
      )}
      {meeting.milestone && (
        <p className={styles.meetingMeta} dir="auto">
          {t('meetingMilestone', { milestone: meeting.milestone.title })}
        </p>
      )}
      {meeting.agenda && (
        <p className={styles.taskDescription} dir="auto">
          {meeting.agenda}
        </p>
      )}
      {meeting.status === 'proposed' && !meeting.past && (
        <p className={styles.meetingWaiting}>
          {meeting.canAccept ? t('meetingAwaitingYou') : t('meetingAwaitingOther')}
        </p>
      )}

      {!readOnly && meeting.canChange && (
        rescheduling ? (
          <form className={styles.meetingReschedule} onSubmit={reschedule}>
            <label className={styles.label} htmlFor={`new-time-${meeting.id}`}>
              {t('meetingNewTime')}
            </label>
            <input
              id={`new-time-${meeting.id}`}
              type="datetime-local"
              className={styles.input}
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
            <div className={styles.meetingActions}>
              <button type="submit" className="btn btn-primary" aria-disabled={busy}>
                {pendingKey === `reschedule-${meeting.id}` ? t('meetingSending') : t('meetingSendTime')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setRescheduling(false)}>
                {t('meetingNeverMind')}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.meetingActions}>
            {meeting.canAccept && (
              <button
                type="button"
                className="btn btn-primary"
                aria-disabled={busy}
                onClick={() => onAction('accept', { action: 'accept' })}
              >
                {pendingKey === `accept-${meeting.id}` ? t('meetingSending') : t('meetingAccept')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              aria-disabled={busy}
              onClick={() => {
                setNewTime(isoToLocalInput(meeting.startsAt));
                setRescheduling(true);
              }}
            >
              {t('meetingSuggest')}
            </button>
            <button type="button" className={styles.linkButton} aria-disabled={busy} onClick={cancel}>
              {t('meetingCancel')}
            </button>
          </div>
        )
      )}
    </li>
  );
}

function ProposeForm({
  milestones,
  busy,
  onSubmit,
}: {
  milestones: Milestone[];
  busy: boolean;
  onSubmit: (body: unknown) => Promise<boolean>;
}) {
  const t = useTranslations('portal.project');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [milestoneId, setMilestoneId] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const startsAt = localInputToIso(when);
    if (!startsAt) return;
    const ok = await onSubmit({
      title,
      startsAt,
      durationMinutes: duration,
      location,
      agenda,
      milestoneId: milestoneId || null,
    });
    if (ok) {
      setTitle('');
      setWhen('');
      setLocation('');
      setAgenda('');
      setMilestoneId('');
    }
  };

  return (
    <details className={styles.meetingPropose}>
      <summary className={styles.meetingProposeSummary}>{t('meetingProposeTitle')}</summary>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="meeting-title">
            {t('meetingTopic')}
          </label>
          <input
            id="meeting-title"
            className={styles.input}
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className={styles.meetingFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="meeting-when">
              {t('meetingWhen')}
            </label>
            <input
              id="meeting-when"
              type="datetime-local"
              className={styles.input}
              required
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="meeting-duration">
              {t('meetingDurationLabel')}
            </label>
            <select
              id="meeting-duration"
              className={styles.input}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {MEETING_DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('meetingDuration', { minutes })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="meeting-location">
            {t('meetingLocation')}
          </label>
          <input
            id="meeting-location"
            className={styles.input}
            maxLength={500}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        {milestones.length > 0 && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="meeting-milestone">
              {t('meetingMilestoneLabel')}
            </label>
            <select
              id="meeting-milestone"
              className={styles.input}
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
            >
              <option value="">{t('meetingNoMilestone')}</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="meeting-agenda">
            {t('meetingAgenda')}
          </label>
          <textarea
            id="meeting-agenda"
            className={styles.textarea}
            maxLength={2000}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
          />
        </div>
        <div className={styles.composerActions}>
          <span />
          <button type="submit" className="btn btn-primary" aria-disabled={busy} aria-busy={busy}>
            {busy ? t('meetingSending') : t('meetingPropose')}
          </button>
        </div>
      </form>
    </details>
  );
}
