-- Admin notifications: when the feed was last opened (see AdminState in schema.prisma).

-- CreateTable
CREATE TABLE "AdminState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "noticesSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminState_pkey" PRIMARY KEY ("id")
);

-- Keep the table away from Supabase's Data API, like every other table
-- (see 20261109000000_enable_rls).
ALTER TABLE "AdminState" ENABLE ROW LEVEL SECURITY;
