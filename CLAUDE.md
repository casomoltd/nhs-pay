# nhs-pay

NHS Agenda for Change pay library -- scales, pension tiers,
regions, HCAS, and take-home calculator.

## Commands

- `npm run check` -- the repo's full health gate; `check-gates`
  asserts its composition, so see `package.json` for the steps
- `npm run build` -- compile to dist/
- `npm test` -- run vitest

## Docs

Two, and the split is load-bearing.
[`docs/how-it-works.md`](docs/how-it-works.md) is the MODEL —
the recurrence, the definitions a date turns on, and every
declared assumption. [`docs/api.md`](docs/api.md) is the
REFERENCE — what is exported and what each name means. A rule of
the model belongs in the first and is linked from the second.

[`docs/api.md`](docs/api.md) is the hand-maintained API
reference: per-domain tables of every export with a one-line
description.
`scripts/check-api-docs.mjs` (in `npm run check`) fails unless
its table/type entries match `src/index.ts` exactly, both
directions -- so when you add or withdraw an export, update its
table row in the same commit. Names are the contract;
signatures live in the source JSDoc and the shipped `.d.ts`.

## Architecture

- `src/scales.ts` -- AFC pay scale data by tax year
- `src/pension.ts` -- NHS pension member tiers + the
  `PensionTiers` lookup VO + employer contribution rates
- `src/pension-projection.ts` -- 2015 CARE scheme projection
  orchestration: seed, the ledger walk, GAD ERF/LRF retirement
  factors, and the chart curve. NOT commutation, and not the
  accrual/revaluation arithmetic itself -- both live elsewhere
- `src/commutation.ts` -- exchanging pension for a tax-free lump
  sum, and the two caps on it (the scheme's 25% of capital value
  and the statutory Lump Sum Allowance). The projection depends
  on nothing here; this borrows two types from the pension layer
  -- `ProjectionMoney`, and the `Prices` the run walked with, so
  the allowance is carried forward at the rate the pension was
  actually projected at
- `src/npa.ts` -- 2015-scheme normal pension age from date of
  birth (legislated SPA timetable, floor 65, whole years)
- `src/dates.ts` -- package-private calendar arithmetic:
  anniversary-convention periods (for factor lookups) and
  fractional years (for compounding); never exported from the
  package root
- `src/gad/factor-table.ts` -- `FactorTable` lookup VO over one
  GAD factor table (bounds derived from data, rounding policy on
  the table, provenance carried in the data)
- `src/gad/erf-*.ts` / `src/gad/lrf-*.ts` -- verbatim per-table
  transcriptions of the in-force GAD consolidated-workbook issue
  (one file per table per issue; superseded file deleted whole).
  Full-table mirror fixtures in `tests/fixtures/gad-*.csv` pin
  every printed cell
- `src/regions.ts` -- AFC region codes (nation + HCAS)
- `src/bands.ts` -- merge layer: band id + salary +
  pension (presentation copy lives in hub-site)
- `src/hcas.ts` -- HCAS zone IDs and supplement calculation
- `src/hcas-pcts.ts` -- PCT-to-HCAS-zone reference data
- `src/take-home.ts` -- pre-configured TakeHomePay for NHS
- `src/format.ts` -- GBP/percentage formatting helpers
- `src/post.ts` -- immutable `Post` domain object (a
  salaried NHS post; derives take-home/pension/tax)
- `src/role.ts` -- `Role` union stamped onto a `Post`
  (`AfcRole` / `MedicalRole` / `DentalRole`)
- `src/resolver.ts` -- `afcResolver` + `medicalResolver` /
  `dentalResolver`: build a `Post` from a scale point
- `src/circulars/*.ts` -- verbatim 1:1 transcription of each
  medical/dental pay circular (one file per PDF)
- `src/scale-tables.ts` -- canonical `(grade,nation,year) ->
  points` container + shared verbatim->canonical translators
- `src/medical-scales.ts` / `src/dental-scales.ts` --
  translation layer: select + map circular rows to the domain
- `src/award.ts` -- pay awards per nation/year/family, each with
  its own source record; also the exported circular sources a
  consumer cites (`AFC_SCOTLAND`, `AFC_W_02_2026`, ...)
- `src/values.ts` -- shared value objects (`SalaryRange`)
- `src/pension/money.ts` -- `ProjectionMoney`, the
  `{nominal, real, asAt}` pair every reported figure travels as.
  Beside `prices.ts`, which argues the same real-versus-nominal
  doctrine, and outside the projection so commutation can take
  one without depending on the projection
- `src/allowances.ts` -- AfC cash allowances paid per session
  (Scotland's on-call availability allowance; Wales's sleeping-in
  and two on-call rates), transcribed as
  cited constants: the publisher rounds the uplifted figure,
  so deriving it from the award lands a penny out
- `src/errors.ts` -- fail-loud errors for absent pay data
  (`ScaleUnavailable`, `PensionTiersUnavailable`)

### Medical & dental data layer

