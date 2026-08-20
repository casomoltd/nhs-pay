# Source archive

Every figure in this library is transcribed from somebody
else's published document, and every one of those documents
lives on a website we do not control. Government pages move,
get superseded, and quietly disappear. When that happens the
transcription is still correct but the provenance behind it
stops resolving, which is the half of this library's
credibility a reader can actually check.

So we keep our own copy of each cited document, and this file
is the inventory. **The bytes live in Google Drive; the
manifest lives in git**, where it is versioned, diffable and
reviewable.

Nothing here is read at build or test time. The library
transcribes published values into TypeScript and the tests run
on the transcription. This is a human-facing citation surface,
not a fetching mechanism.

## Where links live

**Source files name documents. This manifest holds the links.**

A transcription header says *Source: "Wales, M&D(W) 01/2025" —
see docs/source-archive.md* and nothing more. It does not
repeat the publisher's URL, and it does not repeat the Drive
id. Both are here, once, on the row that carries that title.

The reason is maintenance, not tidiness. A publisher URL that
moves, or a Drive file that is replaced, used to mean chasing
the same link through a dozen source comments and hoping none
were missed. Now there is one row to edit. The titles below are
the join key, so keep them stable — renaming a row means
renaming the references that point at it.

**Two exceptions, both typed data rather than comments:**

- `FactorProvenance.sourceUrl` on the GAD tables. The
  calculator RENDERS it as a citation link on its methods
  panel, so it has to be a URL a consumer can follow.
- `EmployerPensionRate.source` in `pension.ts`, for the same
  reason: it is the citation for a rate, carried with the rate.

Neither carries an archive link. There is no `archiveUrl`
field: it was added and then removed, because nothing consumed
it and it put a Drive id in a second place that would have to
be kept in step with this file.

## The two rules that matter

**The Drive file id is the durable identifier, not the name.**
Renaming or moving a file keeps its id, so the links below
never break and the naming scheme can be revised later without
touching this manifest. Names are a human convenience.

**Replace a document with Drive's "Manage versions", never by
deleting and re-uploading.** Delete-and-reupload mints a *new*
id and silently breaks every pointer we hold — in this file, in
`FactorProvenance`, and in the transcription headers. It is
easy to get wrong because the obvious action (drag the new PDF
in, bin the old one) is the failing one.

## Naming

`<iso-as-at>__<issuer-ref>__<slug>.<ext>`

The **as-at** is the date the document's contents take effect,
not the date we fetched it. The **issuer-ref** is the
publisher's own reference wherever one exists — `MD(W) 01/2025`,
`PCS(DD)2025/01`, `HSC (TC8) 05/2025` — because that is what
lets a copy be matched back to the publisher. An archive named
entirely in private conventions is one nobody else can verify.

## Sharing, and the redaction rule

**Every folder here is shared with anyone who has the link**,
including `benefit-statements`. That is safe because of an
admission rule, not because benefit statements are harmless:

> **Nothing enters this archive until it is redacted.** A
> document is redacted before it is uploaded, never after.

Redacted means no name, membership number, National Insurance
number, address, or anything else that identifies the member.
The figures and dates stay — they are the entire point of
keeping the document, and they identify nobody on their own.

**Why a rule at the door rather than a decision per file.** The
alternative was to hold benefit statements apart and decide
sharing document by document. That is a decision somebody
eventually gets wrong, and the failure is unrecoverable: a
personal document is public the moment it is shared, and
un-sharing it afterwards does not undo that. An intake rule is
checked once, by the person holding the unredacted original,
who is the only one in a position to check it at all.

The corollary is that **an unredacted document has no home
here**. If one cannot be redacted, it does not go in the
archive — it does not go in a private subfolder either, because
a private subfolder inside a shared parent is exactly the
arrangement this rule exists to avoid.

## gad-factors

