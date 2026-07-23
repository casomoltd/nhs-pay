# nhs-pay

NHS Agenda for Change pay library -- scales, pension tiers,
regions, HCAS, and take-home calculator.

## Commands

- `npm run check` -- lint + typecheck + knip + jscpd + api-docs
  drift gate + test
- `npm run build` -- compile to dist/
- `npm test` -- run vitest

## API docs

`docs/api.md` is the hand-maintained API reference: per-domain
tables of every export with a one-line description.
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
  (accrual, revaluation, GAD ERF/LRF retirement factors +
  rounding, commutation, chart curve)
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
- `src/values.ts` -- shared value objects (`SalaryRange`)
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
See the README's *Medical & dental pay scales* section for the
public sources and scope policy.

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
| Wales pay letters | gov.wales pay letters          |
| National Living Wage | gov.uk NLW announcements    |

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
5. Run `npm run check` to verify.

## Test fixtures

Regression test CSVs live in `tests/fixtures/`.

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
- Peer dependency on `@casomoltd/paye-calc` (>=0.5.0)
- 88-char line length, `as const` typed identifiers
