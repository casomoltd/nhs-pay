# @casomoltd/nhs-pay

NHS Agenda for Change pay scales, pension tiers, regions,
HCAS supplements, and take-home calculator. Built on top of
`@casomoltd/paye-calc`.

## Install

```bash
npm install @casomoltd/nhs-pay
```

Published to GitHub Packages. Add to your `.npmrc`:

```
@casomoltd:registry=https://npm.pkg.github.com
```

Requires `@casomoltd/paye-calc` (>=0.5.0) as a peer
dependency.

## Usage

### Look up a band's salary range

```ts
import {getAfcScales} from '@casomoltd/nhs-pay';

const {bands} = getAfcScales();
const band5 = bands.find((b) => b.band === '5')!;
console.log(band5.salaryMin); // entry salary
console.log(band5.salaryMax); // top of band
console.log(band5.points);    // all pay points
```

### Calculate take-home for a Band 5 nurse

```ts
import {
  nhsTakeHome,
  getAfcScales,
  pensionTierRate,
} from '@casomoltd/nhs-pay';

const {bands, pensionTiers} = getAfcScales();
const band5 = bands.find((b) => b.band === '5')!;
const salary = band5.salaryMin;
const rate = pensionTierRate(salary, pensionTiers);

const thp = nhsTakeHome(salary, rate / 100);
console.log(thp.net);               // annual net
console.log(thp.incomeTax);          // annual tax
console.log(thp.nationalInsurance);  // annual NI
console.log(thp.pensionDeduction);   // annual pension
```

### Apply HCAS supplement

```ts
import {
  getAfcScales,
  calculateHcasSupplement,
} from '@casomoltd/nhs-pay';

const {bands, hcas} = getAfcScales();
const base = bands[0].salaryMin;
const supplement = calculateHcasSupplement(
  base, hcas.innerLondon,
);
console.log(base + supplement); // London-adjusted
```

### Format salary for display

```ts
import {fmtSalary, fmtPct} from '@casomoltd/nhs-pay';

fmtSalary(31049); // '£31,049'
fmtPct(8.3);      // '8.3%'
```

## API reference

### Scales (`scales.ts`)

| Export                 | Description                          |
| ---------------------- | ------------------------------------ |
| `AFC_BANDS`            | Band key-to-ID mapping               |
| `AFC_BAND_IDS`         | Ordered array of all band IDs        |
| `AFC_TAX_YEARS`        | Tax years with available scale data  |
| `AFC_HOURS_PER_YEAR`   | Standard AfC hours (1950)            |
| `NLW_HOURLY`           | National Living Wage by year         |
| `WALES_LW_FLOOR`       | Welsh Government living wage floor   |
| `annualiseHourly`      | Convert hourly rate to annual salary |
| `applyWalesFloor`      | Apply Wales living wage floor        |

**Types:** `AfcBandId`, `ScalePoint`, `HcasZone`,
`HcasZones`

### Pension (`pension.ts`)

| Export              | Description                        |
| ------------------- | ---------------------------------- |
| `getPensionTiers`   | Pension tiers for a tax year       |
| `pensionTierRate`   | Contribution rate (%) for a salary |
| `lookupPensionTier` | Full tier info for a salary        |

**Types:** `PensionTier`

### HCAS (`hcas.ts`)

| Export                   | Description                    |
| ------------------------ | ------------------------------ |
| `HCAS_ZONE_IDS`          | Zone key-to-ID mapping         |
| `calculateHcasSupplement`| HCAS amount for base + zone    |
| `grossSalary`            | Base + Wales floor + HCAS      |
| `isHcasZoneId`           | Type guard for zone IDs        |

**Types:** `HcasZoneId`

### HCAS PCTs (`hcas-pcts.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getHcasZone`       | PCT → HCAS zone lookup               |
| `getHcasPcts`       | All PCTs with zone, in order         |

**Types:** `HcasPct`

### Regions (`regions.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `AFC_REGIONS`       | Region key-to-ID mapping             |
| `ZONE_TO_REGION`    | HCAS zone → AFC region mapping       |
| `ZONE_LABELS`       | HCAS zone → display label            |
| `resolveRegion`     | Resolve region to tax/HCAS/label     |
| `afcRegionToNation` | Map region to paye-calc Nation       |
| `isAfcRegionId`     | Type guard for region IDs            |
| `isNation`          | Type guard for Nation strings        |

**Types:** `AfcRegionId`, `ResolvedRegion`

### Bands (`bands.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getAfcScales`      | Band + scale + pension, nation-aware |
| `AFC_BAND_INFO`     | Static band metadata (roles, slugs)  |
| `AFC_CURRENT_YEAR`  | Current financial year               |
| `AFC_PREVIOUS_YEAR` | Previous financial year              |

**Types:** `AfcBandInfo`, `AfcBandMeta`, `AfcScaleData`