Parent: <https://drive.google.com/drive/folders/1z5uLpdepmR3zool9OKVbfLS_pip6APcO>

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| GAD NHS_EW Consolidated Factors, version 2026-01 | 2026-06-01 | 2026-07-22 | `1moNeO3yOWIb0LZmSGq58EXAfp-vPKqeE` | not published at a stable URL — see note |
| NHSBSA, "Early and Late Retirement Factors" | 2024-02-01 | 2026-07-22 | `1x7_9gJ3ivL2fmCUO2O-TAm3wgAtB9Mek` | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-02/Early%20and%20Late%20Retirement%20Factors.pdf> |

The **workbook is the source of record**, not the NHSBSA
extract. Both carry the factor tables; only the workbook
carries the *Version control* sheet, which is the only thing
that can answer whether a table has moved. It is also the
document with no durable public URL, which is precisely why
hosting a copy matters here more than anywhere else.

## pay-circulars

Parent: <https://drive.google.com/drive/folders/1Q0iyVdhw_LwLSF7AsasfiNehvFWylGyP>

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| England, Pay & Conditions Circular (M&D) 1/2026R | 2026-04-01 | 2026-07-08 | `13HAA6leDTYJUlS73XshlPKzdsrSRx6iC` | <https://www.nhsemployers.org/system/files/2026-06/Pay-and-Conditions-Circular-(MD)-1-2026R-0.pdf> |
| Northern Ireland, HSC (TC8) 05/2025 | 2025-04-01 | 2026-07-08 | `1KGLd4ZflizTHOsGzdqagzeoqeM_iXQ16` | <https://www.health-ni.gov.uk/sites/default/files/2025-12/HSC%20%28TC8%29%2005%202025%20-%20Pay%20and%20Conditions%20of%20Service%20for%20Hospital%20Medical%20and%20Dental%20Staff.PDF> |
| Scotland, PCS(DD)2025/01 | 2025-04-01 | 2026-07-17 | `1Nj0B47bGVyfcuqkp6SXGEqvipBiphM79` | <https://www.publications.scot.nhs.uk/files/pcs2025-dd-01.pdf> |
| Scotland, PCS(DD)2025/01 addendum | 2025-04-01 | 2026-07-17 | `1k38mibbNwum2dn6GtOt5WzfltKBX6vjr` | <https://www.publications.scot.nhs.uk/files/pcs2025-dd-01add.pdf> |
| Scotland, PCS(DD)2026/01 | 2026-04-01 | 2026-07-08 | `1TbFHtH_5R9tYMxCG8z9VIdU7tVgyea0z` | <https://www.publications.scot.nhs.uk/files/pcs-dd-2026-01.pdf> |
| Wales, M&D(W) 01/2025 | 2025-04-01 | 2026-07-08 | `1yJzHpOGqjOYx6VkXEDsfV-X6Wmg-t8Nx` | <https://www.nhs.wales/files/pc-resources/md-w-01-25-pay-award-v3-pdf/> |
| Wales, M&D(W) 01/2026 | 2026-04-01 | 2026-07-17 | `1vslNK0ihTP7dnhzVqxyi6PJtiNETf9Jp` | <https://www.nhs.wales/files/pc-resources/md-w-0126-pay-award-02-04-26-version-2/> |
| England, Pay & Conditions Circular (M&D) 2/2025 | 2025-04-01 | 2026-07-08 | `1-i9OvuFeowaStxlcTfYQd6D1eWhYT6Xd` | *(not cited in `src/` — held as context)* |
| England, Pay & Conditions Circular (M&D) 2/2026 | 2026-04-01 | 2026-07-08 | `1YhOA9sNiL-5eFRHpnWRONtB0t6Mp9GTU` | *(not cited in `src/` — held as context)* |

The last two are archived but transcribe nothing. They are
listed rather than dropped, so that a future reader does not
have to work out whether their absence from `src/circulars/`
was a decision or an oversight.

## contribution-tiers

