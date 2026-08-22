# How it works

The scheme's rules as embodied in code. Two obligations follow:
**every rule names the instrument that makes it**, and **every
departure names itself** — with what it costs and who it hits.
A simplification a reader cannot see is indistinguishable from
an error.

Every rule below carries the instrument that makes it. They are
inventoried, with links and archived copies, in
[`source-archive.md`](source-archive.md). Where two documents
disagree the one that ENACTS the figure wins and the other is
kept as a check — which is why the Orders set the rate and the
valuation report is read beside them rather than instead. A few
are marked **not archived**: a gap recorded rather than papered
over, since a rule whose instrument nobody kept is a rule on
trust.

For what is exported and what each name means, see
[`api.md`](api.md).

## Scope

**Covered.** The 2015 CARE section, for a member whose pension
is built from pensionable pay: accrual at 1/54, revaluation in
service and in deferment, early and late retirement factors,
commutation with the HMRC cap.

**Not covered.** The 1995 and 2008 sections; practitioner
accrual, which is earnings-based rather than salary-based;
added pension, AVCs, ill health, death benefits, partial
retirement; annual-allowance and lifetime-allowance tax. Absent
is not refused.

## Definitions and key dates

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
assumption — and nowhere else. On a projected row it is always
`null`; only the record itself reads an Order.

Every figure the model turns on, with the name the code holds it
under and the instrument it comes from.

| The rule | What it is | The instrument |
| --- | --- | --- |
| Accrual | 1/54 of pensionable pay — `ACCRUAL_RATE` | NHSBSA 2015 Members' Guide (V13) |
| Normal pension age | state pension age, with a floor of 65 | NHSBSA 2015 Members' Guide (V13) |
| In-service revaluation | CPI + 1.5 points — `ACTIVE_REVAL_BONUS_PCT` | NHS 2015 Scheme design document **(not archived)**; the +1.5 as an ADDITION to prices, SI 2015/94 Schedule 9 paragraph 3 |
| In-service revaluation date | **1 April** to 2022, **6 April** from 2023 | HM Treasury HCWS437, quoted below |
| Deferred, and in payment | CPI, floored at zero | NHS 2015 Scheme design document **(not archived)** |
| Pensions Increase date | 6 April — a different instrument, and a different date | Pensions Increase (Review) Orders under s.59 Social Security Pensions Act 1975, with HM Treasury's multiplier tables |
| The CPI figure, year by year | the rate as ACTUALLY applied, from April 2016 | HM Treasury Public Service Pensions Revaluation Orders under s.9(2) Public Service Pensions Act 2013, one SI a year **(not archived: an SI number resolves on legislation.gov.uk, the one link class that does not move)** — read beside the NHS Pension Scheme Valuation Report 2020, Appendix E |
| Retirement factors | by date, to the month | GAD's consolidated factor workbook; the rounding, ERF up and LRF down, from GAD's 2019 factors-and-guidance note **(not archived)** |
| Commutation | £12 of lump sum per £1 given up — `COMMUTATION_FACTOR` | NHSBSA Key Notes, 2015 Scheme Estimates (V2) **(not archived)** |
| HMRC cap on the lump sum | 25% | NHSBSA Key Notes, 2015 Scheme Estimates (V2) **(not archived)** |

The 6 April move is the scheme's, not the Order's. HCWS437: the
effective date listed in the order is 1 April, "but some schemes
have chosen to move their effective revaluation date to 6 April
2025 in order to manage interactions with the annual tax
allowance". The Order's own commencement is a third date and is
not used.

### Retirement does not land on a year end

The drawing date is used exactly as given, to the day. Retiring
on a birthday, mid-month, or on a year end are three different
questions and `projectPension` answers whichever it is asked:
GAD's consolidated factor workbook prints by year AND month, and
its rounding rules (ERF up §2.3, LRF down §3.4, from GAD's 2019
factors-and-guidance note) exist for the part-months a
date-exact answer produces.

