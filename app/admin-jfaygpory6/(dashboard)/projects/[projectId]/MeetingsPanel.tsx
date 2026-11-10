'use client';

import { FormEvent, useState } from 'react';
import { CalendarClock, CalendarPlus, Check, Clock, Flag, Globe, MapPin, Plus, Video } from 'lucide-react';
import { MEETING_DURATIONS, MEETING_STATUS_LABELS, type MeetingStatus } from '../../../../lib/portal/constants';
import { isoToLocalInput, localInputToIso } from '../../../../lib/portal/datetimeInput';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';

type Meeting = AdminProjectView['meetings'][number];
type Action = ReturnType<typeof useAdminAction>;

const BADGE: Record<MeetingStatus | 'past', string> = {
  proposed: styles.badgeContacted,
  confirmed: styles.badgeWon,
  cancelled: styles.badgeLost,
  past: styles.badgeArchived,
};

function MeetingRow({ meeting, url, action }: { meeting: Meeting; url: string; action: Action }) {
  const { run, pending } = action;
  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState('');
  const busy = pending !== null;
  const tone = meeting.past && meeting.status !== 'cancelled' ? 'past' : (meeting.status as MeetingStatus);

  const act = (key: string, body: unknown) => run(`${key}-${meeting.id}`, url, jsonInit('PATCH', body));

  const reschedule = async (event: FormEvent) => {
    event.preventDefault();
    const startsAt = localInputToIso(newTime);
    if (startsAt && (await act('reschedule', { action: 'reschedule', startsAt }))) setRescheduling(false);
  };

  const cancel = async () => {
    if (!(await confirmDialog({ title: 'Cancel meeting?', message: `“${meeting.title}” will be cancelled and the client emailed.`, confirmLabel: 'Cancel meeting', cancelLabel: 'Keep it', danger: true }))) return;
    await act('cancel', { action: 'cancel' });
  };

  const awaitingYou = meeting.canAccept;

  return (
    <li className={projectStyles.meeting} data-status={tone} data-awaiting={awaitingYou || undefined}>
      <div className={projectStyles.meetingDate} aria-hidden="true">
        <span className={projectStyles.meetingMonth}>{meeting.date.month}</span>
        <span className={projectStyles.meetingDay}>{meeting.date.day}</span>
        <span className={projectStyles.meetingWeekday}>{meeting.date.weekday}</span>
      </div>
      <div className={projectStyles.itemMain}>
        <div className={projectStyles.meetingHead}>
          <span className={projectStyles.itemTitle}>{meeting.title}</span>
          <span className={`${styles.badge} ${BADGE[tone]}`}>{tone === 'past' ? 'Past' : MEETING_STATUS_LABELS[tone]}</span>
        </div>
        <ul className={projectStyles.meetingFacts}>
          <li>
            <Clock size={13} aria-hidden="true" />
            <span className="visually-hidden">{meeting.whenLabel}</span>
            <span aria-hidden="true">{meeting.date.time}</span> · {meeting.durationMinutes} min
          </li>
          {meeting.localTimes.map((local) => (
            <li key={local.name}>
              <Globe size={13} aria-hidden="true" />
              {local.name}: {local.label}
            </li>
          ))}
          {meeting.location && (
            <li>
              {meeting.locationUrl ? <Video size={13} aria-hidden="true" /> : <MapPin size={13} aria-hidden="true" />}
              {meeting.locationUrl ? (
                <a href={meeting.locationUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  {meeting.location}
                </a>
              ) : (
                meeting.location
              )}
            </li>
          )}
          {meeting.milestone && (
            <li>
              <Flag size={13} aria-hidden="true" />
              {meeting.milestone.title}
            </li>
          )}
        </ul>
        {meeting.agenda && <p className={projectStyles.meetingAgenda}>{meeting.agenda}</p>}
        {meeting.status === 'proposed' && !meeting.past && (
          <span className={projectStyles.meetingWaiting} data-you={awaitingYou || undefined}>
            {awaitingYou
              ? `${meeting.proposedBy ?? 'The client'} proposed this time · waiting for you`
              : 'Waiting for the client to reply'}
          </span>
        )}

        {meeting.canChange &&
          (rescheduling ? (
            <form className={projectStyles.formActions} onSubmit={reschedule} style={{ marginTop: '0.6rem' }}>
              <input
                type="datetime-local"
                className={styles.input}
                aria-label={`New time for “${meeting.title}”`}
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={busy}>
                {pending === `reschedule-${meeting.id}` ? 'Sending…' : 'Send new time'}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setRescheduling(false)}
              >
                Never mind
              </button>
            </form>
          ) : (
            <div className={projectStyles.formActions} style={{ marginTop: '0.6rem' }}>
              {awaitingYou && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  aria-disabled={busy}
                  onClick={() => act('accept', { action: 'accept' })}
                >
                  <Check size={15} aria-hidden="true" />
                  {pending === `accept-${meeting.id}` ? 'Accepting…' : 'Accept'}
                </button>
              )}
              {meeting.status === 'confirmed' && meeting.locationUrl && (
                <a
                  href={meeting.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  <Video size={15} aria-hidden="true" />
                  Join
                </a>
              )}
              {meeting.calendarUrl && (
                <a href={meeting.calendarUrl} className={`${styles.button} ${styles.buttonSecondary}`}>
                  <CalendarPlus size={15} aria-hidden="true" />
                  Add to calendar
                </a>
              )}
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                aria-disabled={busy}
                onClick={() => {
                  setNewTime(isoToLocalInput(meeting.startsAt));
                  setRescheduling(true);
                }}
              >
                <CalendarClock size={15} aria-hidden="true" />
                Suggest another time
              </button>
              <button type="button" className={projectStyles.dangerLink} aria-disabled={busy} onClick={cancel}>
                {pending === `cancel-${meeting.id}` ? 'Cancelling…' : 'Cancel meeting'}
              </button>
            </div>
          ))}
      </div>
    </li>
  );
}