### Take-home (`take-home.ts`)

| Export         | Description                           |
| -------------- | ------------------------------------- |
| `nhsTakeHome`  | Pre-configured TakeHomePay for NHS    |

### Format (`format.ts`)

| Export            | Description                         |
| ----------------- | ----------------------------------- |
| `fmtSalary`       | Format exact salary (e.g. £31,049)  |
| `formatGBP`       | Format GBP, no decimals             |
| `formatGBPPrecise` | Format GBP with pence              |
| `fmtMoney`        | Format rounded money                |
| `fmtPct`          | Format percentage (e.g. 8.3%)       |
| `formatPct`       | Format percentage (Intl)            |
| `yearLabel`       | Convert '2025-26' to '2025/26'      |

### Re-exports from paye-calc

`TAX_REGIONS`, `TAX_YEARS`, `NATIONS`, `NATION_KEYS`,
`TakeHomePay`, `GrossAnnual`, `PensionBasis`,
`PensionPercent`, `StudentLoanPlan`, `nationToTaxRegion`,
and types `Nation`, `TaxRegion`, `TaxYear`.

## Data sources

### AfC pay scales

| Year    | Nations              | Source |
| ------- | -------------------- | ------ |
| 2025-26 | England, NI, Wales   | [NHS Employers pay scales 2025/26][scales-2526] |
| 2026-27 | England, NI          | [NHS Employers pay scales 2026/27][scales-2627] |

Cross-checked against [NHSPRB 39th Report (2026)][nhsprb-39],
Table A25 (AfC 2025/26 data for England, NI, Wales).

[scales-2526]: https://www.nhsemployers.org/articles/pay-scales-202526
[scales-2627]: https://www.nhsemployers.org/articles/pay-scales-202627
[nhsprb-39]: https://assets.publishing.service.gov.uk/media/698df41175466636847f6a93/NHSPRB_39th_Report_2026.pdf

### Scotland

Scotland negotiates its own AfC award independently and
has completely different base salaries from England.
Separate scale tables are stored for each tax year —
`getAfcScales(year, 'scotland')` returns Scotland figures
directly. Scotland also has structural differences: Band 2
has 2 points (vs 1 in England) and Bands 8a–9 have 2
points each (vs 3).

Source: [PCS(AFC)2026/1][scot-circular] — Scottish Health
Workforce Directorate circular (23 Jan 2026). Full pay
tables: [MSG Scotland AfC pay scales 2025-26 and 2026-27][scot-scales].

[scot-circular]: https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf
[scot-scales]: https://www.msg.scot.nhs.uk/wp-content/uploads/AfC-Pay-Scales-2025-26-and-2026-27.pdf

### Wales

The Welsh Government applies a Living Wage Foundation floor
as an advance uplift. Spine points below the floor are
lifted to it. Source: [AfC(W) 01/2026][wales-circular]
pay letter (6 Jan 2026).

[wales-circular]: https://www.nhs.wales/files/pc-resources/2026-afc-1-2026-living-wage-pdf-pdf/

### Other data

| Data                   | Source |
| ---------------------- | ------ |
| Pension contribution rates 2025/26 | [NHSBSA contribution rates][pension-2526] |
| Income tax / NI rates  | gov.uk (via paye-calc) |
| National Living Wage   | [gov.uk NLW rates][nlw] |
| HCAS PCT zones         | NHS Employers Annex 8 Table 12 |

[pension-2526]: https://www.nhsbsa.nhs.uk/nhs-pensions-contribution-rates-202526
[nlw]: https://www.gov.uk/national-minimum-wage-rates

## Test fixtures

`tests/fixtures/band-take-home.csv` — 90 golden-value rows
covering bands 5, 7, 8a across all 4 nations (England,
Scotland, Wales, NI), both tax years, 3 HCAS zones, and
part-time (0.6 FTE). Gross figures are derived from
`getAfcScales(year, nation)` using the sources above.
Pension, tax, NI and net values are computed by
`nhsTakeHome` and should be cross-checked against:

- [NHS Employers pay scales 2025/26][scales-2526] and
  [2026/27][scales-2627] for England/NI/Wales gross
- [MSG Scotland AfC pay scales][scot-scales] for Scotland
  gross
- [NHSBSA pension contribution rates 2025/26][pension-2526]
  for pension tier rates

## Tax years

| Year    | Scales | Pension |
| ------- | ------ | ------- |
| 2023-24 | Yes    | Yes     |
| 2024-25 | Yes    | Yes     |
| 2025-26 | Yes    | Yes     |
| 2026-27 | Yes    | Yes     |

## Development

```bash
npm run check       # lint + typecheck + knip + jscpd + test
npm run build       # compile to dist/
npm test            # vitest
npm run test:watch  # vitest watch mode
```

## License

LGPL-3.0-only
