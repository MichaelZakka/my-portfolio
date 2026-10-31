import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { authorizeAdminProject } from '../../../../../../lib/portal/access';
import { syncActivityVisibility } from '../../../../../../lib/portal/activity';
import { deleteStoredFile, fileDownloadResponse } from '../../../../../../lib/portal/files';
import { notFound, parseJsonBody, parseParam } from '../../../../../../lib/portal/http';
import { fileUpdateSchema, idSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; fileId: string }> };

async function findFile(projectId: string, fileId: string) {
  return prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId, fileId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, fileId);
  if (!id.ok) return id.response;

  const file = await findFile(auth.project.id, id.data);
  if (!file) return notFound('File not found.');
  return fileDownloadResponse(file);
}

/** Shares a file with the client or hides it again (its activity entry follows). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, fileId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, fileId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, fileUpdateSchema);
  if (!body.ok) return body.response;

  const file = await findFile(auth.project.id, id.data);
  if (!file) return notFound('File not found.');

  const { visibleToClient } = body.data;
  await prisma.$transaction(async (tx) => {
    await tx.projectFile.update({ where: { id: file.id }, data: { visibleToClient } });
    await syncActivityVisibility(auth.project.id, { fileId: file.id }, visibleToClient, tx);
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { projectId, fileId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, fileId);
  if (!id.ok) return id.response;

  const file = await findFile(auth.project.id, id.data);
  if (!file) return notFound('File not found.');

  await prisma.projectFile.delete({ where: { id: file.id } });
  await deleteStoredFile(file);
  return NextResponse.json({ success: true });
}
