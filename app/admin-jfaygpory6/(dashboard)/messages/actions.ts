'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../../lib/db';
import { requireAdminSession } from '../../../lib/session';

const PATH = '/admin-jfaygpory6/messages';

export async function setMessageRead(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get('id') ?? '');
  const read = formData.get('read') === 'true';
  await prisma.contactMessage.updateMany({ where: { id }, data: { read } });
  revalidatePath(PATH);
}

export async function deleteMessage(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get('id') ?? '');
  await prisma.contactMessage.deleteMany({ where: { id } });
  revalidatePath(PATH);
}
