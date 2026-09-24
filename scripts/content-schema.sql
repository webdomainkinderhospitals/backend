BEGIN;
-- Serialize this additive setup when Cloud Run starts multiple instances.
SELECT pg_advisory_xact_lock(19860916);
-- On an empty database, Prisma creates the base tables in the next startup step.
DO $$
BEGIN
  IF to_regclass('"Doctor"') IS NOT NULL THEN
    ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;
    ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "sourceFiles" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX IF NOT EXISTS "Doctor_sourceKey_key" ON "Doctor"("sourceKey");
  END IF;
  IF to_regclass('"Location"') IS NOT NULL THEN
    ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "bookingUrl" TEXT NOT NULL DEFAULT '';
  END IF;
  IF to_regclass('"Speciality"') IS NOT NULL THEN
    ALTER TABLE "Speciality" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;
    ALTER TABLE "Speciality" ADD COLUMN IF NOT EXISTS "sourceFiles" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Speciality" ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Speciality" ADD COLUMN IF NOT EXISTS "fullDescription" TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX IF NOT EXISTS "Speciality_sourceKey_key" ON "Speciality"("sourceKey");
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "ContentPage" (
 "id" SERIAL PRIMARY KEY, "sourceKey" TEXT UNIQUE, "sourceFiles" TEXT NOT NULL DEFAULT '',
 "reviewNotes" TEXT NOT NULL DEFAULT '', "title" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
 "category" TEXT NOT NULL DEFAULT 'About Us', "excerpt" TEXT NOT NULL DEFAULT '',
 "body" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL DEFAULT '', "imageUrl" TEXT NOT NULL DEFAULT '',
 "galleryUrls" TEXT NOT NULL DEFAULT '',
 "sortOrder" INTEGER NOT NULL DEFAULT 0, "published" BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "galleryUrls" TEXT NOT NULL DEFAULT '';
COMMIT;