Three layers keep transcription reviewable against the source
PDFs while the domain stays uniform: **verbatim circular**
(`src/circulars/*`) -> **translation** (`medical-scales.ts` /
`dental-scales.ts`) -> **canonical** (`getMedicalScales` /
`getDentalScales` + the resolvers). Each circular file
transcribes every table 1:1 or records why it is skipped;
the translation layer is inclusive by default (closed grades,
devolved training variants, Community Dental Service). Add a new
grade with one mapping line in the translation layer; add a new
pay round by transcribing the new circular into `src/circulars/`.
See the README's
[Medical & dental pay scales](README.md#medical--dental-pay-scales)
section for the public sources and scope policy.

## Relationship to paye-calc

This library is a domain layer on top of
`@casomoltd/paye-calc`. It embeds NHS-specific data (pay
scales, pension tiers, HCAS zones) and exposes
`nhsTakeHome()` which configures paye-calc's `TakeHomePay`
with NHS pension (NET basis, employer-determined rate).

paye-calc handles the generic UK tax/NI/pension maths;
nhs-pay handles the NHS-specific inputs.

## Data sources

| Data              | Source                         |
| ----------------- | ------------------------------ |
| AfC pay scales    | nhsemployers.org pay circulars |
| NHS pension tiers | nhsbsa.nhs.uk scheme guide     |
| Tax / NI rates    | gov.uk (via paye-calc)         |
| Wales pay letters | nhs.wales pay letters          |
| National Living Wage | gov.uk NLW announcements    |
| CARE revaluation  | HM Treasury Revaluation Orders (SIs) |
| GAD ERF/LRF factors | GAD consolidated factor workbook |
| Projection oracle | A redacted ABS + its hand-built sheet |

**Every cited document has an archived copy, and
[`docs/source-archive.md`](docs/source-archive.md) is the
inventory** — Drive file id, class, as-at date, issuer
reference, authoritative URL and retrieval date, per document.
It is the ONE home for those links: a second copy of them is
how a manifest and a doc drift apart. Each transcription cites
its own sources beside its data, as it should; what it does not
do is keep a second copy of the inventory.

Read it before replacing any source file. It carries the one
operational rule that can actually break the archive: replace
via Drive's *Manage versions*, never delete-and-reupload.

The **GAD factors** are transcribed verbatim in `src/gad/`, one
file per table per issue, each carrying its own provenance.
Their source of record is GAD's consolidated workbook, not the
NHSBSA member extract: the workbook alone carries the
version-control sheet that says which release last touched each
table.

**Checked 20 Aug 2026 against workbook version 2026-01** (Date
Modified 1 June 2026, the current issue). Tables x-420 (ERF1)
and x-421 (LRF1) are **unchanged**: its *Version control* sheet
shows both last updated in version 2023-02, dated 30 June 2023,
and 2026-01 touched only x-201 to x-209 and x-301 to x-308. The
cells were diffed as well as the changelog read, 25 rows across
the two tables, with zero differences. Do both before trusting
a later workbook — a table can be reissued without its number
changing.

The projection oracle is a real Annual Benefit Statement
(redacted) and a ten-year projection built by hand FROM it,
before the ledger existed. `tests/golden-abs.test.ts` reproduces
every row of that sheet to the penny, and it is the oracle
precisely because it was not derived from this code — a fixture
computed the same way as the implementation agrees with whatever
the implementation is changed to.

## Adding a new pay round

1. Add the new tax year's pay points to `src/scales.ts`
   (copy the previous year's block and update salaries
   from the nhsemployers.org pay circular).
2. Check whether pension tier thresholds have changed
   (nhsbsa.nhs.uk) and update `src/pension.ts` if so.
3. Update `AFC_CURRENT_YEAR` / `AFC_PREVIOUS_YEAR` in
   `src/bands.ts`.
4. Add new regression test rows to the CSV fixtures in
   `tests/fixtures/` (cross-check against the NHS
   Employers online calculator).
5. **Archive the circular you transcribed from**, and add its
   row to [`docs/source-archive.md`](docs/source-archive.md).
   If it REPLACES a document already there, upload it through
   Drive's **Manage versions** on the existing file — never
   delete the old one and upload the new. Delete-and-reupload
   mints a new file id and silently breaks every pointer we
   hold to it, in the manifest and in the transcription
   headers. The obvious action is the failing one.
6. Run `npm run check` to verify.

## Test fixtures

Regression test CSVs live in `tests/fixtures/`.

**The 2015 CARE projection's oracle is not a CSV.** It is
[`tests/golden-abs.test.ts`][golden], which reconciles the model
against a real (redacted) Annual Benefit Statement and a
ten-year projection built BY HAND from it before this code
existed. Both are linked from that file's own header, where the
citation sits beside the data it justifies, and both are
inventoried in [`docs/source-archive.md`](docs/source-archive.md).

Hand-built is the point: a fixture whose expected values came
from the same reasoning as the implementation agrees with
whatever the implementation is changed to. That file also
carries the earnings reconciliation, including the comparison
that MISLEADS — averaging a statement's printed earnings raw
mixes the pounds of different years and reads a tenth low — so
the trap is asserted rather than described.

[golden]: tests/golden-abs.test.ts

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
- Peer dependency on `@casomoltd/paye-calc` (>=0.5.0)
- 88-char line length, `as const` typed identifiers