The asymmetry with the exit rule is deliberate. An exit decides
which years ACCRUE, and the scheme accrues in whole years, so a
day inside one is a year. A retirement date decides a FACTOR,
and factors are published by month, so a day is a day.

A consumer may want less precision and it is theirs to give up
— the calculator prices retirement in whole years from NPA and
declares that cost in its own methods, worth 0.0% for a March
birthday and 5.1% for an April one. The simplifying belongs
there rather than here: a library that has thrown precision
away cannot offer it back to the next caller.

## The model

### The ledger

**One row per scheme year, walked forward from a seed.** Every
figure reported — the headline, each chart point, each
reconciliation row — is read off it, so they cannot disagree.

A row:

| Field | |
| --- | --- |
| `schemeYearEnd` | the key: 2026 is the year ending 31 March 2026 |
| `phase` | `active`, `deferred` or `inPayment` |
| `opening` | last year's closing |
| `uplift` | applied at the START, to the whole opening |
| `revalued` | `opening x (1 + uplift)` |
| `earned` | this year's slice: pay x `ACCRUAL_RATE` |
| `drawing` | the retirement transform, on one row only |
| `closing` | `(revalued + earned) x factor - pension given up` |

##### What happens in a year

1. **Phase** — `active` up to and including the exit year,
   `deferred` until the drawing year, `inPayment` after. Read
   from two dates; never stored, so it cannot go stale.
2. **Rule** — the phase picks the rate. Active takes CPI + 1.5;
   after that, CPI floored at zero.
3. **Revalue** — the whole opening moves by that rate.
4. **Add** — this year's slice, `pay x 1/54`. It earns no
   revaluation in the year it is earned.
5. **Draw** — retirement year only: the early or late factor,
   then any commutation.
6. **Close** — the result is this row's `closing`, and next
   year's `opening`.

Steps 3 and 4 in that order are the whole model:

```
closing(N) = closing(N-1) x (1 + uplift) + earned(N)
```

Revalue first, add second. The other order overstates a real
statement by 3.2% and no internal test catches it; the one that
does is `golden-abs.test.ts`, which checks against a statement.

##### The shape of a run

```mermaid
graph TD
  SRC(["a stated balance at a year end,<br/>OR a join date"])
  DATES(["dateOfBirth, npa,<br/>exitDate, retirementDate"])
  SEED["SEED opening balance, and the year it sits at"]
  SPAN["SPAN the year after the seed,<br/>to past NPA and retirement"]

  subgraph LOOP["for each scheme year"]
    Y["1 phase &rarr; 2 rule &rarr; 3 revalue<br/>&rarr; 4 add slice &rarr; 5 draw &rarr; 6 close"]
  end

  ERR{{"a year inside membership<br/>with no CPI rate?"}}
  THROW["throw&nbsp;&mdash; never a silent zero"]
  OUT(["the ledger: one row per year"])

  SRC --> SEED --> SPAN --> Y
  DATES --> SPAN
  Y --> ERR
  ERR -->|yes| THROW
  ERR -->|no| OUT
```

Every decision sits before the loop and is a pure function of
dates. The walk applies what it is handed.

**It is a read model.** `closingAt` takes a scheme year;
`atDate` and `accruedAt` take a day and answer from the row that
owns it. Nothing is stored between calls.

