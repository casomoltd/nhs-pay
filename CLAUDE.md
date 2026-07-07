# nhs-pay

NHS Agenda for Change pay library -- scales, pension tiers,
regions, HCAS, and take-home calculator.

## Commands

- `npm run check` -- lint + typecheck + knip + jscpd + test
- `npm run build` -- compile to dist/
- `npm test` -- run vitest

## Architecture

- `src/scales.ts` -- AFC pay scale data by tax year
- `src/pension.ts` -- NHS pension member tiers + the
  `PensionTiers` lookup VO + employer contribution rates
- `src/pension-projection.ts` -- 2015 CARE scheme
  projection (accrual, revaluation, commutation)
- `src/regions.ts` -- AFC region codes (nation + HCAS)
- `src/bands.ts` -- merge layer: band id + salary +
  pension (presentation copy lives in hub-site)
- `src/hcas.ts` -- HCAS zone IDs and supplement calculation
- `src/hcas-pcts.ts` -- PCT-to-HCAS-zone reference data
- `src/take-home.ts` -- pre-configured TakeHomePay for NHS
- `src/format.ts` -- GBP/percentage formatting helpers
- `src/post.ts` -- immutable `Post` domain object (a
  salaried NHS post; derives take-home/pension/tax)
- `src/resolver.ts` -- `afcResolver`: builds a `Post`
  from a published pay scale point
- `src/values.ts` -- shared value objects (`SalaryRange`)
- `src/errors.ts` -- fail-loud errors for absent pay data
  (`ScaleUnavailable`, `PensionTiersUnavailable`)

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