/** Meetings with the client: propose, accept the client's proposals, suggest another time, cancel. */
export default function MeetingsPanel({
  projectId,
  meetings,
  milestones,
}: {
  projectId: string;
  meetings: Meeting[];
  milestones: { id: string; title: string }[];
}) {
  const action = useAdminAction();
  const { run, pending, error } = action;
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const base = `/api/admin/projects/${projectId}/meetings`;
  const waiting = meetings.filter((m) => m.canAccept).length;
  const isEarlier = (m: Meeting) => m.past || m.status === 'cancelled';
  const upcoming = meetings.filter((m) => !isEarlier(m));
  const earlier = meetings.filter(isEarlier);

  const propose = async (event: FormEvent) => {
    event.preventDefault();
    const startsAt = localInputToIso(when);
    if (!startsAt) return;
    const result = await run(
      'create',
      base,
      jsonInit('POST', { title, startsAt, durationMinutes: duration, location, agenda, milestoneId: milestoneId || null })
    );
    if (result) {
      setTitle('');
      setWhen('');
      setLocation('');
      setAgenda('');
      setMilestoneId('');
    }
  };

  return (
    <section id="meetings" className={styles.card} aria-labelledby="meetings-title">
      <div className={styles.cardHeader}>
        <h2 id="meetings-title" className={styles.cardTitle}>
          Meetings
        </h2>
        {waiting > 0 && <span className={styles.cardMeta}>{waiting} waiting for your reply</span>}
      </div>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {meetings.length === 0 ? (
        <p className={projectStyles.muted}>No meetings yet.</p>
      ) : (
        [
          { key: 'upcoming', title: 'Upcoming', items: upcoming },
          { key: 'earlier', title: 'Past and cancelled', items: earlier },
        ]
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <div key={group.key}>
              <h3 className={projectStyles.groupTitle}>{group.title}</h3>
              <ul className={projectStyles.meetingList}>
                {group.items.map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} url={`${base}/${meeting.id}`} action={action} />
                ))}
              </ul>
            </div>
          ))
      )}

      <details className={projectStyles.meetingPropose}>
        <summary className={projectStyles.meetingProposeSummary}>
          <Plus size={15} aria-hidden="true" />
          Propose a meeting
        </summary>
        <form className={projectStyles.meetingProposeForm} onSubmit={propose}>
        <div className={projectStyles.formGrid}>
          <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
            <label className={styles.filterLabel} htmlFor="meeting-title">
              Topic
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
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="meeting-when">
              Date and time (your local time)
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
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="meeting-duration">
              Duration
            </label>
            <select
              id="meeting-duration"
              className={styles.select}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {MEETING_DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="meeting-location">
              Place or video link
            </label>
            <input
              id="meeting-location"
              className={styles.input}
              maxLength={500}
              placeholder="https://meet.google.com/…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="meeting-milestone">
              Related milestone
            </label>
            <select
              id="meeting-milestone"
              className={styles.select}
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
            >
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
            <label className={styles.filterLabel} htmlFor="meeting-agenda">
              Agenda
            </label>
            <textarea
              id="meeting-agenda"
              className={styles.textarea}
              maxLength={2000}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>
        </div>
        <div className={projectStyles.formActions} style={{ marginTop: '0.75rem' }}>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={pending !== null}>
            {pending === 'create' ? 'Proposing…' : 'Propose meeting'}
          </button>
        </div>
        </form>
      </details>
    </section>
  );
}
