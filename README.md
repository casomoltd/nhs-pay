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

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getScalesForYear`  | Pay scales for a given tax year      |
| `AFC_BANDS`         | Band key-to-ID mapping               |
| `AFC_BAND_IDS`      | Ordered array of all band IDs        |
| `AFC_TAX_YEARS`     | Tax years with available scale data  |
| `AFC_HOURS_PER_YEAR`| Standard AfC hours (1950)            |
| `NLW_HOURLY`        | National Living Wage by year         |
| `WALES_LW_FLOOR`    | Welsh Government living wage floor   |
| `annualiseHourly`   | Convert hourly rate to annual salary |
| `applyWalesFloor`   | Apply Wales living wage floor        |

**Types:** `AfcBandId`, `ScalePoint`, `HcasZone`,
`HcasZones`, `AfcScaleYear`

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
| `isHcasZoneId`           | Type guard for zone IDs        |

**Types:** `HcasZoneId`

### Regions (`regions.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `AFC_REGIONS`       | Region key-to-ID mapping             |
| `resolveRegion`     | Resolve region to tax/HCAS/label     |
| `afcRegionToNation` | Map region to paye-calc Nation       |
| `isAfcRegionId`     | Type guard for region IDs            |
| `isNation`          | Type guard for Nation strings        |
| `legacyHcasToRegion`| Map legacy HCAS params to regions    |

**Types:** `AfcRegionId`, `ResolvedRegion`

### Bands (`bands.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getAfcScales`      | Merged band + scale + pension data   |
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

| Data                   | Source                          |
| ---------------------- | ------------------------------- |
| AfC pay scales         | nhsemployers.org pay circulars  |
| NHS pension tiers      | nhsbsa.nhs.uk scheme guide      |
| Income tax / NI rates  | gov.uk (via paye-calc)          |
| Wales pay letters      | gov.wales pay letters           |
| National Living Wage   | gov.uk NLW announcements        |

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
