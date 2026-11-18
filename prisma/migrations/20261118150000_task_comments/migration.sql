-- Task comments: clients comment on tasks shown to them, the admin on any task;
-- attachments are project files (taskCommentId). Emails are batched per recipient.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adminTaskCommentsNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "taskCommentId" TEXT;

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "taskCommentsNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskComment_projectId_createdAt_idx" ON "TaskComment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectFile_taskCommentId_idx" ON "ProjectFile"("taskCommentId");

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_taskCommentId_fkey" FOREIGN KEY ("taskCommentId") REFERENCES "TaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The app reaches the database only through Prisma (the table owner); RLS with no
-- policies keeps Supabase's Data API roles out (see 20261109000000_enable_rls).
ALTER TABLE "TaskComment" ENABLE ROW LEVEL SECURITY;
