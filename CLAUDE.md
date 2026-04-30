# nhs-pay

NHS Agenda for Change pay library — scales, pension tiers,
regions, HCAS, and take-home calculator.

## Commands

- `npm run check` — lint + typecheck + knip + jscpd + test
- `npm run build` — compile to dist/
- `npm test` — run vitest

## Architecture

- `src/scales.ts` — AFC pay scale data by tax year
- `src/pension.ts` — NHS pension tier types and lookup
- `src/regions.ts` — AFC region codes (nation + HCAS)
- `src/bands.ts` — merge layer: band metadata + salary + pension
- `src/hcas.ts` — HCAS zone IDs and supplement calculation
- `src/take-home.ts` — pre-configured TakeHomePay for NHS staff
- `src/format.ts` — GBP/percentage formatting helpers
- `tests/fixtures/` — regression test CSV fixtures

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
- Peer dependency on `@casomoltd/paye-calc` (>=0.5.0)
- 88-char line length, `as const` typed identifiers
