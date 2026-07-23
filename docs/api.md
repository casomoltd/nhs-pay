# @casomoltd/nhs-pay — API reference

Every export by domain, one line each. `npm run check` fails if
these tables and `src/index.ts` disagree, in either direction.
For signatures and full doc comments, read the module source or
the shipped `dist/*.d.ts`.

## Scales (`scales.ts`)

| Export                 | Description                          |
| ---------------------- | ------------------------------------ |
| `AFC_BANDS`            | Band key-to-ID mapping               |
| `AFC_BAND_IDS`         | Ordered array of all band IDs        |
| `AFC_TAX_YEARS`        | Tax years with available scale data  |
| `AFC_HOURS_PER_YEAR`   | Deprecated — use `hoursPerYear`      |
| `NLW_HOURLY`           | National Living Wage by year         |
| `WALES_LW_FLOOR`       | Welsh Government living wage floor   |
| `annualiseHourly`      | Convert hourly rate to annual salary |
| `applyWalesFloor`      | Apply Wales living wage floor        |

**Types:** `AfcBandId`, `ScalePoint`, `HcasZone`, `HcasZones`

## Bands (`bands.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getAfcScales`      | Band + scale + pension, nation-aware |
| `AFC_CURRENT_YEAR`  | Current financial year               |
| `AFC_PREVIOUS_YEAR` | Previous financial year              |

**Types:** `AfcBandMeta`, `AfcScaleData`

## Pay awards (`award.ts`)

| Export     | Description                              |
| ---------- | ---------------------------------------- |
| `afcAward` | Headline AfC award (%) for a year/nation |

## Pension (`pension.ts`)

| Export                   | Description                          |
| ------------------------ | ------------------------------------ |
| `getPensionTiers`        | Member tiers for a tax year/nation   |
| `pensionTierRate`        | Contribution rate (%) for a salary   |
| `lookupPensionTier`      | Full tier info for a salary          |
| `getPensionTiersVO`      | Tiers as a `PensionTiers` lookup VO  |
| `PensionTiers`           | Value object over one year's tiers   |
| `getEmployerPensionRate` | Employer rate + levy for a nation    |

**Types:** `PensionTier`, `EmployerPensionRate`

## Pension projection (`pension-projection.ts`)

2015 CARE scheme: accrual → revaluation → ERF/LRF → commutation.
Factors are verbatim from the GAD consolidated workbook (30 Jun
2023 issue); ERF rounds the period up to the next month, LRF
down (GAD 2019 guidance); ERF/LRF applies before commutation.

| Export               | Description                                    |
| -------------------- | ---------------------------------------------- |
| `projectPension`     | Full projection with chart curve; optional     |
|                      | `today` arg pins the evaluation date           |
| `retirementFactor`   | ERF/LRF factor for retirement vs NPA date      |
| `commute`            | Lump-sum commutation at a fraction of the max  |
| `maxLumpSum`         | Maximum tax-free lump sum (HMRC 25% rule)      |
| `yearlyAccrual`      | One year's pension accrual (pay × 1/54)        |
| `ACCRUAL_RATE`       | 1/54 CARE accrual rate                         |
| `COMMUTATION_FACTOR` | £12 lump sum per £1 pension                    |

**Types:** `PensionProjectionInput` (`PensionStatementInput` |
`PensionEstimationInput`, discriminated on kind),
`PensionProjectionResult`, `ProjectionPoint`,
`CommutationResult`, `FactorTableKind`

## Take-home (`take-home.ts`)

| Export        | Description                        |
| ------------- | ---------------------------------- |
| `nhsTakeHome` | Pre-configured TakeHomePay for NHS |

**Types:** `NhsTakeHomeOptions`

## Posts & resolvers (`post.ts`, `role.ts`, `resolver.ts`)

| Export           | Description                              |
| ---------------- | ---------------------------------------- |
| `Post`           | Immutable salaried post; derives         |
|                  | take-home, pension tier and tax          |
| `NO_ADJUSTMENTS` | Empty `PostAdjustments` for a plain post |
| `afcResolver`    | Build a `Post` from an AfC band + point  |

All resolvers implement `PayScaleResolver`
(`availableGrades` / `fromSalary` / `latestYearFor`) and fail
loud (`ScaleUnavailable`) for unpublished data.

