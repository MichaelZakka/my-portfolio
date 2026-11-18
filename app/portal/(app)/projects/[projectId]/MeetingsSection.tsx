'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { dirFor } from '../../../../../i18n/routing';
import { CalendarClock, CalendarPlus, Check, CheckCircle2, Clock, Flag, Pencil, Send, Video } from 'lucide-react';
import { MEETING_COMMENT_MAX_LENGTH, MEETING_DURATIONS, isMeetingFinished } from '../../../../lib/portal/constants';
import { isoToLocalInput, localInputToIso } from '../../../../lib/portal/datetimeInput';
import type { ClientMeeting } from '../../../../lib/portal/present';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import { useLive } from './LiveSections';
import styles from '../../../portal.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';

type Milestone = { id: string; title: string };

/**
 * Meetings either side can propose. The side that did not make the pending
 * proposal can accept it; either side can suggest another time or cancel.
 * Afterwards the project lead shares notes, which the client confirms,
 * comments on, and whose action items the client ticks off.
 */
export function MeetingsSection({
  projectId,
  archived,
  preview = false,
  timeZone,
  milestones,
}: {
  projectId: string;
  archived: boolean;
  /** The admin's read-only "view as client": nothing can be proposed or answered. */
  preview?: boolean;
  /** The zone the labels are formatted in (the viewer's), named next to the time inputs. */
  timeZone: string;
  milestones: Milestone[];
}) {
  const readOnly = archived || preview;
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();
  const errorMessage = useErrorMessage();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /** Sends one meeting change; returns true on success. */
  const send = async (key: string, url: string, method: string, body: unknown, done?: string): Promise<boolean> => {
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
      setNotice(done ?? (key.startsWith('edit-') ? t('meetingSaved') : t('meetingSent')));
      return true;
    } catch {
      setError(errorMessage({ code: 'network' }));
      return false;
    } finally {
      setPending(null);
    }
  };

  const base = `/api/portal/projects/${projectId}/meetings`;
  const isEarlier = (m: ClientMeeting) => m.past || m.status === 'cancelled';
  const upcoming = data.meetings.filter((m) => !isEarlier(m));
  const earlier = data.meetings.filter(isEarlier);

  return (
    <section id="meetings" aria-labelledby="meetings-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="meetings-title" className={styles.sectionTitle}>
        {t('meetingsTitle')}
      </h2>
      {data.meetings.length === 0 ? (
        <p className={styles.empty}>{t('meetingsEmpty')}</p>
      ) : (
        [
          { key: 'upcoming', title: t('meetingsUpcoming'), items: upcoming },
          { key: 'earlier', title: t('meetingsEarlier'), items: earlier },
        ]
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <div key={group.key}>
              <h3 className={styles.meetingGroupTitle}>{group.title}</h3>
              <ul className={styles.meetingList}>
                {group.items.map((meeting) => (
                  <MeetingItem
                    key={meeting.id}
                    meeting={meeting}
                    busy={pending !== null}
                    pendingKey={pending}
                    readOnly={readOnly}
                    milestones={milestones}
                    onAction={(key, body) => send(`${key}-${meeting.id}`, `${base}/${meeting.id}`, 'PATCH', body)}
                    onNotes={(key, body, done) =>
                      send(`${key}-${meeting.id}`, `${base}/${meeting.id}/notes`, 'POST', body, done)
                    }
                  />
                ))}
              </ul>
            </div>
          ))
      )}

      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <p className={styles.hint} role="status">
        {notice}
      </p>

      {!readOnly && (
        <ProposeForm
          timeZone={timeZone}
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
  milestones,
  onAction,
  onNotes,
}: {
  meeting: ClientMeeting;
  busy: boolean;
  pendingKey: string | null;
  readOnly: boolean;
  milestones: Milestone[];
  onAction: (key: string, body: unknown) => Promise<boolean>;
  /** Confirms, comments on or ticks items in the meeting notes; `done` is the message shown after. */
  onNotes: (key: string, body: unknown, done: string) => Promise<boolean>;
}) {
  const t = useTranslations('portal.project');
  const locale = useLocale();
  const status = useTranslations('portal.meetingStatus');
  const [rescheduling, setRescheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newTime, setNewTime] = useState('');
  // held / no_show say how it went; other meetings that are over just show "past".
  const tone =
    meeting.past && meeting.status !== 'cancelled' && !isMeetingFinished(meeting.status) ? 'past' : meeting.status;

  const reschedule = async (event: FormEvent) => {
    event.preventDefault();
    const startsAt = localInputToIso(newTime);
    if (startsAt && (await onAction('reschedule', { action: 'reschedule', startsAt }))) setRescheduling(false);
  };

  const cancel = async () => {
    const ok = await confirmDialog({
      message: t('meetingCancelConfirm'),
      confirmLabel: t('meetingCancelYes'),
      cancelLabel: t('meetingCancelKeep'),
      danger: true,
    });
    if (ok) onAction('cancel', { action: 'cancel' });
  };

  const awaitingYou = (meeting.canAccept || Boolean(meeting.notes?.canAcknowledge)) && !readOnly;

  return (
    <li id={`meeting-${meeting.id}`} className={styles.meeting} data-status={tone} data-awaiting={awaitingYou || undefined}>
      <div className={styles.meetingDate} aria-hidden="true">
        <span className={styles.meetingMonth}>{meeting.date.month}</span>
        <span className={styles.meetingDay}>{meeting.date.day}</span>
        <span className={styles.meetingWeekday}>{meeting.date.weekday}</span>
      </div>

      <div className={styles.meetingBody}>
        <div className={styles.meetingHead}>
          <h4 className={styles.meetingTitle} dir="auto">
            {meeting.title}
          </h4>
          <span className={styles.badge} data-tone={tone}>
            {status(tone)}
          </span>
        </div>

        <ul className={styles.meetingFacts}>
          <li>
            <Clock size={14} strokeWidth={2} aria-hidden="true" />
            <time dateTime={meeting.startsAt}>
              <span className="visually-hidden">{meeting.whenLabel}</span>
              <span aria-hidden="true">{meeting.date.time}</span>
            </time>
            <span aria-hidden="true">·</span>
            {t('meetingDuration', { minutes: meeting.durationMinutes })}
          </li>
          {meeting.location ? (
            // The row follows the portal language, not its content (dir="auto" would read the
            // Latin URL and go left-to-right): in Arabic the icon sits on the right; the link stays LTR.
            <li dir={dirFor(locale)}>
              <Video size={14} strokeWidth={2} aria-hidden="true" />
              {meeting.locationUrl ? (
                <a
                  href={meeting.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  aria-label={`${t('meetingJoinLink')}: ${meeting.location}`}
                >
                  {meeting.location}
                </a>
              ) : (
                meeting.location
              )}
            </li>
          ) : (
            meeting.canChange && (
              <li dir="auto">
                <Video size={14} strokeWidth={2} aria-hidden="true" />
                {t('meetingLinkPending')}
              </li>
            )
          )}
          {meeting.milestone && (
            <li dir="auto">
              <Flag size={14} strokeWidth={2} aria-hidden="true" />
              {meeting.milestone.title}
            </li>
          )}
        </ul>

        {meeting.agenda && (
          <p className={styles.meetingAgenda} dir="auto">
            {meeting.agenda}
          </p>
        )}

        {meeting.status === 'proposed' && !meeting.past && (
          <p className={styles.meetingWaiting} data-you={meeting.canAccept || undefined}>
            {meeting.canAccept ? t('meetingAwaitingYou') : t('meetingAwaitingOther')}
          </p>
        )}

        {!readOnly && meeting.canChange && (
          editing ? (
            <EditDetailsForm
              meeting={meeting}
              milestones={milestones}
              busy={busy}
              saving={pendingKey === `edit-${meeting.id}`}
              onSave={(body) => onAction('edit', body)}
              onClose={() => setEditing(false)}
            />
          ) : rescheduling ? (
            <form className={styles.meetingReschedule} onSubmit={reschedule}>
              <label className={styles.label} htmlFor={`new-time-${meeting.id}`}>
                {t('meetingNewTime')}
              </label>
              <div className={styles.meetingActions}>
                <input
                  id={`new-time-${meeting.id}`}
                  type="datetime-local"
                  className={styles.input}
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
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
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                  {pendingKey === `accept-${meeting.id}` ? t('meetingSending') : t('meetingAccept')}
                </button>
              )}
              {meeting.status === 'confirmed' && meeting.locationUrl && (
                <a href={meeting.locationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <Video size={16} strokeWidth={2} aria-hidden="true" />
                  {t('meetingJoin')}
                </a>
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
                <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
                {t('meetingSuggest')}
              </button>
              {meeting.canEditDetails && (
                <button type="button" className="btn btn-outline" aria-disabled={busy} onClick={() => setEditing(true)}>
                  <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  {t('meetingEditDetails')}
                </button>
              )}
              {meeting.calendarUrl && (
                <a href={meeting.calendarUrl} className="btn btn-outline">
                  <CalendarPlus size={16} strokeWidth={2} aria-hidden="true" />
                  {t('meetingAddToCalendar')}
                </a>
              )}
              <button type="button" className={styles.linkButton} aria-disabled={busy} onClick={cancel}>
                {t('meetingCancel')}
              </button>
            </div>
          )
        )}
        {readOnly && meeting.calendarUrl && (
          <div className={styles.meetingActions}>
            <a href={meeting.calendarUrl} className="btn btn-outline">
              <CalendarPlus size={16} strokeWidth={2} aria-hidden="true" />
              {t('meetingAddToCalendar')}
            </a>
          </div>
        )}

        {meeting.notes && (
          <MeetingNotes
            meetingId={meeting.id}
            notes={meeting.notes}
            readOnly={readOnly}
            busy={busy}
            pendingKey={pendingKey}
            onNotes={onNotes}
          />
        )}
      </div>
    </li>
  );
}

/**
 * A name inside a translated sentence, as a bidi isolate: a Latin name next to
 * a date in Arabic text would otherwise pull the date's digits out of order.
 */
const isolate = (name: string) => `⁨${name}⁩`;

/** The notes the project lead shared after the meeting: summary, action items, confirmation, comments. */
function MeetingNotes({
  meetingId,
  notes,
  readOnly,
  busy,
  pendingKey,
  onNotes,
}: {
  meetingId: string;
  notes: NonNullable<ClientMeeting['notes']>;
  readOnly: boolean;
  busy: boolean;
  pendingKey: string | null;
  onNotes: (key: string, body: unknown, done: string) => Promise<boolean>;
}) {
  const t = useTranslations('portal.project');
  const [comment, setComment] = useState('');
  const commentId = `meeting-${meetingId}-comment`;
  const titleId = `meeting-${meetingId}-notes`;

  const sendComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    if (await onNotes('comment', { action: 'comment', body: comment }, t('meetingCommentSent'))) setComment('');
  };

  return (
    <section className={styles.meetingNotes} aria-labelledby={titleId}>
      <div className={styles.meetingNotesHead}>
        <h5 id={titleId} className={styles.meetingNotesTitle}>
          {t('meetingNotesTitle')}
        </h5>
        {notes.publishedLabel && (
          <span className={styles.meetingNotesMeta}>{t('meetingNotesShared', { when: notes.publishedLabel })}</span>
        )}
      </div>

      <p className={styles.meetingNotesSummary} dir="auto">
        {notes.summary}
      </p>

      {notes.items.length > 0 && (
        <>
          <h6 className={styles.meetingNotesSubtitle}>{t('meetingActionItemsTitle')}</h6>
          <ul className={styles.actionList}>
            {notes.items.map((item) => {
              const interactive = item.canToggle && !readOnly;
              return (
                <li key={item.id} className={styles.actionItem} data-done={item.done || undefined}>
                  <label className={styles.actionLabel} data-static={!interactive || undefined}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={!interactive}
                      aria-disabled={interactive && busy ? true : undefined}
                      onChange={(e) => {
                        if (busy) return;
                        onNotes('item', { action: 'item', itemId: item.id, done: e.target.checked }, t('meetingSaved'));
                      }}
                    />
                    <span dir="auto">{item.text}</span>
                  </label>
                  <span className={styles.actionOwner} data-owner={item.owner}>
                    {item.owner === 'client' ? t('meetingActionOwnerYou') : t('meetingActionOwnerLead')}
                  </span>
                  {item.done && item.doneBy && item.doneLabel && (
                    <span className={styles.actionDone}>
                      {t('meetingActionDone', { name: isolate(item.doneBy), when: item.doneLabel })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {notes.acknowledged ? (
        <p className={styles.meetingAckDone}>
          <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          {t('meetingNotesConfirmed', { name: isolate(notes.acknowledged.by ?? '—'), when: notes.acknowledged.label })}
        </p>
      ) : (
        notes.canAcknowledge &&
        !readOnly && (
          <div className={styles.meetingAck}>
            <p>{t('meetingNotesConfirmPrompt')}</p>
            <button
              type="button"
              className="btn btn-primary"
              aria-disabled={busy}
              onClick={() =>
                onNotes('ack', { action: 'acknowledge', version: notes.version }, t('meetingNotesConfirmedNotice'))
              }
            >
              <Check size={16} strokeWidth={2} aria-hidden="true" />
              {pendingKey === `ack-${meetingId}` ? t('meetingSending') : t('meetingNotesConfirm')}
            </button>
          </div>
        )
      )}

      {notes.comments.length > 0 && (
        <>
          <h6 className={styles.meetingNotesSubtitle}>{t('meetingCommentsTitle')}</h6>
          <ul className={styles.commentList}>
            {notes.comments.map((c) => (
              <li key={c.id} className={styles.comment} data-lead={c.fromLead || undefined}>
                <span className={styles.commentMeta}>
                  <strong dir="auto">{c.author ?? (c.fromLead ? t('projectLead') : '—')}</strong>
                  {c.fromLead && c.author && <span className={styles.commentRole}>{t('projectLead')}</span>}
                  <time dateTime={c.createdAt}>{c.timeLabel}</time>
                </span>
                <p className={styles.commentBody} dir="auto">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {!readOnly && (
        <form className={styles.commentForm} onSubmit={sendComment}>
          <label className={styles.label} htmlFor={commentId}>
            {t('meetingCommentLabel')}
          </label>
          <textarea
            id={commentId}
            className={styles.textarea}
            dir="auto"
            rows={2}
            maxLength={MEETING_COMMENT_MAX_LENGTH}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className={styles.meetingActions}>
            <button type="submit" className="btn btn-outline" aria-disabled={busy}>
              <Send size={16} strokeWidth={2} aria-hidden="true" />
              {pendingKey === `comment-${meetingId}` ? t('meetingSending') : t('meetingCommentSend')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** The details of a meeting the client created: topic, duration, milestone, agenda. The link is the project lead's. */
function EditDetailsForm({
  meeting,
  milestones,
  busy,
  saving,
  onSave,
  onClose,
}: {
  meeting: ClientMeeting;
  milestones: Milestone[];
  busy: boolean;
  saving: boolean;
  onSave: (body: unknown) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useTranslations('portal.project');
  const [title, setTitle] = useState(meeting.title);
  const [duration, setDuration] = useState(meeting.durationMinutes);
  const [agenda, setAgenda] = useState(meeting.agenda);
  const [milestoneId, setMilestoneId] = useState(meeting.milestone?.id ?? '');
  const id = (field: string) => `meeting-${meeting.id}-${field}`;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const body = { action: 'edit', title, durationMinutes: duration, agenda, milestoneId: milestoneId || null };
    if (await onSave(body)) onClose();
  };

  return (
    <form className={styles.form} onSubmit={save} style={{ marginTop: 'var(--s-3)' }}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('title')}>
          {t('meetingTopic')}
        </label>
        <input
          id={id('title')}
          className={styles.input}
          dir="auto"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('duration')}>
          {t('meetingDurationLabel')}
        </label>
        <select
          id={id('duration')}
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
      {milestones.length > 0 && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id('milestone')}>
            {t('meetingMilestoneLabel')}
          </label>
          <select
            id={id('milestone')}
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
        <label className={styles.label} htmlFor={id('agenda')}>
          {t('meetingAgenda')}
        </label>
        <textarea
          id={id('agenda')}
          className={styles.textarea}
          dir="auto"
          maxLength={2000}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
        />
      </div>
      <p className={styles.hint}>{t('meetingEditTimeHint')}</p>
      <div className={styles.meetingActions}>
        <button type="submit" className="btn btn-primary" aria-disabled={busy}>
          {saving ? t('meetingSending') : t('meetingSaveChanges')}
        </button>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          {t('meetingNeverMind')}
        </button>
      </div>
    </form>
  );
}

function ProposeForm({
  timeZone,
  milestones,
  busy,
  onSubmit,
}: {
  timeZone: string;
  milestones: Milestone[];
  busy: boolean;
  onSubmit: (body: unknown) => Promise<boolean>;
}) {
  const t = useTranslations('portal.project');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(30);
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
      agenda,
      milestoneId: milestoneId || null,
    });
    if (ok) {
      setTitle('');
      setWhen('');
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
              aria-describedby="meeting-when-zone"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <span id="meeting-when-zone" className={styles.hint}>
              {t('meetingTimeZoneHint', { zone: timeZone })}
            </span>
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
        <p className={styles.hint}>{t('meetingLinkLater')}</p>
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
