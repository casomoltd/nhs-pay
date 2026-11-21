# nhs-pay

NHS pay library -- Agenda for Change, medical and dental scales, pension tiers, regions, HCAS and take-home pay -- and a member's NHS pension across the 1995, 2008 and 2015 Sections, including the McCloud remedy window, through `memberBenefits`.

## Commands

- `npm run check` -- the repo's full health gate; `check-gates` asserts its composition, so see `package.json` for the steps
- `npm run build` -- compile to dist/
- `npm test` -- run vitest

## Docs

Two, and the split is load-bearing. [`docs/how-it-works.md`](docs/how-it-works.md) is the MODEL — the recurrence, the definitions a date turns on, and every declared assumption. [`docs/api.md`](docs/api.md) is the REFERENCE — what is exported and what each name means. A rule of the model belongs in the first and is linked from the second.

[`docs/api.md`](docs/api.md) is the hand-maintained API reference: per-domain tables of every export with a one-line description. `scripts/check-api-docs.mjs` (in `npm run check`) fails unless its table/type entries match `src/index.ts` exactly, both directions -- so when you add or withdraw an export, update its table row in the same commit. Names are the contract; signatures live in the source JSDoc and the shipped `.d.ts`.

## Architecture

- `src/scales.ts` -- AfC pay scales by pay year for every nation, the lookups over them, and the rule for how far a pay round may sit from a tax year; the caller supplies the tax year
- `src/published/` -- published figures that are not a pay circular's ladder (England's AfC web table, the HCAS handbook annex, the Welsh living-wage letter), exempt from `no-magic-numbers`
- `src/pay-year.ts` -- a pay year's place on the scheme calendar, for every staff group (`schemeYearOfPayYear`); `scales.ts` builds `afcPayYearFor` on it
- `src/pension.ts` -- NHS pension member tiers + the `PensionTiers` lookup VO + employer contribution rates
- `src/pension-projection.ts` -- the deprecated flat-pay 2015 Section projection (`projectPension`): seed, the ledger walk and the pairing of its two runs. Factors are read through `factor-basis.ts`, the curve is `src/pension/curve.ts`, and commutation and the accrual arithmetic live elsewhere
- `src/member/` -- a member's benefits across every section they hold, through `index.ts`, its one public door. `benefits.ts` builds them (`memberBenefits`): per set of retirement choices it refuses a drawing below the member's minimum pension age, sums each section's award and takes cash across the total. Its parts are internal: `types.ts` the vocabulary and answer shapes, `service.ts` the service periods derived and checked (the remedy window included), `valuation.ts` each section's award, `input-period.ts` a tax year's pension input per arrangement
- `src/sections/` -- the three sections, internal: each holds its own statute. `final-salary.ts` is the engine the 1995 and 2008 Sections share; `section-2015.ts` runs the career average ledger for the 2015 Section and for a remedy window valued on its rules
- `src/pay-path.ts` -- a member's pay in every scheme year, on GAD's promotional curve (`src/gad/promotional-scale-2020.ts`) and their AfC ladder, each year labelled with its basis
- `src/factor-basis.ts` -- the one door every early or late factor is read through: a basis keyed by pension age names the table each side of it reads, and the door judges the side from the dates. The citations of the tables behind the factors (`factorProvenance`) and the period-keyed 2015 ERF (`erf2015For`) live here too
- `src/gad/factor-set.ts` -- the one GAD issue of the early and late factor tables every drawing reads, keyed by purpose, each table checked to be the one its purpose names and to share the issue's in-use date
- `src/additional-pension.ts` -- buying extra 2015 Section pension: how much to buy now for a pension wanted at drawing, and its lump-sum or monthly price from GAD's purchase tables (`src/gad/additional-pension-*`)
- `src/commutation.ts` -- exchanging pension for a tax-free lump sum, and the two caps on it (the scheme's 25% of capital value and the statutory Lump Sum Allowance). The projection depends on nothing here; this borrows two types from the pension layer -- `ProjectionMoney`, and the `Prices` the run walked with, so the allowance is carried forward at the rate the pension was actually projected at
- `src/pension/ages.ts` -- the ages a member's pension turns on: the legacy sections' pension ages, the 2015 Section normal pension age from date of birth (legislated SPA timetable, floor 65, whole years), and the earliest age a member can draw, by first joining and drawing date
- `src/pension/scheme-year.ts` -- the scheme year, 1 April to 31 March, named by the year its 31 March falls in: the `SchemeYearEnd` brand, its one mint and the dates that bound it. Imports nothing, so every module that dates a pension reads it without a cycle
- `src/pension/seed.ts` -- where a 2015 Section walk starts (`LedgerSeed`): from a statement, from a balance stated on any day, or from the join date, each read once here
- `src/pension/ledger.ts` -- the year-by-year walk from a seed (`buildLedger`): revaluation, the year's slice, the leaver adjustment and the drawing's factor, and the refusal of a read before a statement
- `src/pension/uplift.ts` -- the uplift rule, a function of the member's phase alone, and the one uplift that opens the year after a seed
- `src/pension/prices.ts` -- the price series a run walks with: an assumed CPI throughout, or each year's Revaluation Order where one exists, and the pay conversion between them
- `src/pension/history.ts` -- the 2015 Section's years before a statement, estimated in today's money for the chart and calibrated to land on the stated balance; never an input to the projection
- `src/revaluation.ts` -- each Revaluation Order's September CPI, the date the scheme applied it, the instrument that made it and the active rate derived from its CPI (`activeRatePct`, CPI + 1.5); the applied rates are a test fixture (`tests/fixtures/revaluation-applied.csv`), not data
- `src/dates.ts` -- package-private calendar arithmetic: anniversary-convention periods (for factor lookups) and fractional years (for compounding); never exported from the package root
- `src/gad/factor-table.ts` -- `FactorTable` lookup VO over one GAD factor table, keyed by period (2015 Section) or by age (1995 and 2008 Sections); bounds derived from data, rounding policy on the table, provenance carried in the data; and `oneIssue`, the check that an issue's tables (the factor set's and the additional pension purchase tables) share one in-use date
- `src/gad/erf-*.ts` / `src/gad/lrf-*.ts` -- verbatim per-table transcriptions of the current GAD consolidated-workbook issue (one file per table per issue; a superseded issue's files are deleted whole). Full-table mirror fixtures in `tests/fixtures/gad-*.csv` pin every printed cell
- `src/regions.ts` -- AFC region codes (nation + HCAS), mapped both ways: each region's nation and zone, and the region for a nation and zone (`afcRegionOf`, `baseAfcRegion`)
- `src/hcas-zone.ts` -- the HCAS zone ids and the zone types, importing nothing, so every module that names a zone can without a cycle
- `src/hcas.ts` -- England's zones by pay year (`englandHcasZones`), the supplement, and `grossSalary`, which reads the zones for a region's year
- `src/hcas-pcts.ts` -- PCT-to-HCAS-zone reference data
- `src/take-home.ts` -- pre-configured TakeHomePay for NHS
- `src/format.ts` -- GBP/percentage formatting helpers
- `src/post.ts` -- immutable `Post` domain object (a salaried NHS post; derives take-home/pension/tax), built from a salary and a `PostIdentity` (nation, pay year, tax year)
- `src/role.ts` -- `Role` union stamped onto a `Post` (`AfcRole` / `MedicalRole` / `DentalRole`)
- `src/resolver.ts` -- `afcResolver` + `medicalResolver` / `dentalResolver`: build a `Post` from a scale point
- `src/circulars/*.ts` -- verbatim 1:1 transcription of each pay circular, medical/dental AND Agenda for Change (one file per PDF); `afc-shapes.ts` holds the table shapes the AfC publishers share
- `src/afc-band.ts` -- the AfC band registry (id, ordering). Its own module so `scales.ts` and `afc-scales.ts` can both name a band without forming a cycle
- `src/medical-grades.ts` / `src/dental-grades.ts` -- the doctor and salaried-dental grade registries (ids, ordering), each its own module so a module that names a grade need not import the translation layer
- `src/afc-scales.ts` -- translation layer for AfC: each nation-year's printed tables (the devolved circulars, England's page) -> canonical points and its Band 1, deriving each point's label from the publisher's own progression column
- `src/scale-tables.ts` -- canonical `(grade,nation,year) -> points` container and `gradeFamily` (every read over a medical or dental family's tables, shared by both)
- `src/scale-translators.ts` -- the verbatim->canonical row translators and row selectors the medical and dental translation layers share
- `src/medical-scales.ts` / `src/dental-scales.ts` -- translation layer: select + map circular rows to the domain
- `src/award.ts` -- pay awards per nation/year/family, each with its own source record (the exported circular sources a consumer cites, `AFC_SCOTLAND`, `AFC_W_02_2026` and the rest, live in `sources.ts`)
- `src/values.ts` -- shared values: the per-cent unit (`PER_CENT`) and value objects (`SalaryRange`, and `salaryRangeOf`, the one producer of a scale's range)
- `src/scale-point.ts` -- `ScalePoint`, the canonical pay-scale point every scale reduces to and the resolvers read, `PayLadder`, and `onlyPointLabelled`, the one-point-per-label rule every family's lookup applies; its own module because it belongs to no one pay family
- `src/document-source.ts` -- the record types for a cited document: `DocumentSource` for a dated one (with its currency against the next expected issue), `PageSource` for a publisher page that prints no date. Its own module so a scale can cite its source without a cycle through `award.ts`
- `src/sources.ts` -- every published document the library cites, one record each, across its five kinds (award instruments, scale circulars, allowance letters, scheme statements, legislation)
- `src/iso-date.ts` -- the `IsoDate` and `IsoMonth` brands, their only mints, and the conversions to and from `Date`, read by parts in the reader's own frame
- `src/pension/money.ts` -- `ProjectionMoney`, the `{nominal, real, asAt}` pair every reported figure travels as. Beside `prices.ts`, which argues the same real-versus-nominal doctrine, and outside the projection so commutation can take one without depending on the projection
- `src/working-week.ts` -- the AfC full-time week by nation and scheme year, by pay round (`afcWeeklyHours`) or by date (`afcWeekInForce`), throwing for a year no source sets; and the hours-in-a-year divisor
- `src/allowances.ts` -- AfC cash allowances paid per session (Scotland's on-call availability allowance; Wales's sleeping-in and two on-call rates), transcribed as cited constants: the publisher rounds the uplifted figure, so deriving it from the award lands a penny out
- `src/errors.ts` -- fail-loud errors a caller catches by type: absent pay data (`ScaleUnavailable` and siblings), a member with no pay to build from (`PayPathUnavailable`), service not modelled (`BenefitNotModelled`, keyed by `NOT_MODELLED`), and a read before a member's statement (`BeforeStatement`, its boundary `isBeforeStatement`)

### The three-layer data model

Three layers keep transcription reviewable against the source PDFs while the domain stays uniform: **verbatim** (`src/circulars/*`, and England's page in `src/published/england-afc.ts`) -> **translation** (`medical-scales.ts` / `dental-scales.ts` / `afc-scales.ts`) -> **canonical** (`getMedicalScales` / `getDentalScales` / `getAfcScales` + the resolvers).

**Which data gets a circular file** is a rule in the README's [AfC pay scales](README.md#afc-pay-scales) section. England has no circular, so never invent one. Each circular file transcribes every table 1:1 or records why it is skipped; the translation layer is inclusive by default (closed grades, devolved training variants, Community Dental Service). Add a new grade with one mapping line in the translation layer; add a new pay round by transcribing the new circular into `src/circulars/`. See the README's [Medical & dental pay scales](README.md#medical--dental-pay-scales) section for the public sources and scope policy.

## Relationship to paye-calc

This library is a domain layer on top of `@casomoltd/paye-calc`. It embeds NHS-specific data (pay scales, pension tiers, HCAS zones) and exposes `nhsTakeHome()` which configures paye-calc's `TakeHomePay` with NHS pension (NET basis, employer-determined rate).

paye-calc handles the generic UK tax/NI/pension maths; nhs-pay handles the NHS-specific inputs.

## Data sources

| Data              | Source                         |
| ----------------- | ------------------------------ |
| AfC pay scales    | England: the nhsemployers.org pay-scales page; Scotland, Wales, NI: their pay circulars |
| NHS pension tiers | nhsbsa.nhs.uk scheme guide     |
| Tax / NI rates    | gov.uk (via paye-calc)         |
| Wales pay letters | nhs.wales pay letters          |
| National Living Wage | paye-calc (`nationalLivingWageHourly`) |
| CARE revaluation  | HM Treasury Revaluation Orders (SIs) |
| GAD ERF/LRF factors (2015, 1995, 2008 Sections) | GAD consolidated factor workbook |
| Promotional pay index | GAD 2020 valuation assumptions summary |
| Projection oracle | A redacted ABS + its hand-built sheet |

**Every cited document has an archived copy, and [`docs/source-archive.md`](docs/source-archive.md) is the inventory** — Drive file id, class, as-at date, issuer reference, authoritative URL and retrieval date, per document. It is the ONE home for those links: a second copy of them is how a manifest and a doc drift apart. Each transcription cites its own sources beside its data, as it should; what it does not do is keep a second copy of the inventory.

Read it before replacing any source file. It carries the one operational rule that can actually break the archive: replace via Drive's *Manage versions*, never delete-and-reupload.

The **GAD factors** are transcribed verbatim in `src/gad/`, one file per table per issue, each carrying its own provenance. Their source of record is GAD's consolidated workbook, not the NHSBSA member extract: the workbook alone carries the version-control sheet that says which release last touched each table.

**Every GAD table held is checked before it is trusted**: each is checked against the workbook's *Version control* sheet and diffed cell by cell, and when that was last done is recorded in [`docs/source-archive.md`](docs/source-archive.md#gad-factors). Do both before trusting a later workbook — a table can be reissued without its number changing.

The projection oracle is a real Annual Benefit Statement (redacted) and a ten-year projection built by hand FROM it, before the ledger existed. `tests/golden-abs.test.ts` reproduces every row of that sheet to the penny, and it is the oracle precisely because it was not derived from this code — a fixture computed the same way as the implementation agrees with whatever the implementation is changed to.

## Adding a new pay round

1. Add England's new pay year to `src/published/england-afc.ts` as the page prints it, and its HCAS zones to `HCAS_ZONES` in `src/published/hcas-zones.ts`, from the NHS Employers pay-scales page; translate it with an `ENGLAND_TABLES_<year>` in `src/afc-scales.ts`, and key it with its source in `src/scales.ts`. A devolved nation's round is its circular (see [the rule](README.md#afc-pay-scales)).
2. Check whether pension tier thresholds have changed (nhsbsa.nhs.uk) and update `src/pension.ts` if so.
3. `AFC_CURRENT_YEAR` and `AFC_PREVIOUS_YEAR` follow England's table, so step 1 moves them.
4. Add new regression test rows to the CSV fixtures in `tests/fixtures/` (cross-check against the NHS Employers online calculator).
5. **Archive the circular you transcribed from**, and add its row to [`docs/source-archive.md`](docs/source-archive.md). If it REPLACES a document already there, upload it through Drive's **Manage versions** on the existing file — never delete the old one and upload the new. Delete-and-reupload mints a new file id and silently breaks every pointer we hold to it, in the manifest and in the transcription headers. The obvious action is the failing one.
6. Run `npm run check` to verify.

## Test fixtures

Regression test CSVs live in `tests/fixtures/`.

The model's oracles are not CSVs: a real, redacted Annual Benefit Statement for the 2015 Section's ledger, and an invented member worked independently for member benefits. What each is and why it can be trusted is in [`docs/how-it-works.md`](docs/how-it-works.md#checking-it).

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
- Peer dependency on `@casomoltd/paye-calc` (range in `package.json`)
- 88-char line length, `as const` typed identifiers
