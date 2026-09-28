# Kinder website content import

## Kochi pregnancy pages — 24 September 2026

Two additional hidden drafts from the public Kinder Kochi Tharattazhaku and WOW MOM pages are in `kochi-pregnancy.json`. Import them in Admin → Content Library, review dated event claims and current schedules, clear review notes, then publish. Water Birth and Premium Birthing Centre use the existing Kochi Care drafts; the website highlights them after approval. A page's `galleryUrls` holds one HTTPS image URL per line and is editable in the admin. The additive SQL column and Prisma schema must be deployed before using the new backend/admin. The import preserves all existing editorial records.

The supplied archive is mapped to 25 deduplicated doctor profiles, 19 specialities and 49 content pages. Six of the pages preserve the spreadsheet's package prices and inclusions. All imports start hidden. Original clinical descriptions, qualifications, package exclusions and amounts are retained; titles and paragraph spacing are normalised.

## Deployment

1. Deploy this backend before the admin and frontend changes. Docker startup first applies `scripts/content-schema.sql`, then runs `prisma db push --skip-generate` and starts the API. This explicitly adds the nullable source keys and unique indexes before Prisma sync, avoiding its unique-index warning on existing tables. The SQL runs transactionally, is repeatable, and preserves existing records. Duplicate non-null source keys cause a failure and rollback; do not bypass this with `--accept-data-loss`. The image includes `content/`.
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


## Kochi care documents — 17 September 2026

Four new pages cover General & Laparoscopic Surgery, Obstetrics & Gynaecology, Premium Birthing Centre and Water Birthing Suite. They are grouped under `Kochi Care`, assigned to `Kochi`, and imported as editable hidden drafts. Total import pack: 97 records (25 doctors, 19 specialities, 53 pages). Existing content is preserved on repeat import.

Deploy the backend, open Admin → Content Library, import the four new drafts, then choose Kochi Care and Review & publish. The frontend links published pages from the Kochi hospital page and `/information`. No database schema change is needed.

Patient-facing headings, lists and FAQs are retained. Keyword research, metadata recommendations and development notes are retained privately in `kochi-source-notes.json`, not sent to public endpoints. Source meta descriptions populate editable page excerpts. Requested source URLs are recorded in that private file; published pages use the existing `/information/:slug` routing. Phone placeholders and the unconfirmed “It costs nothing to ask” sentence are removed. Review notes identify clinical/service claims requiring hospital confirmation. No unverified clinician profiles or facility photographs are created.

## Kinder Kollam — 20 September 2026

`src/lib/bootstrapKollam.js` adds the Kollam centre from the supplied website
tree: the hospital record (`kinderkollam.com`, 0474-2550000,
contactus@kinderkollam.com, Randamkutty · Kilikollor PO, Since 2026), its four
facilities, five specialities, nine doctors and its privacy policy page. It runs
on API startup like the Aranmula bootstrap, is guarded by the
`bootstrap.kollam` setting, and skips anything that already exists — an admin's
edits are never overwritten and the hospital's visibility switch is never
flipped back on.

Unlike the import pack, these records arrive **published**, so Kollam appears on
the website as soon as the API restarts. Everything is then editable in the
admin: hospital details and facilities in **Hospitals**, departments and doctors
in **Services & Doctors**, the privacy policy in **Content Library**. Hide the
centre again at any time with the visibility switch on its card in **Hospitals**.

Facilities are stored in the hospital's Highlights box, one per line as
`Name — description`; the website prints the name in bold with its description
beneath. Lines without a dash still render as plain ticks, so existing centres
are unaffected.

`Location.bookingUrl` is new: a centre's own appointment link
(`https://mobapp.kinderhospitals.com` for Kollam), used by the Book Appointment
buttons on that hospital's sub-site. Leave it empty and the group WhatsApp link
is used, exactly as before. `prisma db push` adds the column; the additive
`scripts/content-schema.sql` covers the non-Docker path.

Doctor portraits are not seeded — upload each one under Services & Doctors.
Names and qualifications are carried over as supplied, with spelling normalised
to the house style used elsewhere in the database ("Gynaecology", "Laparoscopic
Surgeon"). The supplied policy text leaves the contact address blank in three
places; each is filled with the centre's published email. Confirm both before
sign-off.

Run `node --test tests/kollam-bootstrap.test.js` to verify.
