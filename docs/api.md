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
| `afcPayYears`          | Pay years one nation publishes AfC   |
|                        | scales for                           |
| `AFC_HOURS_PER_YEAR`   | Deprecated — use `hoursPerYear`      |
| `NLW_HOURLY`           | National Living Wage by year         |
| `WALES_LIVING_WAGE`    | Welsh living-wage floor: the annual  |
|                        | figure and the LWF hourly rate it is |
|                        | set against, as one published pair   |
| `annualiseHourly`      | Convert hourly rate to annual salary |

**Types:** `AfcBandId`, `ScalePoint`, `HcasZone`, `HcasZones`,
`WalesLivingWage`

## Bands (`bands.ts`)

| Export              | Description                          |
| ------------------- | ------------------------------------ |
| `getAfcScales`      | Band + scale + pension, nation-aware |
| `afcScaleSource`  | The document publishing a nation's AfC scales for a year |
| `latestAfcYear`   | The most recent AfC year a nation has published |
| `payYearLag`      | Years a nation's scales sit behind the tax year in force |
| `isAwaitingPayAward` | True while a nation still pays an older round |
| `assertPayYearLagIsSane` | Fails if any nation drifted beyond one year |
| `AFC_CURRENT_YEAR`  | Current financial year               |
| `AFC_PREVIOUS_YEAR` | Previous financial year              |

**Types:** `AfcBandMeta`, `AfcScaleData`

## ISO dates (`iso-date.ts`)

The two date precisions this library holds, kept apart by the compiler.
Both are ISO text at runtime and stay JSON-safe; the brand exists
because handing one reader the other's precision fails OPEN — it builds
an Invalid Date, every comparison against one is false, and the value
then passes every date rule downstream.

| Export         | Description                                      |
| -------------- | ------------------------------------------------ |
| `isoDate`      | The only way to mint a `YYYY-MM-DD` (shape check) |
| `isoMonth`     | The only way to mint a `YYYY-MM` (shape check)   |
| `monthOf`      | The month a date falls in — the one place a day  |
|                | is deliberately dropped                          |
| `firstOfMonth` | A month read as its first day — the one          |
|                | sanctioned widening to date precision            |
| `monthToDate`  | A `YYYY-MM` as a `Date`, on the 1st              |
| `isoToDate`    | A `YYYY-MM-DD` as a `Date`, parsed by parts      |

**Types:** `IsoDate`, `IsoMonth`

## Cited documents (`document-source.ts`, `sources.ts`)

Every published document a figure is read from, as one record each. A
consumer citing "where these figures come from" reads the record rather
than keeping its own copy of the url.

| Export                    | Description                             |
| ------------------------- | --------------------------------------- |
| `DocumentSource`          | A cited document, and the accessor that |
|                           | answers whether it is still the newest  |
|                           | one expected to exist (`currencyAt`)    |
| `AFC_ENGLAND_SCALES_2025` / `AFC_ENGLAND_SCALES_2026` | NHS Employers' AfC pay-scale pages, one per year |
| `AFC_NI_2025`             | NI AfC pay arrangements circular        |
| `AFC_SCOTLAND`            | Scottish AfC pay circular, both years   |
| `AFC_SCOTLAND_36_HOUR_WEEK` | The circular setting Scotland's       |
|                           | full-time week to 36 hours (conditions, |
|                           | not scales — it moves no salary)        |
| `AFC_W_02_2025` / `AFC_W_02_2026` | Welsh AfC pay circulars         |
| `PC_MD_1_2026_R2`         | England's medical & dental circular     |
| `PCS_DD_2025_01`          | Scotland's 2025/26 M&D circular         |
| `PCS_DD_2025_01_ADDENDUM` | Its Residents Addendum — a separate document carrying the training grades at a different uplift |
| `PCS_DD_2026_01` / `PCS_DD_2026_02` | Scotland's 2026/27 round, split across training and non-training grades |
| `MD_W_01_2025` / `MD_W_01_2026` | Welsh M&D circulars               |
| `HSC_TC8_05_2025`         | NI's medical & dental circular          |

**Types:** `DocumentSourceFields`, `SourceCurrency`

Three kinds of document live here and the difference is load-bearing:
the instrument that ENACTED an award, the circular that PUBLISHES a pay
scale, and the letter that sets an allowance. They diverge in every
nation — England's 2026-27 medical award was enacted by a written
ministerial statement while its salaries are printed in a Pay &
Conditions circular — so a pay table must cite the scale circular, not
the award's source. Reach one by navigation: `post.scaleSource`, a
`GradeMeta`'s `source`, an `AfcBandMeta`'s `source`, or
`afcScaleSource(year, nation)`.

`url` is always the publisher's own link. Archived copies are
inventoried in `docs/source-archive.md`, which is their one home.

## Pay awards (`award.ts`)

