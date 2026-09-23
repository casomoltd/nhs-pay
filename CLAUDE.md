# nhs-pay

NHS pay library -- Agenda for Change, medical and dental scales,
pension tiers, regions, HCAS and take-home pay -- and a member's
NHS pension across the 1995, 2008 and 2015 Sections, including the
McCloud remedy window, through `memberBenefits`.

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
- `src/pension-projection.ts` -- the deprecated flat-pay 2015
  Section projection (`projectPension`): seed, the ledger walk and
  the pairing of its two runs. Factors are read through
  `factor-basis.ts`, the curve is `src/pension/curve.ts`, and
  commutation and the accrual arithmetic live elsewhere
- `src/member-benefits.ts` -- a member's benefits across every
  section they hold: derives and checks the service periods (the
  remedy window included), then per set of retirement choices sums
  each section's award and takes cash across the total. The one
  public door to the sections
- `src/sections/` -- the three sections, internal: each holds its
  own statute. `final-salary.ts` is the engine the 1995 and 2008
  Sections share; `section-2015.ts` runs the career average ledger
  for the 2015 Section and for a remedy window valued on its rules
- `src/pay-path.ts` -- a member's pay in every scheme year, on
  GAD's promotional curve (`src/gad/promotional-scale-2020.ts`) and
  their AfC ladder, each year labelled with its basis
- `src/factor-basis.ts` -- the one door every early or late factor
  is read through, keyed by pension age and direction
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
  GAD factor table, keyed by period (2015 Section) or by age (1995
  and 2008 Sections); bounds derived from data, rounding policy on
  the table, provenance carried in the data
- `src/gad/erf-*.ts` / `src/gad/lrf-*.ts` -- verbatim per-table
  transcriptions of the in-force GAD consolidated-workbook issue
  (one file per table per issue; superseded file deleted whole).
  Full-table mirror fixtures in `tests/fixtures/gad-*.csv` pin
  every printed cell
- `src/regions.ts` -- AFC region codes (nation + HCAS)
- `src/bands.ts` -- merge layer: band id + salary +
  pension (presentation copy lives in the consumer)
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
- `src/circulars/*.ts` -- verbatim 1:1 transcription of each pay
  circular, medical/dental AND Agenda for Change (one file per PDF);
  `afc-shapes.ts` holds the table shapes the AfC publishers share
- `src/afc-band.ts` -- the AfC band registry (id, ordering). Its own
  module so `scales.ts` and `afc-scales.ts` can both name a band
  without forming a cycle
- `src/afc-scales.ts` -- translation layer for AfC: circulars ->
  canonical points, deriving each point's label from the publisher's
  own progression column
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
- `src/errors.ts` -- fail-loud errors a caller catches by type:
  absent pay data (`ScaleUnavailable` and siblings), a member with
  no pay to build from (`PayPathUnavailable`), and service not
  modelled (`BenefitNotModelled`, keyed by `NOT_MODELLED`)

### The three-layer data model

Three layers keep transcription reviewable against the source
PDFs while the domain stays uniform: **verbatim circular**
(`src/circulars/*`) -> **translation** (`medical-scales.ts` /
`dental-scales.ts` / `afc-scales.ts`) -> **canonical**
(`getMedicalScales` / `getDentalScales` / `getAfcScales` + the
resolvers).

**The rule for which data gets a circular file:** *where the
publisher issues a circular, transcribe it verbatim; where it
publishes a web table, cite it and pin it with fixtures.* Scotland,
Wales and NI publish AfC circulars and have them. **England does
not** -- its AfC scales are an NHS Employers web page plus a poster,
so they are authored directly in `scales.ts`. Do not invent a
pseudo-circular file for England to make the shapes match: it would
assert a document that does not exist. Each circular file
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
| GAD ERF/LRF factors (2015, 1995, 2008 Sections) | GAD consolidated factor workbook |
| Promotional pay index | GAD 2020 valuation assumptions summary |
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

**The GAD tables in use are current**: each is checked against the
workbook's *Version control* sheet and diffed cell by cell before
it is trusted, and when that was last done is recorded in
[`docs/source-archive.md`](docs/source-archive.md#gad-factors).
Do both before trusting a later workbook — a table can be
reissued without its number changing.

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

The model's oracles are not CSVs: a real, redacted Annual Benefit
Statement for the 2015 Section's ledger, and an invented member
worked independently for member benefits. What each is and why it
can be trusted is in
[`docs/how-it-works.md`](docs/how-it-works.md#checking-it).

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
- Peer dependency on `@casomoltd/paye-calc` (>=0.5.0)
- 88-char line length, `as const` typed identifiers
