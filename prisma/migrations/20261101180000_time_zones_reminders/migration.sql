-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timeZone" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

