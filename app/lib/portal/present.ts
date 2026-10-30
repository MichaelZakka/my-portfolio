import { clientActivityParams } from './activity';
import { isProjectStatus } from './constants';
import { formatBytes, formatDate, formatDateTime } from './format';
import type { getPortalTranslations } from './locale';
import { displayName, type getProjectActivity, type getProjectFiles, type getProjectMessages } from './queries';

/**
 * Client-facing JSON shapes, shared by the portal page (initial render) and
 * the portal GET APIs (live updates). Labels are formatted here on the
 * server in the viewer's language, so the client never formats dates and
 * server and client markup always match. Internal fields (email delivery
 * bookkeeping, storage keys, other people's addresses) never leave the server.
 */

type PortalTranslator = Awaited<ReturnType<typeof getPortalTranslations>>['t'];

export function presentMessages(
  messages: Awaited<ReturnType<typeof getProjectMessages>>,
  viewerId: string,
  { locale }: { locale: string }
) {
  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    timeLabel: formatDateTime(message.createdAt, locale),
    sender: {
      name: displayName(message.sender),
      isProjectLead: message.sender.role === 'admin',
      isYou: message.sender.id === viewerId,
    },
  }));
}

export function presentFiles(
  files: Awaited<ReturnType<typeof getProjectFiles>>,
  projectId: string,
  { locale }: { locale: string }
) {
  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdAt.toISOString(),
    sizeLabel: formatBytes(file.fileSize, locale),
    dateLabel: formatDate(file.createdAt, locale),
    uploadedBy: { name: displayName(file.uploadedBy), isProjectLead: file.uploadedBy.role === 'admin' },
    downloadUrl: `/api/portal/projects/${projectId}/files/${file.id}`,
  }));
}

/** Placeholders each activity sentence needs; rows missing them (legacy data) use the fallback. */
const ACTIVITY_PARAMS: Record<string, string[]> = {
  INVITE_ACCEPTED: ['name'],
  MILESTONE_CREATED: ['title'],
  MILESTONE_COMPLETED: ['title'],
  TASK_CREATED: ['title'],
  TASK_COMPLETED: ['title'],
  MESSAGE_SENT: ['senderName'],
  FILE_UPLOADED: ['filename'],
  STATUS_CHANGED: ['to'],
};

function describeActivity(type: string, params: Record<string, string>, t: PortalTranslator): string {
  const required = ACTIVITY_PARAMS[type] ?? [];
  if (!t.has(`activity.${type}`) || required.some((key) => !params[key])) return t('activity.fallback');
  const values = { ...params };
  if (values.to && isProjectStatus(values.to)) values.to = t(`status.${values.to}`);
  return t(`activity.${type}`, values);
}

export function presentActivity(
  activity: Awaited<ReturnType<typeof getProjectActivity>>,
  { locale, t }: { locale: string; t: PortalTranslator }
) {
  return activity.map((entry) => {
    const params = clientActivityParams(entry.meta);
    return {
      id: entry.id,
      type: entry.type,
      params,
      createdAt: entry.createdAt.toISOString(),
      timeLabel: formatDateTime(entry.createdAt, locale),
      text: describeActivity(entry.type, params, t),
    };
  });
}

export type ClientMessage = ReturnType<typeof presentMessages>[number];
export type ClientFile = ReturnType<typeof presentFiles>[number];
export type ClientActivity = ReturnType<typeof presentActivity>[number];
