import type { Metadata } from 'next';
import { prisma } from '../../../lib/db';
import { requireAdminSession } from '../../../lib/session';
import { formatDateTime } from '../../../lib/portal/format';
import EmptyState from '../../_components/EmptyState';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';
import { deleteMessage, setMessageRead } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  await requireAdminSession();
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Messages</h1>
        <p className={styles.pageSubtitle}>
          Sent from the contact section of the site — newest first
          {unread > 0 ? ` · ${unread} unread` : ''}.
        </p>
      </div>

      {messages.length === 0 ? (
        <EmptyState title="No messages yet" description="Messages from the contact form will show up here." />
      ) : (
        <ul className={pageStyles.list}>
          {messages.map((m) => (
            <li key={m.id} className={pageStyles.item} {...(!m.read ? { 'data-new': '' } : {})}>
              <div className={pageStyles.head}>
                <div>
                  <span className={pageStyles.name}>{m.name}</span>
                  {!m.read && <span className={pageStyles.new}>New</span>}
                  <a className={`${styles.link} ${pageStyles.email}`} href={`mailto:${m.email}`} dir="ltr">
                    {m.email}
                  </a>
                </div>
                <time className={pageStyles.time} dateTime={m.createdAt.toISOString()}>
                  {formatDateTime(m.createdAt, 'en')}
                </time>
              </div>
              <p className={pageStyles.message} dir="auto">
                {m.message}
              </p>
              <div className={pageStyles.actions}>
                <a
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message')}`}
                >
                  Reply
                </a>
                <form action={setMessageRead}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="read" value={String(!m.read)} />
                  <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`}>
                    {m.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </form>
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`}>
                    Delete
                  </button>
                </form>
                {!m.emailSent && <span className={pageStyles.warn}>Email notification failed</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
