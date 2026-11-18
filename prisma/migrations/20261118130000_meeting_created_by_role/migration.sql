-- Who created each meeting (client | admin). proposedByRole flips whenever a
-- new time is suggested, so it cannot tell; the creator decides who may edit
-- the details (a client's meeting: the client; the admin only adds the link).
ALTER TABLE "Meeting" ADD COLUMN "createdByRole" TEXT NOT NULL DEFAULT 'admin';

-- Existing meetings: the author of their MEETING_PROPOSED activity (always
-- the first entry, written when the meeting was created)...
UPDATE "Meeting" AS m
SET "createdByRole" = CASE WHEN u."role" = 'admin' THEN 'admin' ELSE 'client' END
FROM "Activity" AS a
JOIN "User" AS u ON u."id" = a."actorId"
WHERE a."type" = 'MEETING_PROPOSED'
  AND a."projectId" = m."projectId"
  AND a."meta" LIKE '%"meetingId":"' || m."id" || '"%';

-- ...or, when that entry or its author is gone, the side that proposed the current time.
UPDATE "Meeting" AS m
SET "createdByRole" = m."proposedByRole"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Activity" AS a
  JOIN "User" AS u ON u."id" = a."actorId"
  WHERE a."type" = 'MEETING_PROPOSED'
    AND a."projectId" = m."projectId"
    AND a."meta" LIKE '%"meetingId":"' || m."id" || '"%'
);
