-- Portfolio content edited in /admin/content (see SiteContent in schema.prisma).

-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

-- Keep the table away from Supabase's Data API, like every other table
-- (see 20261109000000_enable_rls). The app reaches it through Prisma as the
-- table owner, which RLS does not restrict.
ALTER TABLE "SiteContent" ENABLE ROW LEVEL SECURITY;