| Export           | Description                                     |
| ---------------- | ----------------------------------------------- |
| `afcAward`       | The AfC award for a year/nation (throws if none)|
| `awardsFor`      | Awards touching a pay scale, newest year first  |
| `changesFor`     | Awards AND agreed-but-unstated changes, newest  |
| `AWARD_FAMILIES` | The staff groups an award is announced for      |

**Types:** `AwardFamily`, `ForthcomingChange`,
`PayAward`, `PayChange`, `PayScaleId`

An award record is self-describing — it carries its nation, year
and family, the instrument that enacted it, and the scales it
covers — so a consumer cites provenance rather than hand-typing
it. A `Post` reaches its own award with `post.award`, which needs
no argument.

A `ForthcomingChange` is a change agreed but not yet expressible as
a percentage — an accepted offer, a contract replacement. It carries
no `pct` by design, so a consumer cannot render a figure the source
never stated; the magnitude stays prose beside the cited instrument
until a circular makes it a `PayAward`.

## AfC allowances (`allowances.ts`)

| Export                            | Description                        |
| --------------------------------- | ---------------------------------- |
| `sessionAllowance`                | One named per-session allowance    |
|                                   | for a tax year                     |
| `afcSessionAllowances`            | Every per-session allowance for a  |
|                                   | nation and year                    |
| `SESSION_ALLOWANCES`              | Per-session allowance identifiers  |

**Types:** `SessionAllowance`, `SessionAllowanceId`

A flat cash payment per on-call session, uplifted by the same award
as the scales but published as a rounded cash figure, so it is
transcribed rather than derived. The lookup returns `undefined`
where no AfC instrument setting one has been transcribed — which is
not the same as none being payable: the medical & dental circulars
set an allowance of the same name, annual by nodal point, which this
AfC lookup does not answer for. Sleep-in payments are not modelled —
Scotland's circular is silent on them.

## Revaluation (`revaluation.ts`)

| Export                   | Description                          |
| ------------------------ | ------------------------------------ |
| `IN_SERVICE_REVALUATION` | Published rates by scheme year       |
| `revaluationFor`         | Published rate for a scheme year     |
| `ACTIVE_REVAL_BONUS_PCT` | The 1.5 points added to CPI          |
| `RevaluationYear`        | One year's rate and the CPI it used  |