Parent: <https://drive.google.com/drive/folders/1oUiomOoe8BeZsiEUzcjiHB1GUq12BGAx>

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| SPPA, NHS Circular 2025/07 — employee contribution tiers 2025/26 | 2025-04-01 | 2026-07-17 | `1x-9qzs6l_U2TUTycZyFIjYDrGTZwHhR1` | <https://pensions.gov.scot/sites/default/files/2025-07/NHS_Circular_2025-07_Employee_contribution_tiers_2025-26.pdf> |
| SPPA, NHS Circular 2026/03 — employee contribution tier bandings from 1 April 2026 | 2026-04-01 | 2026-07-08 | `1Pg2cKibBiezTdwal-4PURf72N-sjnUx6` | <https://pensions.gov.scot/sites/default/files/2026-03/2026_03_-_NHS_Employee_contribution_tier_bandings_from_1_April_2026.pdf> |

## benefit-statements

Parent: <https://drive.google.com/drive/folders/1Wk_zX6BGvK7IafR4zE_C9GTM1bWxh1p2>

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| Annual Benefit Statement, 2015 Section, redacted | 2025-03-31 | 2026-08-13 | `1UJ8FIXC-6JbLOHIHZ3fbvqBLyTG-noL3` | *(a member's own document — no publisher URL)* |

The oracle for `tests/golden-abs.test.ts`, alongside a
[projection built by hand from it][sheet] before the ledger
existed. Both were redacted before upload, per the rule above:
name and membership number removed, figures and dates intact.

[sheet]: https://docs.google.com/spreadsheets/d/1S6CamxFiVqVDsy9rrSd2Lwke38y1N3Pu4x7fhZHoRkA/edit

## web-snapshots

Parent: <https://drive.google.com/drive/folders/1bSS1R_OyetQW2Cs1LDDn9Ow6n009GIaG>

Some sources are web pages rather than documents. A page cannot
be archived the way a PDF can — there is no publisher artefact
to keep a copy of — so what is stored is a **snapshot**: the
page as served on the retrieval date, with scripts,
stylesheets, images and site navigation removed so it renders
standalone years later. Text and tables are kept as served.
Each file says so in a banner at the top, and carries its
source URL and retrieval date. **A snapshot is evidence of what
a page said on a date, not a substitute for the publisher's
live page**, and the manifest names both.

The as-at date for a snapshot IS the retrieval date, because a
web page rarely states when its contents took effect.

| Document | Retrieved | Drive id | Authoritative URL |
| -------- | --------- | -------- | ----------------- |
| NHSBSA — cost of being in the Scheme (tier tables, 2024/25/26) | 2026-08-20 | `1enyC1ItQg9F5Qco8KDjtakgh5CLeCUTg` | <https://www.nhsbsa.nhs.uk/member-hub/cost-being-scheme> |
| NHSBSA — contribution rates 2025/26 | 2026-08-20 | `1JoT_2rR1kK_Fru3E-rb9UStuDmc4xAny` | <https://www.nhsbsa.nhs.uk/nhs-pensions-contribution-rates-202526> |
| NHSBSA — employer pay & contributions | 2026-08-20 | `1s0DSrVX6cO8DIT96JgHK6HjdWVq5OwAs` | <https://www.nhsbsa.nhs.uk/employer-hub/technical-guidance/pay-and-contributions> |
| NHSBSA KA-02728 — how your pension is revalued | 2026-08-20 | `1WSjJdK9Fz66DMUT1OEiEcCoH6LcgWbDG` | <https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-02728/en-us> |
| NHS Employers — employer contributions (23.7% + 0.08% levy) | 2026-08-20 | `16DENkhdLqMOo8joZ8CDnYUGX5_Xcqk3J` | <https://www.nhsemployers.org/articles/nhs-pension-scheme-employer-contributions> |
| NHS Employers — AfC pay scales 2025/26 | 2026-08-20 | `1tj8UnfGWPT-wjqNO4wZMGLvxADL5H4EM` | <https://www.nhsemployers.org/articles/pay-scales-202526> |
| NHS Employers — AfC pay scales 2026/27 **(see note)** | 2026-08-20 | `16pRe6CPk5Vs8FROpG4c-1fKRSUj7OIvm` | <https://www.nhsemployers.org/articles/pay-scales-202627> |
| Health Careers — AfC pay rates | 2026-08-20 | `1qtaqHerPwpaCqSCpiUZQR8p2dKPurq4m` | <https://www.healthcareers.nhs.uk/working-health/working-nhs/nhs-pay-and-benefits/agenda-change-pay-rates> |
| SPPA — NHS employer contributions (Scotland, 22.5%) | 2026-08-20 | `1AqV8orxxUrWHB5oPADQQ7VRbvWlQyntb` | <https://pensions.gov.scot/nhs/employers/employer-contributions> |
| HSC Pensions NI — member contributions | 2026-08-20 | `1s4nVwfzFxIxV1cCO7yj1d-K-rwY-0OWL` | <https://hscpensions.hscni.net/hsc-pension-scheme/hsc-pension-members-section/membership-contributions-pay/> |
| GOV.UK — national minimum wage rates | 2026-08-20 | `1LcRR3FIrnwGzZYLDcTDDFhSVeeuyBd36` | <https://www.gov.uk/national-minimum-wage-rates> |
| HMRC PTM044230 — net pay arrangements | 2026-08-20 | `11_vLo8wvoWMpTW_ITq9-Oz-oWXxtSLK_` | <https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044230> |
| SI 2015/94 Sch 9 para 3 — revaluation | 2026-08-20 | `17eoThmzPvcG0OXJOX0AhfL1vV7w3IqZU` | <https://www.legislation.gov.uk/uksi/2015/94/schedule/9/paragraph/3> |
| HM Treasury HCWS437 — indexation and revaluation 2025 | 2026-08-20 | `18cIKVVjCQ1GNFnUpGV1nBBq9u3oJMIg9` | <https://questions-statements.parliament.uk/written-statements/detail/2025-02-11/hcws437> |
| BMA — salary sacrifice schemes | 2026-08-20 | *staged* | <https://www.bma.org.uk/pay-and-contracts/pensions/pensions-tax/salary-sacrifice-schemes> |
| NHS Employers — salary sacrifice schemes | 2026-08-20 | *staged* | <https://www.nhsemployers.org/articles/salary-sacrifice-schemes> |
| LITRG — tax relief on pension contributions | — | **not archived** | <https://www.litrg.org.uk/pensions/paying-pensions/tax-relief-pension-contributions/how-tax-relief-given-pension-contributions> |

LITRG returns 403 to non-browser clients, like parliament.uk
did. It is cited in `take-home.ts` for a single point — that a
net-pay contribution reduces taxable pay but not NI-able pay —
and is listed here so the reference resolves to a row even
though the row has no copy behind it yet. Save it from a
browser to close that.

### Note — the NHS Employers 2026/27 page carries formatting errors

Kept as served, because that is what an archive is for. In its
*Hourly rates* table, Band 8d top step is printed `£55,65`, a
comma where a decimal point belongs; the intended figure is
£55.65, which the page's own implied divisor confirms
(108,814 ÷ 1,955.4). Band 8a entry is printed `£ 29.42` with a
stray space, and the header row shifts columns between the
four-column and six-column table shapes.

None of it reaches this library: `scales.ts` transcribes the
**annual** column and derives hourly rates through
`annualiseHourly`, so the printed hourly figures are never
read. The 2025/26 page has no such errors. The publisher's own
pay-scales poster, archived under `pay-circulars`, is a second
rendering of the same award and agrees on every annual figure.

**HCWS437 is the one snapshot that is a transcription rather
than a copy**, and it says so on its face. parliament.uk
returns 403 to every non-browser client, so the page was read
in a browser and re-typed: the wording and figures are as
published, the markup is ours. That distinction matters for an
archive and is recorded on the artefact itself rather than
here alone.

It earns its place three times over. Its per-scheme table gives
**NHS revaluation for active members as 3.2%** — a third
independent source for the rate in `revaluation.ts`, alongside
the SI's own operative words and the 2020 valuation report's
inter-valuation table. It gives the prices measure as 1.7% (CPI
to September 2024), which is the figure that 3.2% derives from.
And it states, in the Treasury's own words, why the date moved:
*"the effective date of revaluation listed in the order is
1 April 2025, but some schemes have chosen to move their
effective revaluation date to 6 April 2025 in order to manage
interactions with the annual tax allowance"* — which is exactly
what `appliedOnFor` implements.

## revaluation

Parent: <https://drive.google.com/drive/folders/1EjnBGg0Wa8AqZiRfAYM9C3aoyV-dLwDM>

Sources behind the CARE revaluation series in `revaluation.ts`
— the rate as legislated and the rate as actually applied.

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| SPPA NHS Circular 2023/01 — pension indexation and CARE revaluation | 2023-04-01 | 2026-08-20 | `1Y9LYZHR3VZJN_PJc7JJoS2_8hu4nNL0w` | <https://pensions.gov.scot/sites/default/files/2023-02/2023-01_-_NHS_Circular_-_Pension_Indexation_and_CARE_Revaluation.pdf> |
| NHS Pension Scheme Valuation Report 2020 (Appendix E, inter-valuation events) | 2020-03-31 | 2026-08-20 | `1hOHsbtURAiKq-YrVh8KYn1uamJzVfYqf` | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-04/NHS%20Pension%20Scheme%20Valuation%20Report%202020.pdf> |

## scheme-guides

Parent: <https://drive.google.com/drive/folders/1v2zSXRlAbXs2owgw70VTkVwPAlKik1vJ>

| Document | As at | Retrieved | Drive id | Authoritative URL |
| -------- | ----- | --------- | -------- | ----------------- |
| NHSBSA 2015 Members' Guide V13 | 2024-05-01 | 2026-08-20 | `1wp3F-7zrDPxbtqjWz_cU13XYkegt382M` | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-05/2015%20Members%20Guide%20%28V13%29%2005.2024.pdf> |

Four more now sit in `pay-circulars`: NHS Scotland AfC pay
scales 2025-26 and 2026-27 (MSG) `180vd_V-ecNyhYNNPL6xU-b-ALWzgEN2H`,
PCS(AFC)2026/01 `1_CjzB3D_3N9Gk17mgHR96AHSZxO7dXYQ`, AFC(W)
01/2026 living wage `1Nf77CreuGT1Q4zZ7SuUDN0TJaomfEJFz`, and the
NHSPRB 39th Report 2026 `1fNXgDapr7y3HpuQUwtWLQMn_Nbaxvxz4` that
the AfC scales are cross-checked against.

**One file is still staged**, in
`scratch/drive-upload/pay-circulars/`: NHS Employers' own 2026
AfC pay-scales poster
(<https://www.nhsemployers.org/system/files/2026-02/2026%20AfC%20pay%20scales.pdf>).
It is the publisher's second rendering of the same award and is
worth holding beside the web page whose hourly table carries
the errors noted above.

## Coverage

`src/` cites 35 external documents. **35 files are archived**
across the seven class folders — publisher originals, web
snapshots, and supporting material that is held for context
rather than cited (England M&D 2/2025 and 2/2026, the NHSPRB
39th Report, the pay-scales poster). Nothing cited in `src/` is
unarchived.

**One file is still staged** and named in *pay-circulars*
above: NHS Employers' 2026 AfC pay-scales poster.

Two caveats travel with this, both recorded where they belong
rather than only here: HCWS437 is a **transcription** rather
than a byte copy, because parliament.uk refuses non-browser
clients; and the web snapshots are **snapshots**, evidence of
what a page said on a date, with site chrome removed so they
render standalone. Each artefact says which it is on its own
face.

The class folders are `gad-factors`, `pay-circulars`,
`contribution-tiers`, `benefit-statements`, `revaluation`,
`scheme-guides` and `web-snapshots`. The last three were added
as the corpus turned out to need them: a revaluation circular
is neither a pay circular nor a factor table, a members' guide
is neither, and a web page is not a document at all.
