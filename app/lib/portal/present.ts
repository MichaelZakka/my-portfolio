import { clientActivityParams } from './activity';
import { displayName, type getProjectActivity, type getProjectFiles, type getProjectMessages } from './queries';

/**
 * Client-facing JSON shapes. Internal fields (email delivery bookkeeping,
 * storage keys, other people's addresses) never leave the server.
 */

type Messages = Awaited<ReturnType<typeof getProjectMessages>>;
type Files = Awaited<ReturnType<typeof getProjectFiles>>;
type Activity = Awaited<ReturnType<typeof getProjectActivity>>;

export function presentMessages(messages: Messages, viewerId: string) {
  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    sender: {
      name: displayName(message.sender),
      isProjectLead: message.sender.role === 'admin',
      isYou: message.sender.id === viewerId,
    },
  }));
}

export function presentFiles(files: Files, projectId: string) {
  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdAt,
    uploadedBy: { name: displayName(file.uploadedBy), isProjectLead: file.uploadedBy.role === 'admin' },
    downloadUrl: `/api/portal/projects/${projectId}/files/${file.id}`,
  }));
}

export function presentActivity(activity: Activity) {
  return activity.map((entry) => ({
    id: entry.id,
    type: entry.type,
    params: clientActivityParams(entry.meta),
    createdAt: entry.createdAt,
  }));
}
