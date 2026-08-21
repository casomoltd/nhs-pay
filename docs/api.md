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

### The scheme year, and what a date means

**The cycle is the scheme's own: 1 April to 31 March**, the same
one an Annual Benefit Statement closes on. A row is named by the
year it ENDS, so `schemeYearEnd: 2025` is the year running
1 April 2024 to 31 March 2025 — exactly the period a statement
marked *Updated To 31/03/2025* reports. Seed a ledger with that
statement and its figure lands on that row's close untouched.

| Helper | Answers |
| ------ | ------- |
| `schemeYearEndFor(date)` | which scheme year a date falls in |
| `schemeYearClosedBy(date)` | which scheme year had already ended |
| `schemeYearStartDate(n)` | 1 April opening scheme year `n` |
| `schemeYearEndDate(n)` | 31 March closing scheme year `n` |

**The uplift is labelled by the year it follows, not the year it
opens.** The Order labelled 2025 is applied on 6 April 2025 — the
day after scheme year 2025 closed — so it opens scheme year
**2026** and revalues everything banked up to 31 March 2025. That
off-by-one is the scheme's naming, not the library's, and it is
why a statement dated 31 March does NOT yet include that April's
increase.

The application date moved: **1 April through 2022, 6 April from
2023**, which the NHS scheme did to manage the annual-allowance
interaction. It is not the Order's commencement date and not the
Pensions Increase date — three different dates, and the table
records the one the member's pot actually moves on.

Each year is one row and the recurrence is uniform:
`closing = [opening × (1 + uplift) + earned] × factor − cash`,
where `factor` is 1 and `cash` 0 on every row but the
retirement one. The pot is revalued **first** and the year's
slice added after, so a slice earns no revaluation in the year
it is earned. Rows are frozen at construction: the ledger is a
read model, rebuilt from source on every call.

Where a rate came from lives on the CPI table — `CpiEntry.si`
is the Order that set it, or `null` where it is the caller's
assumption — and nowhere else.

### The one assumption about pay

**Pensionable pay is held FLAT IN TODAY'S MONEY.** Every year's
slice is `pensionableEarnings / 54` measured in today's money;
only its expression in each year's own cash varies. That is the
base case and the only one built — pay progression is a
deliberate non-feature, and a consumer's own assumptions drawer
states the same sentence back to the reader.

Anything that makes a slice differ from `pay / 54` in today's
money is that unbuilt feature arriving by accident. It arrived
once: quoting the figure at the statement date and holding it
flat in *real* terms from there handed the member a 5.6% real
pay rise. Two tests in `ledger.test.ts` hold the line — the
slice is identical every year, and does not move with the CPI
assumption.

**A published Order does NOT make a row known.** The two live on
separate axes and a consumer must read both:

| | `CpiEntry.si` | `LedgerYear.earningsBasis` |
| --- | --- | --- |
| answers | where the RATE came from | where the PAY came from |
| known when | an Order covers the year | the member was not accruing |

A row is fully known only when its uplift cites an Order **and**
`earningsBasis` is `none`. `earningsBasis` is never `given`
today: the library has no route to a member's actual
year-by-year pay. A statement's own earnings history would
supply one.

### A published Order needs a known base

**An Order is applied only while the balance it acts on is still
the scheme's own.** Once a slice this library guessed has
entered the balance, every uplift after it is the caller's
assumption — for the rate as well as the pay.

The case that forces it. A statement dated 31 March 2025 is
followed by the April 2025 Order, which acts on the stated
figure and so produces a result the member can still check. The
April 2026 Order is not applied, because the statement covering
2025/26 is not issued until months after it: a legislated rate
multiplied by a guessed base is precision in one term and a
guess in the other, and reads as an authority the figure has not
earned.

Consequences worth knowing before you rely on it:

- A member who has **left** keeps every published Order, because
  nothing is added after their statement and the balance never
  stops being a record.
- A member who gave **no statement** gets no published Order at
  all, since every year of theirs is estimated. In today's money
  this is worth roughly 0.2% over a decade — the CPI in the rate
  and the CPI in the ruler very nearly cancel whichever series
  they are drawn from.

### An exit date names a SCHEME YEAR, not a day

One rule, two halves, and both are deliberate simplifications:

- **The member is active for the whole scheme year their exit
  falls in**, and earns its whole `pay / 54` slice. The day of
  the month does not enter the arithmetic.
- **From that year's close the in-service rate stops.** The
  uplift is the deferred rate thereafter — CPI, floored at zero
  — so a leaver reads flat in today's money and CPI-only in
  cash.

So `accruedAtExit` reports the **closing of that scheme year**,
and is dated at it. Two exits inside one scheme year return the
same figure; 31 March and the 1 April after it do not, because
they are different years. For a mid-year leaver the date on
that figure therefore falls after the day they stopped — which
is when the year they were credited actually closed.

