-- Meeting notes: after a meeting the admin writes a summary and action items (a
-- private draft until published); publishing marks the meeting "held". A client
-- can confirm the notes, tick their action items and comment under them.

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedById" TEXT,
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "outputPublishedAt" TIMESTAMP(3),
ADD COLUMN     "outputSavedAt" TIMESTAMP(3),
ADD COLUMN     "outputSummary" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MeetingActionItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingComment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingActionItem_meetingId_position_idx" ON "MeetingActionItem"("meetingId", "position");

-- CreateIndex
CREATE INDEX "MeetingComment_meetingId_createdAt_idx" ON "MeetingComment"("meetingId", "createdAt");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingComment" ADD CONSTRAINT "MeetingComment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingComment" ADD CONSTRAINT "MeetingComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The app reaches the database only through Prisma (the table owner); RLS with no
-- policies keeps Supabase's Data API roles out (see 20261109000000_enable_rls).
ALTER TABLE "MeetingActionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingComment" ENABLE ROW LEVEL SECURITY;
