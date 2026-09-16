# Kinder website content import

The supplied archive is mapped to 25 deduplicated doctor profiles, 19 specialities and 49 content pages. Six of the pages preserve the spreadsheet's package prices and inclusions. All imports start hidden. Original clinical descriptions, qualifications, package exclusions and amounts are retained; titles and paragraph spacing are normalised.

## Deployment

1. Deploy this backend before the admin and frontend changes. The existing Docker startup uses `prisma db push` for additive schema changes and the image now includes `content/`. Existing records are preserved.
2. For a non-Docker existing database, run `npx prisma db execute --file scripts/content-schema.sql --schema prisma/schema.prisma`, then `npm run prisma:generate`. This additive SQL is repeatable and does not require an existing Prisma migration baseline.
3. Open admin → Content Library → Source review and import details. Click **Import new drafts**. Alternatively, `node scripts/import-website-content.js` previews changes; add `--apply` to import.
4. Review doctors and specialities in **Services & Doctors**. Review other pages in **Content Library**, filtered by section. Resolve and clear review notes, confirm hospital assignments, then publish each approved record.

Public pages are at `/information` and `/information/:slug`. Published packages appear on `/packages`, leadership/about pages are linked from `/about`, and hospital-tagged pages appear on that hospital's page. Speciality descriptions appear on corporate service pages or as expandable descriptions on branch pages. Homepage snippets are available as content pages, not automatically substituted into existing hero or statistics settings.

The importer matches source keys first, then an existing page slug or exact case-insensitive name plus hospital assignment. Existing matches are preserved and reported; their supplied replacement text remains in the bundled JSON for manual reconciliation. A transaction and PostgreSQL advisory lock prevent partial or concurrent duplicate imports. Deleted imported records can be recreated by a subsequent import. Importing does not upload photos or publish anything.

## Source issues

- `About Us.zip/Chairman's Message.docx` is empty. The chairman's profile contains a message, retained within that profile; it is not silently substituted for the empty file.
- Main doctor profiles are provisionally assigned to Cherthala based on the collection and explicit Cherthala references. All require hospital review. Shared Alleppey profiles are merged into the same doctor and use the existing `Alappuzha` hospital name.
- Dr Reshmy and Dr Shilpa Govind are filed under Radiodiagnosis in the Alleppey folder, but the main folder and profile identify reproductive medicine. Both records carry review notes.
- Patient Flow says 13,000+ births; the Alleppey introduction says more than 18,000. The source values are retained, and Patient Flow is flagged for review.
- Prices, eligibility, package exclusions, insurance terms and first-in-region/accreditation claims require confirmation before publication. No new medical advice or claims have been added.
- The archive contains no embedded photographs. Existing media management remains available for approved images.

## Verification

Run `node --test tests/website-content.test.js`. Tests cover source coverage, six package prices and inclusion counts, shared doctors, idempotency, preservation of edits, review validation, public metadata stripping and unauthenticated access. Database import semantics also need a staging PostgreSQL check; the unit test database is an in-memory adapter.