**The regulation is finer-grained on both counts.** Sch 9 para
3 of the 2015 Regulations pro-rates a leaver's final year by
complete months, so a member who served all twelve and left on
31 March collects the following April's in-service rate in
full, CPI + 1.5 rather than CPI; and a member leaving part-way
through a year earns only the months of pay they worked.

**Modelling either put a special case where the member cannot
see one.** Keeping the uplift made the quoted pension 1.5%
higher than the point drawn beside it on the same chart at the
same age. Keeping the pay pro-rata made the year you RETIRE in
behave unlike every other year you might leave in: retiring on
a January birthday credited nine twelfths of that year's pay,
while stopping at any 31 March credited twelve, and nothing on
screen explained the difference.

What the consumer draws instead is one line — what an Annual
Benefit Statement would report at each year end, pay held flat,
revaluation applied, no inflation. Every year on it is a whole
year.

**Retirement does NOT land on a year end.** The drawing date
is used exactly as given, to the day. Retiring on a birthday,
mid-month, or on a scheme year end are three different
questions and `projectPension` answers whichever one it is
asked: the GAD tables are printed by year AND month, and the
rounding rules (ERF up §2.3, LRF down §3.4) exist for the
part-months a date-exact answer produces.

That asymmetry with the exit rule above is deliberate. The exit
determines which scheme years ACCRUE, and the scheme accrues in
whole years, so a day inside one is a year. The retirement date
determines a FACTOR, and the factors are published by month, so
a day is a day.

**A consumer may want less precision than that, and it is
theirs to give up.** The NHS pension calculator prices
retirement in whole years from NPA, because it draws a chart
whose every point is a 31 March and a factor that moved when
you retired "on time" would be harder to follow than one that
is a little rough. It gets that by handing this function two
birthdays, which are a whole number of years apart, and it
declares the cost in its own methods: a member drawing one
notch early is charged a full year however far inside that year
their birthday sits, worth 0.0% for a March birthday and 5.1%
for an April one.

This library briefly did that snapping itself and should not
have. A library that has already thrown precision away cannot
offer it back to the next caller; the simplification belongs
where the simplifying is decided.

**The joining year is the one exception, and is not an
inconsistency.** A member joining in October earns two thirds
of that year's pay and their statement says so. There is one
join and it is handled one way; `payFor` scales the pay and
never the 1/54 divisor.

The cost is knowable and bounded, and runs in the member's
favour: one year's 1.5 points for a year-end leaver, plus the
months between a mid-year retirement and the following 31
March. `tests/golden-abs.test.ts` pins both the figures
reported and the ones deliberately not, so a regression has to
disagree with a number that is written down.

### Reading a statement back applies the SAME rule

A stated balance arrives with an uplift already inside it: a
member reading their statement in August has had that April's
revaluation applied to the figure they are looking at. To place
that figure on a year-end row the library divides the uplift
back out; the walk then multiplies it on again.

**Both halves ask one function, `phaseAt`, about one year — the
year the uplift OPENS.** Not the year that just closed. That is
the same question asked a year early, and it gives a different
answer for exactly one exit date: 31 March of the last closed
scheme year, which is the day an Annual Benefit Statement is
drawn to. Asked the early question the seed divided out
CPI + 1.5 while the walk multiplied back CPI, and the member's
own stated figure came back 1.5 points light. The sweep in
`tests/pension-projection.test.ts` walks every exit date across
each year-end boundary against four clock dates and requires the
figure to survive the round trip exactly.

**So the simplification above governs how history is READ, not
only how the future is projected** — and that is a design
limitation worth stating on its own. The exit rule treats a
member who left at a year end as deferred from that close, where
Sch 9 para 3 gives them the following April's in-service rate in
full (see *An exit date names a SCHEME YEAR, not a day*). When
such a member enters an **undated** balance — "this is what I
have now" — the library divides out CPI where the scheme applied
CPI + 1.5, so the year-end figure it RECONSTRUCTS behind their
statement lands about 1.5 points above the one their statement
actually printed. A consumer showing a year-by-year
reconciliation is showing that reconstructed row, so the two can
be compared side by side and disagree.

Worked, at the 3.8% CPI opening 2027: a member whose statement
said £3,417.21 at 31 March 2026 holds £3,598.32 by that August
under the regulation's CPI + 1.5. Hand the library that August
figure undated and it reconstructs the March row as £3,466.59 —
1.445% above the statement, being the 1.5 points scaled by the
CPI it divided out in their place.

The stated figure itself is never wrong: the same rate is undone
and redone, so it round-trips exactly, and every year after it
follows the model consistently. The gap is confined to
reconstructing what came BEFORE a figure the library was given.

