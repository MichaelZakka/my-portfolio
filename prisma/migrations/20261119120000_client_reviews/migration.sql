-- End-of-project sign-off: a CompletionRound each time a project is marked Completed,
-- and per client member a completion answer plus the private review survey (ClientReview).

-- CreateTable
CREATE TABLE "CompletionRound" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CompletionRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT,
    "reviewerName" TEXT NOT NULL DEFAULT '',
    "reviewerEmail" TEXT NOT NULL DEFAULT '',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "completion" TEXT NOT NULL,
    "missingNote" TEXT NOT NULL DEFAULT '',
    "answeredAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "overall" INTEGER,
    "recommend" INTEGER,
    "portalEase" INTEGER,
    "painPoints" TEXT NOT NULL DEFAULT '[]',
    "portalComment" TEXT NOT NULL DEFAULT '',
    "quality" INTEGER,
    "deadlines" INTEGER,
    "requirements" INTEGER,
    "value" INTEGER,
    "responsiveness" INTEGER,
    "updates" INTEGER,
    "involvement" INTEGER,
    "wentWell" TEXT NOT NULL DEFAULT '',
    "improve" TEXT NOT NULL DEFAULT '',
    "otherComment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompletionRound_projectId_openedAt_idx" ON "CompletionRound"("projectId", "openedAt");

-- CreateIndex
CREATE INDEX "ClientReview_projectId_idx" ON "ClientReview"("projectId");

-- CreateIndex
CREATE INDEX "ClientReview_submittedAt_idx" ON "ClientReview"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientReview_roundId_userId_key" ON "ClientReview"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "CompletionRound" ADD CONSTRAINT "CompletionRound_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CompletionRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Projects already marked Completed get an open round, so their clients can confirm and review
-- (no email goes out for these; the card appears on the project page).
INSERT INTO "CompletionRound" ("id", "projectId", "openedAt")
SELECT 'cr' || substr(md5(random()::text || "id"), 1, 23), "id", COALESCE("completedAt", CURRENT_TIMESTAMP)
FROM "Project"
WHERE "status" = 'completed' AND "archivedAt" IS NULL;

-- RLS with no policies keeps Supabase's Data API roles out (see 20261109000000_enable_rls).
ALTER TABLE "CompletionRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientReview" ENABLE ROW LEVEL SECURITY;
