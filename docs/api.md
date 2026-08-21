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

## Revaluation (`revaluation.ts`)

| Export                   | Description                          |
| ------------------------ | ------------------------------------ |
| `IN_SERVICE_REVALUATION` | Published rates by scheme year       |
| `revaluationFor`         | Published rate for a scheme year     |
| `ACTIVE_REVAL_BONUS_PCT` | The 1.5 points added to CPI          |
| `RevaluationYear`        | One year's rate and the CPI it used  |
| `publishedInflationBetween` | CPI between two dates, by order   |
| `PublishedInflation`     | That factor, and how far it reaches  |

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
2023 issue). The rounding rules, and the order the steps apply
in, are in [`how-it-works.md`](how-it-works.md).

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
| `factorProvenance`   | Citation facts for the in-force ERF/LRF        |
|                      | table (ref, issue date, source PDF)            |

**Types:** `PensionProjectionInput` (`PensionStatementInput` |
`PensionEstimationInput`, discriminated on kind),
`PensionProjectionResult`, `ProjectionPoint`,
`ProjectionMoney`, `CommutationResult`, `FactorTableKind`,
`FactorProvenance`

Every reported figure is a pair: `ProjectionMoney` is
`{nominal, real, asAt}`, cash and today's money at the date the
figure falls on. The two come from **two runs of the model**,
neither derived from the other — see *Two runs, not one run and
a deflator* below. `accruedNow` is the balance in force at the
run date, and `todaysMoneyLedger` is the zero-inflation walk
behind every `real` reading, so a consumer showing its working
in today's money reads those rows rather than recomputing.

## Pension ledger (`pension/`)

The workings behind `projectPension`. Additive: nothing above
changes, and a consumer reads these only when it wants to show
the year-by-year record rather than the headline.

| Export               | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `buildLedger`        | Walk the scheme years into a `MemberLedger`    |
| `createPrices`       | The CPI series + the pay conversion for one run |
| `upliftsFor`         | The uplift rule for a phase — one operation    |
| `activeRatePct`      | CPI + 1.5, a negative CPI carried through      |
| `deferredRatePct`    | CPI, floored at zero (Pensions Increase)       |
| `seedFromStatement`  | Seed from a balance at a scheme year end       |
| `seedFromJoinDate`   | Seed from nothing banked, at a join date       |
| `schemeYearEndFor`   | The scheme year a date falls in                |
| `schemeYearClosedBy` | The scheme year already CLOSED by a date       |
| `schemeYearStartDate`| 1 April opening a scheme year                  |
| `schemeYearEndDate`  | 31 March closing a scheme year                 |

**Types:** `MemberLedger`, `LedgerYear`, `LedgerRequest`,
`LedgerSeed`, `AppliedUplift`, `AppliedDrawing`,
`UpliftSource`, `MemberPhase`, `Prices`, `CpiEntry`

The rules this walk implements — what a scheme year is, what an
exit date names, why there are two runs rather than a deflator,
and which assumptions are declared — are in
[`how-it-works.md`](how-it-works.md). This file stays the
reference: names, and what each one means.

## Normal pension age (`npa.ts`)

| Export             | Description                             |
| ------------------ | --------------------------------------- |
| `normalPensionAge` | 2015-scheme NPA from date of birth: SPA  |
|                    | (legislated timetable), floor 65, whole  |
|                    | years (transitional cohorts round up)    |

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
| `formatPctPrecise` | Percentage to 2dp where they carry |
|                    | signal (0.08% admin levy; 23.7%)   |
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