**A dated statement avoids it entirely.** With `statementDate`
set to the year end the statement names, the April uplift has
not yet been applied at that date, nothing is divided out, and
the figure lands on its own row untouched. This is one more
reason to pass the date rather than let it default to `today`.

### Two runs, not one run and a deflator

`ProjectionMoney` carries `nominal` and `real`, and **neither is
derived from the other**. They are two runs of the same model:

| Reading | The run behind it |
| --- | --- |
| **nominal**, cash | the caller's `assumedCpi`: the pot grows CPI + 1.5 points a year while accruing, and pay grows with CPI |
| **real**, today's money | the same model with `assumedCpi` **zero**: the pot grows 1.5% a year while accruing, nothing once deferred, and pay is held at the figure the caller gave |

So the today's-money reading does not move when `assumedCpi` does — it is the run
in which that assumption is zero — and dividing one by the
other does not give the assumption back.

**Why not a deflator.** Dividing a CPI + 1.5 projection by CPI
leaves `1.5 / (1 + cpi)` of real growth: 1.5% at a zero
assumption, 1.47% at 2%, 1.36% at 10%. Defensible arithmetic,
and not what anyone means by ignoring inflation — a member
working it out by hand takes 1.5% a year on a flat salary and
gets a different, simpler number. The tool's own two views are
defined that way, so the library is too.

It also deletes a great deal. A deflated reading needed an
anchor date, a face-value window, and an explicit rule that a
member's stated balance must never be restated. At a zero
assumption there is nothing to restate, so that property holds
by construction. Three separate attempts at placing that anchor
each produced a defensible-looking figure that disagreed with a
real statement; this does not.

**What follows, and is worth knowing:**

- A **deferred** pension is exactly flat in today's money. Deferred
  revaluation is CPI, and the today's-money run has none.
- Two figures at the SAME date do not generally coincide. Over
  a decade of history already banked, today's money runs a
  shade ahead of cash — the 1.5-versus-1.47 residue above — so a past
  point can read slightly higher in today's money than in cash.
- The **curve is plotted on 31 March closes**, one point per
  scheme year, because that is the date a statement is drawn to.
  The x-axis stays an age: age *N* is plotted at the close of
  the scheme year *N*'s birthday falls in. Plotted at birthdays
  it landed mid-year, between an April uplift and the year's
  slice, and matched no row of any statement.
- Nothing is drawn before the ledger's own start. A member
  enters one figure, not their history, so anything earlier
  would be that figure run backwards through rates nobody
  checked.

### The years before a statement, estimated

A statement states a BALANCE, not a history. So the years from
a member's join date up to it are unknown, and were simply not
drawn — which left the join date, which the form asks for,
doing nothing.

`projectPension` now fills that gap when a statement input
carries `joinDate`, and reports it as `estimatedHistory`. It
asks what **flat pensionable pay, in today's money**, would have
produced exactly the stated balance over exactly those years,
and walks that pay forward as the illustration.

- **For plotting.** It gives the built-up arm a shape and a
  start. Drawn in the same line as the rest, because it is the
  same pension; what makes it honest is the disclosure beside
  it, not a different colour.
- **Not a reconstruction of a career.** Real earnings are not
  flat. What it gets right is the ENDPOINT, exactly, and the
  trajectory approximately.
- **Not an input to the projection.** Nothing after the
  statement reads it. Projecting a pension from a pay derived
  from that same pension would argue in a circle.
- **Null when there is nothing to draw** — a member who joined
  after the statement's own scheme year.

**Calibrated by walking, not by formula.** With flat pay, a
constant rate and whole years the closed form is
`W = 54 P (r − 1) / (rⁿ − 1)`, and that is the oracle the tests
check against. The code does not use it, because the cases it
omits are ordinary: a September join gives a seven-twelfths
first year, a pre-2015 join is clamped to the scheme's start,
and the first row of any walk carries no uplift. The ledger is
exactly LINEAR in pay, so walking it once at a pay of 1 gives
the whole accumulation factor and the answer is one division —
with no second copy of the recurrence to drift.

**Checked against a real statement, and the naive check fails.**
The estimate lands within 0.2% of a real member's career
average — but only once both are in the same money. Earnings
printed on a statement are each year's CASH, carrying that
year's pay award inside them, so averaging them raw mixes 2021
pounds with 2025 pounds:

| | four years from one statement |
| --- | --- |
| averaged raw, as printed | £40,880 |
| averaged in the statement date's money | **£45,175** |
| back-solved by this library | **£45,107** |

The raw figure reads a tenth low and looks like the estimate
overstating. It is not; it is two rulers. Both comparisons are
asserted in `tests/golden-abs.test.ts`, the wrong one included,
so it cannot be re-fallen-into.

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