**Types:** `PostIdentity`, `PostAdjustments`, `Role`,
`RoleKind`, `AfcRole`, `VsmRole`, `MedicalRole`, `DentalRole`,
`AfcResolver`, `MedicalResolver`, `DentalResolver`,
`NationScaleResolver`, `PayScaleResolver`, `SalaryRange`

## Medical & dental (`medical-scales.ts`, `dental-scales.ts`)

| Export                                   | Description                     |
| ---------------------------------------- | ------------------------------- |
| `getMedicalScales`                       | Doctor grades for a nation/year |
| `getDentalScales`                        | Dental grades for a nation/year |
| `medicalResolver` / `dentalResolver`     | Build a `Post` from grade+point |
| `MEDICAL_GRADES` / `DENTAL_GRADES`       | Grade id → metadata registries  |
| `MEDICAL_GRADE_IDS` / `DENTAL_GRADE_IDS` | Ordered grade id arrays         |
| `MEDICAL_TAX_YEARS` / `DENTAL_TAX_YEARS` | Years with published data       |

**Types:** `MedicalGradeId`, `DentalGradeId`,
`MedicalGradeMeta`, `DentalGradeMeta`

## HCAS (`hcas.ts`)

| Export                    | Description                 |
| ------------------------- | --------------------------- |
| `HCAS_ZONE_IDS`           | Zone key-to-ID mapping      |
| `calculateHcasSupplement` | HCAS amount for base + zone |
| `grossSalary`             | Base + Wales floor + HCAS   |
| `isHcasZoneId`            | Type guard for zone IDs     |

**Types:** `HcasZoneId`

## HCAS PCTs (`hcas-pcts.ts`)

| Export        | Description                  |
| ------------- | ---------------------------- |
| `getHcasZone` | PCT → HCAS zone lookup       |
| `getHcasPcts` | All PCTs with zone, in order |

**Types:** `HcasPct`

## Regions (`regions.ts`)

| Export                | Description                          |
| --------------------- | ------------------------------------ |
| `AFC_REGIONS`         | Region key-to-ID mapping             |
| `ZONE_TO_REGION`      | HCAS zone → AFC region mapping       |
| `resolveRegion`       | Resolve region to tax/HCAS/label     |
| `afcRegionToNation`   | Map region to paye-calc Nation       |
| `afcRegionToHcasZone` | Map region to its HCAS zone (if any) |
| `isAfcRegionId`       | Type guard for region IDs            |
| `isNation`            | Type guard for Nation strings        |

**Types:** `AfcRegionId`, `ResolvedRegion`

## Format (`format.ts`)

| Export             | Description                        |
| ------------------ | ---------------------------------- |
| `fmtSalary`        | Format exact salary (e.g. £31,049) |
| `formatGBP`        | Format GBP, no decimals            |
| `formatGBPPrecise` | Format GBP with pence              |
| `fmtMoney`         | Format rounded money               |
| `fmtPct`           | Format percentage (e.g. 8.3%)      |
| `formatPct`        | Format percentage (Intl)           |
| `yearLabel`        | Convert '2025-26' to '2025/26'     |

## Errors (`errors.ts`)

All data lookups fail loud rather than defaulting:

| Export                       | Thrown when                            |
| ---------------------------- | -------------------------------------- |
| `ScaleUnavailable`           | Unpublished nation/year/grade queried  |
| `PensionTiersUnavailable`    | No pension tiers for a year/nation     |
| `AwardUnavailable`           | No pay award for a year/nation         |
| `RetirementFactorOutOfRange` | Retirement period beyond the GAD table |

## Re-exports from paye-calc

| Export | Description |
| ------ | ----------- |
| `TAX_REGIONS`, `TAX_YEARS`, `NATIONS`, `NATION_KEYS` | Tax/nation registries |
| `TakeHomePay`, `GrossAnnual` | Take-home calculator core |
| `PensionBasis`, `PensionPercent`, `StudentLoanPlan` | Deduction enums |
| `nationToTaxRegion`, `getTaxYearConfig`, `hoursPerYear` | Helpers |

**Types:** `Nation`, `TaxRegion`, `TaxYear`
