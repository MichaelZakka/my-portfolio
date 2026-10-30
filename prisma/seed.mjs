/**
 * Demo data for the client portal: the admin identity, a client who can sign
 * in at /portal/login, and a project with milestones, tasks, a message and
 * matching activity. Safe to re-run: the demo project is replaced each time.
 *
 *   npm run db:seed
 *
 * Env (read from .env.local / .env): DATABASE_URL, ADMIN_EMAIL, and optionally
 * SEED_CLIENT_EMAIL / SEED_CLIENT_PASSWORD for the demo client login.
 *
 * The admin keeps signing in at /admin/login with ADMIN_EMAIL and the password
 * behind ADMIN_PASSWORD_HASH; the seeded admin row (no password) only authors
 * messages and activity.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file); // never overrides variables that are already set
  } catch {
    // file not present
  }
}

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
  console.error('Refusing to seed demo accounts with NODE_ENV=production (pass --allow-production to override).');
  process.exit(1);
}

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
const CLIENT_EMAIL = (process.env.SEED_CLIENT_EMAIL || 'client@example.com').trim().toLowerCase();
const CLIENT_PASSWORD = process.env.SEED_CLIENT_PASSWORD || 'portal-demo-2026';
const PROJECT_NAME = 'Demo: Bilingual landing page';

const DAY = 24 * 60 * 60 * 1000;
const dateOnly = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const ago = (days) => new Date(Date.now() - days * DAY);

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: 'Michael Zakka', role: 'admin', emailVerifiedAt: new Date() },
  });
  if (admin.role !== 'admin') throw new Error(`${ADMIN_EMAIL} already exists as a ${admin.role} account.`);

  const passwordHash = await bcrypt.hash(CLIENT_PASSWORD, 12);
  const client = await prisma.user.upsert({
    where: { email: CLIENT_EMAIL },
    update: { passwordHash, sessionVersion: { increment: 1 } },
    create: {
      email: CLIENT_EMAIL,
      name: 'Demo Client',
      role: 'client',
      passwordHash,
      emailVerifiedAt: new Date(),
      locale: 'en',
    },
  });
  if (client.role !== 'client') throw new Error(`${CLIENT_EMAIL} already exists as a ${client.role} account.`);

  await prisma.project.deleteMany({ where: { name: PROJECT_NAME, members: { some: { userId: client.id } } } });

  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      summary:
        'A fast English/Arabic landing page with RTL layout, a contact form and analytics. ' +
        'Milestones, messages and files for the project live here.',
      status: 'in_progress',
      currentPhase: 'Design',
      estimatedCompletion: dateOnly(30),
      startedAt: ago(12),
      createdAt: ago(14),
      members: { create: { userId: client.id, role: 'client', createdAt: ago(13) } },
    },
  });

  const milestone = (title, description, status, order, extra = {}) =>
    prisma.milestone.create({
      data: { projectId: project.id, title, description, status, order, createdAt: ago(13), ...extra },
    });
  const discovery = await milestone('Discovery', 'Goals, audience and content outline agreed.', 'done', 0, {
    dueDate: dateOnly(-7),
    completedAt: ago(6),
  });
  const design = await milestone('Design', 'Wireframes and visual design in both languages.', 'in_progress', 1, {
    dueDate: dateOnly(10),
  });
  const build = await milestone('Build & launch', 'Next.js build, QA on mobile, launch on Vercel.', 'todo', 2, {
    dueDate: dateOnly(30),
  });

  const taskSpecs = [
    [discovery, 'Kick-off call', 'done', true, 0],
    [discovery, 'Competitor review', 'done', false, 1],
    [design, 'Homepage wireframe', 'in_progress', true, 0],
    [design, 'Arabic typography pass', 'todo', true, 1],
    [build, 'Contact form with email notifications', 'todo', true, 0],
    [null, 'Set up staging deployment', 'todo', false, 0],
  ];
  const tasks = [];
  for (const [ms, title, status, visibleToClient, order] of taskSpecs) {
    tasks.push(
      await prisma.task.create({
        data: {
          projectId: project.id,
          milestoneId: ms?.id ?? null,
          title,
          status,
          visibleToClient,
          order,
          completedAt: status === 'done' ? ago(7) : null,
          createdAt: ago(12),
        },
      })
    );
  }

  const messageText =
    'Welcome to your project portal! You can follow milestones here, send me messages and share files. ' +
    'First homepage wireframes are coming this week.';
  const message = await prisma.message.create({
    data: { projectId: project.id, senderId: admin.id, content: messageText, createdAt: ago(5) },
  });

  // Activity mirrors what the app logs (app/lib/portal/activity.ts).
  const log = (type, summary, meta, visibleToClient, at, actorId = admin.id) =>
    prisma.activity.create({
      data: {
        projectId: project.id,
        actorId,
        type,
        summary,
        meta: JSON.stringify(meta),
        visibleToClient,
        createdAt: at,
      },
    });
  await log('PROJECT_CREATED', `Project "${PROJECT_NAME}" created`, { name: PROJECT_NAME }, true, ago(14));
  await log('INVITE_ACCEPTED', 'Demo Client accepted the invitation', { name: 'Demo Client' }, true, ago(13), client.id);
  for (const ms of [discovery, design, build]) {
    await log('MILESTONE_CREATED', `Milestone added: ${ms.title}`, { milestoneId: ms.id, title: ms.title }, true, ago(13));
  }
  for (const task of tasks) {
    await log('TASK_CREATED', `Task added: ${task.title}`, { taskId: task.id, title: task.title }, task.visibleToClient, ago(12));
  }
  await log('STATUS_CHANGED', 'Status changed from Planning to In progress', { from: 'planning', to: 'in_progress' }, true, ago(12));
  for (const task of tasks.filter((t) => t.status === 'done')) {
    await log('TASK_COMPLETED', `Task completed: ${task.title}`, { taskId: task.id, title: task.title }, task.visibleToClient, ago(7));
  }
  await log('MILESTONE_COMPLETED', `Milestone completed: ${discovery.title}`, { milestoneId: discovery.id, title: discovery.title }, true, ago(6));
  await log('MESSAGE_SENT', 'Michael Zakka sent a message', { messageId: message.id, senderName: admin.name || 'Michael Zakka' }, true, ago(5));

  console.log('Seeded the client portal demo:');
  console.log(`  Admin identity : ${ADMIN_EMAIL} (signs in at /admin/login with the env credentials)`);
  console.log(`  Client login   : ${CLIENT_EMAIL} / ${CLIENT_PASSWORD} at /portal/login`);
  console.log(`  Project        : ${PROJECT_NAME} (${project.id})`);
  console.log(`                   3 milestones, ${tasks.length} tasks, 1 message`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
