-- The language the client picked in the intake survey (en | ar). Nullable:
-- requests sent before this column existed fall back to guessLeadLocale().
ALTER TABLE "Lead" ADD COLUMN "contactLocale" TEXT;