**Worked example.** A projection built by hand from that
statement before this code existed; `tests/golden-abs.test.ts`
reproduces every row to the penny. Linked from the
`benefit-statements` row of
[`source-archive.md`](source-archive.md#sa-19).

### Two rulers, one model

`ProjectionMoney` carries `nominal` and `real`, and **neither is
derived from the other**. They are two runs of the same model:

| Reading | The run behind it |
| --- | --- |
| **nominal**, cash | the caller's `assumedCpi`: the pot grows CPI + 1.5 points a year while accruing, and pay grows with CPI |
| **real**, today's money | the same model with `assumedCpi` **zero**: the pot grows 1.5% a year while accruing, nothing once deferred, and pay is held at the figure the caller gave |

So the today's-money reading does not move when `assumedCpi` does — it is the run
in which that assumption is zero — and dividing one by the
other does not give the assumption back.

Both readings hold on EVERY year of the walk, the first
included. That takes a rule of its own, because a single nominal
rate inside the zero run would break the second of them: see
*A projection never applies a published Order*.

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
by construction.

**What follows, and is worth knowing:**

- A **deferred** pension is exactly flat in today's money, from
  its first row on. Deferred revaluation is CPI, and the
  today's-money run has none — not even the year the member's
  statement was drawn to.
- Two figures at the SAME date do not generally coincide. Over
  a decade of history already banked, today's money runs a
  shade ahead of cash — the 1.5-versus-1.47 residue above — so a past
  point can read slightly higher in today's money than in cash.
- The **curve is plotted on 31 March closes**, one point per
  scheme year, because that is the date a statement is drawn to.
  The x-axis stays an age: age *N* is plotted at the close of
  the scheme year *N*'s birthday falls in. Plotted at birthdays
  a point lands mid-year, between an April uplift and the year's
  slice, and matches no row of any statement.
- Nothing is drawn before the ledger's own start. A member
  enters one figure, not their history, so anything earlier
  would be that figure run backwards through rates nobody
  checked.

### Where a run starts

The walk begins at a **seed**: either a balance a member read
off a statement, which sits at a scheme year end, or a join
date with nothing banked.

On the statement path the years BEFORE that balance are
illustrated rather than known — a statement states a balance,
not a history. That estimate is calibrated to land exactly on
the stated figure, nothing after the statement reads it, and it
is not an input to the projection. The reasoning, and why a
walk at a pay of 1 does the calibration rather than a formula,
is at the code: see `src/pension/history.ts`.

## Assumptions

Each is a place the model is simpler than the
instrument behind it. Each says what it costs.

### The member gets no REAL pay rise

The assumption is about pay growth, not about pay. Pensionable
pay keeps pace with CPI and no more: no promotion, no band
progression, no award above inflation. Career progression is a
deliberate non-feature, and a known gap:
[issue #11](https://github.com/casomoltd/nhs-pay/issues/11)
carries what a build would take and what the assumption costs.

That reads differently in each ruler, from the same
`assumedCpi`, which is why this and the cash/today's-money
switch are one assumption in two controls rather than two:

| | year 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| cash, CPI 2% | 55,080 | 56,182 | 57,305 | 58,451 |
| today's money | 54,000 | 54,000 | 54,000 | 54,000 |

So "pay held flat" is true of today's money and false of cash,
where pay rises at exactly the CPI assumption. Every year's
slice is `pay / 54` **in today's money**; only its expression in
each year's own pounds varies.

Anything that makes a slice differ from that is the unbuilt
feature arriving by accident: quote the figure at the statement
date and hold it flat in *real* terms from there, and the member
collects a 5.6% real pay rise. Two tests in
`ledger.test.ts` hold the line — the slice is identical every
year, and does not move with the CPI assumption.

**No projected row is the scheme's own record.** Two fields
answer two different questions, and a consumer reading either as
the other will overstate what it has:

| | `CpiEntry.si` | `LedgerYear.earningsBasis` |
| --- | --- | --- |
| answers | where the RATE came from | where the PAY came from |
| on a projected row | always `null` — the assumption | `assumed` wherever anything was earned |

So `earningsBasis` is the only knownness a row carries, and it
is never `given` today: the library has no route to a member's
actual year-by-year pay. A statement's own earnings history
would supply one. The last figure that IS the scheme's own is
the seed, and the library hands that back untouched.

### An exit date names a scheme year, not a day

- **The member is active for the whole scheme year their exit
  falls in**, and earns its whole `pay / 54` slice. The day of
  the month does not enter the arithmetic — `schemeYearEndFor`
  discards it before the walk begins.
- **From that year's close the in-service rate stops** — the
  deferred rate thereafter, so a leaver reads flat in today's
  money.

So `accruedAtExit` is that year's closing, dated at it. Two
exits inside one scheme year give the same figure; 31 March and
the 1 April after it do not.

**The regulation is finer-grained.** SI 2015/94 Schedule 9
paragraph 3 pro-rates a leaver's final year by complete months,
and gives a member who served all twelve and leaves on 31 March
the following April's in-service rate in full — CPI + 1.5, not
CPI.

**This is the one place the library simplifies on a consumer's
behalf, and it is the wrong way round.** Every other precision
decision here runs the other way: retirement is date-exact, and
a consumer wanting whole years gets them by passing two
birthdays. The exit rule takes that choice away — no caller can
reach Schedule 9 accuracy, because the day is gone before the
walk starts. Recorded as
[issue #12](https://github.com/casomoltd/nhs-pay/issues/12).

**The joining year is not an inconsistency.** A member joining
in October earns two thirds of that year's pay and their
statement says so. `payFor` scales the pay, never the 1/54
divisor — and that is the only year it scales.

**The two errors pull opposite ways, so neither is cautious.** A
mid-year leaver is credited pay they did not earn, up to eleven
months of it, and reads high. A year-end leaver loses the April
in-service rate the regulation gives them, worth 1.5 points on
the whole balance, and reads low. Which one a member meets
depends on their exit date.
`tests/golden-abs.test.ts` pins the figures reported and the
ones deliberately not, so a change here has to disagree with a
number that is written down.

### A projection never applies a published Order

**There is one rate after the seed and it is the caller's
assumption.** Every uplift, every year: for a year the
Revaluation Orders plainly cover as readily as one they do not,
for the row acting on a member's own stated figure as readily as
one built on a guessed slice, and for a member who left a decade
ago as readily as one still paying in.

**An Order is a NOMINAL rate**, and today's money is this same
model at an assumption of zero (see *Two rulers, one model*), so
an Order applied inside that run puts a whole year of CPI into a
reading defined to contain none. Measured on one member and one
£10,000 figure, varying only the statement they type in:

| Statement entered | The first uplift it would take |
| --- | --- |
| 31 Mar 2024 | 8.20% — SI 2024/290 |
| 31 Mar 2025 | 3.20% — SI 2025/252 |
| 31 Mar 2026 | 5.30% — SI 2026/254 |

Nothing about the member selects that. It is whichever September
CPI attaches to the piece of paper they happen to hold, and the
member with the older statement would read better for a reason
they could never discover.

**The exactness is not collectable either.** The year-end figure
an Order produces here also contains this library's guess at
that year's pay, so there is nothing to check it against until a
statement the member has not received — and their real
pensionable pay for the year will not be the one this model
assumed. What IS checkable stays checkable: the stated figure
itself is never restated.

What it costs. A member's **cash** projection does not track the
Order the scheme actually applied in the one year where it
could: the year opening straight after their statement, before
any guessed pay is in the balance. That row takes 3.5% at a 2%
assumption where the scheme applied 8.2% to a 2024 statement and
3.2% to a 2025 one — once, on the whole balance, and never
again, since no statement covers any later year. A member who
gave no statement has no such year and pays nothing. In
**today's money** the same row moves by the same amount, and
there the movement is the error leaving rather than a price.

The table is not going anywhere, and stays under test:
`revaluation.ts` holds all eleven published scheme years with
each year's September CPI and the SI that made it, and it is the
oracle for the additive `rate = CPI + 1.5` rule. Its reader is
`revaluationFor`, for a caller asking what the record says —
never a projection, which asks a different question. Decided in
the open at
[issue #13](https://github.com/casomoltd/nhs-pay/issues/13).

### Reading a statement back applies the same rule

A stated balance arrives with an uplift already inside it: a
member reading their statement in August has had that April's
revaluation applied to the figure they are looking at. To place
that figure on a year-end row the library divides the uplift
back out; the walk then multiplies it on again.

**One function produces that uplift — `openingUpliftFor` — and
both halves call it.** It asks `phaseAt` about the year the
uplift OPENS, not the year that just closed, and reads the rate
from `assumedFor`. Neither caller spells any of that out, and
that is the point: a rule two sites obey is a rule either one
can break alone.

The trap it forecloses is the year. Asked about the year that
just closed instead, the same question gives a different answer
for exactly one exit date — 31 March of the last closed scheme
year, which is the day an Annual Benefit Statement is drawn to.
The seed would divide out CPI + 1.5 while the walk multiplied
back CPI, and the member's own stated figure would come back
1.5 points light with nothing in the output to show it. The
sweep in `tests/pension-projection.test.ts` walks every exit date
across each year-end boundary against four clock dates and
requires the figure to survive the round trip exactly.

**So the model's simplifications govern how history is READ, not
only how the future is projected** — and that is a design
limitation worth stating on its own. Two of them meet here. The
exit rule treats a member who left at a year end as deferred
from that close, where Sch 9 para 3 gives them the following
April's in-service rate in full (see *An exit date names a
scheme year, not a day*); and the rate undone is the caller's
assumption, where the scheme applied that April's Order. So when
such a member enters a balance **stated at the day they read
it** — "this is what I have now" — the year-end figure the
library RECONSTRUCTS behind their statement does not land on the
one their statement actually printed. A consumer showing a
year-by-year
reconciliation is showing that reconstructed row, so the two can
be compared side by side and disagree.

Worked. A member whose statement said £3,417.21 at 31 March 2026
and who left that day holds £3,598.32 by that August under the
regulation: the 3.8% CPI opening 2027, plus the 1.5 they are
owed for serving the full year. Hand the library that August
figure dated that August, at a 2% assumption, and it
reconstructs the March row as £3,527.77 — 3.2% above the
statement, being the whole of the 5.3% the scheme applied
divided back out at 2%.

**Its size depends on the assumption**, which is the part worth
carrying: the same August figure reconstructs as £3,598.32 at a
zero assumption and £3,426.97 at 5%. Nothing about a member
selects it, so no consumer should present the reconstructed row
as theirs.

The stated figure itself is never wrong: the same rate is undone
and redone, so it round-trips exactly, and every year after it
follows the model consistently. The gap is confined to
reconstructing what came BEFORE a figure the library was given.

**Dating the figure to the statement avoids it entirely.** With
`statementDate` set to the year end the statement names, the
April uplift has not yet been applied at that date, nothing is
divided out, and the figure lands on its own row untouched. The
field is required for exactly this reason: which year the
balance seeds is the caller's to state, and the two readings
above are different answers to different questions rather than
one answer with a default.

## Checking it

The balance is a geometric series, so with flat pay `W`, a
constant rate `r` and `n` whole years:

```
P = (W / 54) x (r^n - 1) / (r - 1)      W = 54 P (r - 1) / (r^n - 1)
```

In today's money `r` is 1 + the in-service bonus above, so
1.015; in cash it is 1 + CPI + that bonus. It agrees with the
walk to the last decimal — twenty years at £30,825 of flat pay
gives £13,199.76 either way — so a reader can check this
document with a calculator. Those figures are pinned by *the
closed form the docs quote* in `tests/pension-projection.test.ts`,
which derives its rate from the constants rather than repeating
them, so the model cannot move without this failing.

The code does not use it. A part-year join, a start clamped to
April 2015, an Order that changes `r` mid-career, and a phase
change are each a special case in the formula and none in a
walk. It also answers what you BUILT UP, never what you are
drawn: check it against a member who retires early and it reads
10.1% low, because an ERF of 0.899 sits in the drawing row.

It earns its keep as an independent oracle in
`tests/golden-abs.test.ts`, and the ledger being linear in pay
is what lets `estimateHistory` calibrate with one walk at a pay
of 1. If pay grew at its own rate `g` the closed form would be
`W0 (r^n - g^n) / (r - g)`; this library holds pay flat instead,
which is [issue #11](https://github.com/casomoltd/nhs-pay/issues/11).

That the model reproduces a real member's statement to the penny
is checked in the same file, against a redacted Annual Benefit
Statement and the [worked example](source-archive.md#sa-19)
built by hand from it.