These are the scheme's published record. Whether a projection
ever reads them — it does not — is
[*A projection never applies a published Order*](how-it-works.md#a-projection-never-applies-a-published-order).

## Pension (`pension.ts`)

| Export                   | Description                          |
| ------------------------ | ------------------------------------ |
| `getPensionTiers`        | Member tiers for a tax year/nation   |
| `pensionTierRate`        | Contribution rate (%) for a salary   |
| `lookupPensionTier`      | Full tier info for a salary          |
| `getPensionTiersVO`      | Tiers as a `PensionTiers` lookup VO  |
| `PensionTiers`           | Value object over one year's tiers   |
| `getEmployerPensionRate` | Employer rate + levy for a nation    |
| `getPensionScheme`       | Nation's scheme + its member-rate    |
|                          | citation for a year                  |

**Types:** `PensionTier`, `EmployerPensionRate`, `NhsPensionScheme`

## Pension projection (`pension-projection.ts`)

2015 CARE scheme: accrual → revaluation → ERF/LRF. Factors are
verbatim from the GAD consolidated workbook (30 Jun 2023 issue).
The rounding rules, and the order the steps apply in, are in
[`how-it-works.md`](how-it-works.md). Commutation is **not** a
stage of the projection — it has its own section below.

| Export               | Description                                    |
| -------------------- | ---------------------------------------------- |
| `projectPension`     | Full projection with chart curve; optional     |
|                      | `today` arg pins the evaluation date           |
| `retirementFactor`   | ERF/LRF factor for retirement vs NPA date      |
| `yearlyAccrual`      | One year's pension accrual (pay × 1/54)        |
| `ACCRUAL_RATE`       | 1/54 CARE accrual rate                         |
| `factorProvenance`   | Citation facts for the in-force ERF/LRF        |
|                      | table (ref, issue date, source PDF)            |

**Types:** `PensionProjectionInput` (`PensionStatementInput` |
`PensionEstimationInput`, discriminated on kind),
`PensionProjectionResult`, `ProjectionPoint`,
`ProjectionMoney`, `FactorTableKind`, `FactorProvenance`

The result carries the `Prices` the run used. Convert an
EXTERNAL figure into these rulers through it — `prices.valueAt`
— so the conversion uses the assumption the pension was actually
projected at. Do not pass a figure the projection already
reports through it: those arrive in both rulers already.

## Commutation (`commutation.ts`)

Exchanging annual pension for a tax-free lump sum, and the caps
on it. A choice taken AT retirement, on a pension the projection
has already produced — nothing in the projection calls into it.

The permitted maximum is the **lower of two limbs**, and both
are statutory: the 25%-of-capital-value rule, and the Lump Sum
Allowance. The scheme's only contribution here is the 12:1 rate.
Which one binds, and why the allowance is applied to the
today's-money figure, is in
[`how-it-works.md`](how-it-works.md#the-two-caps-on-tax-free-cash).

| Export               | Description                                    |
| -------------------- | ---------------------------------------------- |
| `commute`            | Commutation at a fraction of the permitted     |
|                      | maximum, reported in both rulers, with each    |
|                      | ruler's limit and which limb set it            |
| `COMMUTATION_FACTOR` | £12 lump sum per £1 pension — the **only** NHS |
|                      | rule here; the rest are statutory              |
| `HMRC_LUMP_SUM_CAP_PCT` | 25 — the share of benefits HMRC lets you    |
|                      | take tax free                                  |
| `VALUATION_FACTOR`   | 20 — capital value is 20 × annual pension      |
| `LUMP_SUM_ALLOWANCE` | 268275 — the absolute cap, frozen in law       |
| `LUMP_SUM_CAPS`      | The two limbs, as typed keys                   |
| `nhsCommutationLimits` | The NHS binding of `CommutationLimits` —     |
|                      | the scheme's rate with the statutory           |
|                      | allowance, dated at the run's own anchor       |

**Types:** `CommutationResult`, `CommutationLimits`,
`LumpSumLimit`, `LumpSumLimits`, `LumpSumCap`, `DatedAmount`

`CommutationLimits.prices` is the `Prices` the projection hands
back on its result — not a loose rate. A bare number would be a
second producer of the run's assumption, so nothing would stop a
caller projecting at 2% and commuting at 3%.

`commute` takes a `ProjectionMoney`, not a bare number, so the
ruler travels with the money: the allowance is a cash amount
tested on a date, and a dateless figure cannot say which ruler
it is in. Every field of `CommutationLimits` is **required** —
each selects which answer you get, so a default would return a
plausible-but-wrong figure to a caller who omitted it.

An NHS caller should not assemble that record by hand. Call
`nhsCommutationLimits(result.prices)`: required fields stop one
being omitted, but nothing stops several call sites each pairing
the constants their own way, and the allowance has to be dated at
the anchor of the very prices that will convert it.

The result carries **two** `LumpSumLimit`s, one per ruler, not a
single "which cap bound" flag. The rulers can genuinely disagree:
`real` is the model run at zero CPI while the allowance is
carried forward at CPI, so around the crossover the allowance
binds in today's money while the scheme limb still binds in cash.
Show the limit belonging to the ruler on screen.

The solver itself is not exported. It works in one ruler at a
time, so its money arguments are bare numbers — putting that on
the public API would reintroduce the ruler-less figure that
`DatedAmount` exists to prevent.

Every reported figure is a pair: `ProjectionMoney` is
`{nominal, real, asAt}`, cash and today's money at the date the
figure falls on. The two come from **two runs of the model**,
neither derived from the other — see
[*Two rulers, one model*](how-it-works.md#two-rulers-one-model).
`accruedNow` is the balance in force at the
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
| `createPrices`       | The assumed rate + the pay conversion, one run |
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
`UpliftSource`, `MemberPhase`, `Prices`, `CpiEntry`,
`CpiSource`, `EstimatedHistory`

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

The types below are the surface of a domain model set out in
[`pay-frameworks.md`](pay-frameworks.md): what a framework is,
why `Role` is discriminated by it, and where the library stops
and the consumer begins. This section lists the exports; that
one says why they are shaped this way.

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
| `latestMedicalSource`                    | Newest M&D document a nation has published |
| `getDentalScales`                        | Dental grades for a nation/year |
| `medicalResolver` / `dentalResolver`     | Build a `Post` from grade+point |
| `MEDICAL_GRADES` / `DENTAL_GRADES`       | Grade id → metadata registries  |
| `MEDICAL_GRADE_IDS` / `DENTAL_GRADE_IDS` | Ordered grade id arrays         |
| `MEDICAL_PAY_YEARS` / `DENTAL_PAY_YEARS` | Years with published data       |

**Types:** `MedicalGradeId`, `DentalGradeId`,
`MedicalGradeMeta`, `DentalGradeMeta`

## HCAS (`hcas.ts`)

| Export                    | Description                 |
| ------------------------- | --------------------------- |
| `HCAS_ZONE_IDS`           | Zone key-to-ID mapping      |
| `calculateHcasSupplement` | HCAS amount for base + zone |
| `grossSalary`             | Base + HCAS supplement      |
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
| `AmbiguousScalePoint` | A point label matched more than one point |
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

**Types:** `Nation`, `TaxRegion`, `TaxYear`, `PayYear`, `YearLabel`

`TaxYear` and `PayYear` are the same four labels carrying different
meanings — the year whose tax rules apply, and the year whose pay scale
a salary was published on. They are separate types because a nation
whose award is not yet in payment is on one year for pay and another
for tax, and one value used for both misprices the deductions.
`YearLabel` is the unbranded union that keys lookup tables; the two
branded types are for signatures and fields.
