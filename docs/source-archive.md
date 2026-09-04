# Source archive

Every figure in this library is transcribed from a published
document on a site we do not control, and government pages
move. We keep our own copy of each cited document; this file is
the inventory. **The bytes live in Google Drive, the manifest
in git.**

Nothing here is read at build or test time.

## Note — the NHS Wales estate was down on 2 Sep 2026

Recorded because it affected how SA-44 and SA-45 were obtained, not
because anything about them changed.

On 2 September 2026 the NHS Wales public web estate was serving a
"Service Unavailable" page, over a wildcard certificate that had
expired on 18 August 2025 — so browsers refused it outright. The
Welsh AfC circulars were therefore read from NHS Wales Employers'
copy to complete the transcription, after checking each file
byte-for-byte against a copy taken from `www.nhs.wales` the previous
day. Both matched.

Authoritative URLs below are unchanged and remain the publisher's.
Nothing in the code or in any consumer links anywhere else.

## Where links live

**Source files name documents. This manifest holds the links.**

A transcription header says *Source: "Wales, M&D(W) 01/2025" —
see docs/source-archive.md#sa-08* and nothing more. It does not
repeat the publisher's URL, and it does not repeat the Drive
id. Both are here, once, on the row that id points at.

A URL that moves, or a file that is replaced, is then one row
to edit rather than a dozen comments to chase.

**Cite the id, never the title.** Every row carries a short key
— `SA-01`, `SA-02` — that is also an anchor, so
`docs/source-archive.md#sa-08` opens on the row itself. An id
is assigned once and then fixed: never renumbered, never
reused, and never reassigned to a different document. A row can
be retitled, refiled under another class, or re-uploaded and
every reference to it still resolves.

A retired document keeps its id as a gap in the sequence rather
than letting a later one inherit it.

**Three exceptions, all typed data rather than comments, and all
justified the same way — a consumer RENDERS the link:**

- `FactorProvenance.sourceUrl` on the GAD tables. The
  calculator RENDERS it as a citation link on its methods
  panel, so it has to be a URL a consumer can follow.
- `EmployerPensionRate.source` in `pension.ts`, for the same
  reason: it is the citation for a rate, carried with the rate.
- `DocumentSource.url` in `sources.ts`, carried by every award,
  allowance and pay SCALE. A pay table renders its own circular
  as a footnote link, and the scale's circular is a different
  document from the award's instrument in every nation — so the
  consumer cannot derive one from the other and must be handed
  it. Without it a consumer keeps its own table of the same
  URLs, which is the second copy this rule exists to prevent.

None of the three carries an archive link: a Drive id in a second
place is a Drive id that can fall out of step with this file.

## Checking these links: nhs.wales soft-404s

`nhs.wales` returns **HTTP 200 for any unknown path**, serving an
identical page. A status-code sweep over every row whose
authoritative URL is on that host therefore reports green whether or
not the document is still there, and a moved circular would look
fine until someone opened it. Stated as a predicate rather than a
list of ids, for the same reason this file keeps Drive ids in one
place: a second copy goes stale the day a new Welsh row lands.

Verify those rows by **content-type and content**, never by status.
`publications.scot.nhs.uk` and `nhsemployers.org` return genuine
404s, so probing there is trustworthy — which is why the SA-03 note
below can state that the old R issue's URL is really gone.

## Finding a file

**Every Drive id below is a link — click it.** That is the whole
route, and the only one that needs no searching:

> the transcription's header cites `#sa-NN` -> that row -> its Drive
> link -> the file.

The id alone is **not searchable in the Drive UI**. Pasting
`13HAA6leDTYJUlS73XshlPKzdsrSRx6iC` into Drive's search box finds
nothing; the id only appears in a share link, so searching by it
means opening candidates and comparing URLs. Follow the link
instead of hunting.

**If you must search by name**, note that a filename cannot contain
`/`, so a circular's own reference never matches its filename:
`PC(M&D) 1/2026 R2` is filed as `PC(M&D) 1-2026 R2`. Search the
**slug** instead — the third field of the name, which is plain
words: `england-medical-dental-payscales`,
`scotland-medical-dental-payscales`, `wales-afc-payscales`.

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

**A revision is a new VERSION, not a new row.** Publishers
revise a circular in place and keep its number: NHS Employers'
`PC(M&D) 1/2026` was first published 11 May 2026, revised to
`1/2026R` on 30 June, and to `1/2026 R2` on 24 July — one
document in three states, not three documents. Manage versions
is what models that: the id stays, every pointer keeps
resolving, and Drive keeps the superseded bytes retrievable
underneath. So you get both issues without a second row, and
without a stale row that nothing cites.

**Rename the PDF before you upload it, because that is the only
label a version gets.** Drive's *Manage versions* has no field
for naming a version: each entry is labelled with the filename
of the file that was uploaded, and uploading a version does not
rename the file itself. So a version arrives correctly labelled
or not at all — put the publisher's revision into the
issuer-ref field first (`md-1-2026-r2`), and rename the Drive
file to match afterwards so the current name states the current
issue.

Then update this row's Document cell to the revision the bytes
now hold, and its Retrieved date. Renaming is safe: the id is
the durable identifier, so nothing that points here breaks.

A row is only split in two when the publisher issues a genuinely
separate document, such as an addendum with its own reference
(see `SA-05` and `SA-06`).

## Naming

`<iso-as-at>__<issuer-ref>__<slug>.<ext>`

The **as-at** is the date the document's contents take effect,
not the date we fetched it — except for a live web page, which
rarely says when its contents took effect, where the as-at IS
the capture date. The **issuer-ref** is the
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

It is a rule at the door because the failure is unrecoverable:
a personal document is public the moment it is shared, and
un-sharing it does not undo that.

The corollary is that **an unredacted document has no home
here**. If one cannot be redacted, it does not go in the
archive — it does not go in a private subfolder either, because
a private subfolder inside a shared parent is exactly the
arrangement this rule exists to avoid.

## gad-factors

Parent: <https://drive.google.com/drive/folders/1z5uLpdepmR3zool9OKVbfLS_pip6APcO>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-01"></a>`SA-01` | GAD NHS_EW Consolidated Factors, version 2026-01 | 2026-06-01 | 2026-07-22 | [`1moNeO3yOWIb0LZmSGq58EXAfp-vPKqeE`](https://drive.google.com/file/d/1moNeO3yOWIb0LZmSGq58EXAfp-vPKqeE/view) | not published at a stable URL — see note |
| <a id="sa-02"></a>`SA-02` | NHSBSA, "Early and Late Retirement Factors" | 2024-02-01 | 2026-07-22 | [`1x7_9gJ3ivL2fmCUO2O-TAm3wgAtB9Mek`](https://drive.google.com/file/d/1x7_9gJ3ivL2fmCUO2O-TAm3wgAtB9Mek/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-02/Early%20and%20Late%20Retirement%20Factors.pdf> |

The workbook is the source of record: only it carries the
*Version control* sheet that says whether a table has moved,
and only it has no durable public URL.

## pay-circulars

Parent: <https://drive.google.com/drive/folders/1Q0iyVdhw_LwLSF7AsasfiNehvFWylGyP>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-43"></a>`SA-43` | Scotland, PCS(DD)2026/02 — medical & dental scales 2026/27 | 2026-08-12 | 2026-09-02 | [`1aBuVF4gqvmZyaT5jjpSSW_78vLYVqg0w`](https://drive.google.com/file/d/1aBuVF4gqvmZyaT5jjpSSW_78vLYVqg0w/view) | <https://www.publications.scot.nhs.uk/files/pcs-dd-2026-02.pdf> |
| <a id="sa-44"></a>`SA-44` | Wales, AfC(W) 02/2025 — Welsh AfC pay scales 2025/26 | 2025-05-29 | 2026-09-02 | [`1-h2qIDn8XAz1j7FJdeiy3y7slZu-Stby`](https://drive.google.com/file/d/1-h2qIDn8XAz1j7FJdeiy3y7slZu-Stby/view) | <https://www.nhs.wales/files/pc-resources/afc-w-02-2025-pdf-2-pdf/> |
| <a id="sa-45"></a>`SA-45` | Wales, AfC(W) 02/2026 — Welsh AfC pay scales 2026/27 | 2026-02-12 | 2026-09-02 | [`1jy17TTYKCAQ1arWTEcshVQvVeRyjLhmW`](https://drive.google.com/file/d/1jy17TTYKCAQ1arWTEcshVQvVeRyjLhmW/view) | <https://www.nhs.wales/files/pc-resources/afc-w-02-2026-pdf-pdf/> |
| <a id="sa-46"></a>`SA-46` | England, written ministerial statement HCWS1340 — AfC award 2026/27 | 2026-02-12 | 2026-09-02 | [`1sdAeuw-3Aiz-0W3fVDfVjJGzoCwPsXpy`](https://drive.google.com/file/d/1sdAeuw-3Aiz-0W3fVDfVjJGzoCwPsXpy/view) | <https://questions-statements.parliament.uk/written-statements/detail/2026-02-12/hcws1340> |
| <a id="sa-47"></a>`SA-47` | England, written ministerial statement HCWS1462 — DDRB acceptance 2026/27 | 2026-03-25 | 2026-09-02 | [`14kkj-kKigKcdZU1ilUoTnDbKPwqsfXhC`](https://drive.google.com/file/d/14kkj-kKigKcdZU1ilUoTnDbKPwqsfXhC/view) | <https://questions-statements.parliament.uk/written-statements/detail/2026-03-25/hcws1462> |
| <a id="sa-48"></a>`SA-48` | England, NHS pay award 2025 to 2026 | 2025-05-22 | 2026-09-02 | [`1x8B_ZQb7X534-e5ytzLaV5EhjitS1r6K`](https://drive.google.com/file/d/1x8B_ZQb7X534-e5ytzLaV5EhjitS1r6K/view) | <https://www.gov.uk/government/publications/nhs-pay-awards-2025-to-2026-agenda-for-change-staff/nhs-pay-award-2025-to-2026-a-fair-deal-for-nhs-staff> |
| <a id="sa-49"></a>`SA-49` | Wales, written statement on the 38th NHSPRB report | 2025-05-22 | 2026-09-02 | [`1IMIOHzYAOsZDvxQatCVFKdaxbLLQX5dr`](https://drive.google.com/file/d/1IMIOHzYAOsZDvxQatCVFKdaxbLLQX5dr/view) | <https://www.gov.wales/written-statement-responding-38th-nhs-pay-review-body-and-53rd-doctors-and-dentists-review-body> |
| <a id="sa-50"></a>`SA-50` | Wales, written statement on the 39th NHSPRB report | 2026-02-12 | 2026-09-02 | [`1UDqPm99-c2YBm_-B777BIqhppUDy-7gl`](https://drive.google.com/file/d/1UDqPm99-c2YBm_-B777BIqhppUDy-7gl/view) | <https://www.gov.wales/written-statement-responding-39th-nhs-pay-review-body> |
| <a id="sa-51"></a>`SA-51` | Wales, written statement on the 54th DDRB report | 2026-03-25 | 2026-09-02 | [`1din-jwJQrKYWhI_4W7lX1VzqdIPWPATf`](https://drive.google.com/file/d/1din-jwJQrKYWhI_4W7lX1VzqdIPWPATf/view) | <https://www.gov.wales/written-statement-responding-54th-doctors-and-dentists-review-body> |
| <a id="sa-52"></a>`SA-52` | Northern Ireland, HSC (AfC) 06/2025 — AfC pay arrangements 2025/26 (the url carries the publisher's `(6) 2025` filename form; the document's own cover reads 06/2025) | 2025-12-03 | 2026-09-02 | [`1GVaP6ggPBMa4BLBvUhOfomKht9g98Rtw`](https://drive.google.com/file/d/1GVaP6ggPBMa4BLBvUhOfomKht9g98Rtw/view) | <https://www.health-ni.gov.uk/sites/default/files/2025-12/HE1%2025%20379860%20%20HSC%20%28AfC%29%20%286%29%202025%20-%20Agenda%20for%20Change%20Pay%20Arrangements%202025-26.pdf> |
| <a id="sa-53"></a>`SA-53` | Northern Ireland, Health Minister's statement on 2026/27 HSC pay | 2026-02-12 | 2026-09-02 | [`18UF9bTam3L98Z72OHJamJpPJbJnO4TJN`](https://drive.google.com/file/d/18UF9bTam3L98Z72OHJamJpPJbJnO4TJN/view) | <https://www.health-ni.gov.uk/news/health-minister-reaffirms-commitment-time-pay-settlement-health-staff> |
| <a id="sa-54"></a>`SA-54` | Scotland, gov.scot NHS pay awards — DDRB acceptance 2026/27 | 2026-08-12 | 2026-09-02 | [`1i0AdSLgGHoRtQpReIH44gT9574-7pWG_`](https://drive.google.com/file/d/1i0AdSLgGHoRtQpReIH44gT9574-7pWG_/view) | <https://www.gov.scot/news/nhs-pay-awards/> |
| <a id="sa-55"></a>`SA-55` | England, offer to the BMA UK Resident Doctors Committee, June 2026 | 2026-06-17 | 2026-09-02 | [`1-Om7z1IfYjXX3C3LkKAwUhXzQahzlbtg`](https://drive.google.com/file/d/1-Om7z1IfYjXX3C3LkKAwUhXzQahzlbtg/view) | <https://www.gov.uk/government/publications/government-offer-to-resident-doctors-june-2026> |
| <a id="sa-56"></a>`SA-56` | Scotland, PCS(AFC)2026/2 — reduction of the full-time AfC working week to 36 hours (a CONDITIONS circular: it moves no salary, and is the instrument behind the hourly-rate divisor) | 2026-04-01 | 2026-09-04 | [`1Vazd9d9uM2_0fSLNYR5WZ8JUzIIPyMgs`](https://drive.google.com/file/d/1Vazd9d9uM2_0fSLNYR5WZ8JUzIIPyMgs/view) | <https://www.publications.scot.nhs.uk/files/pcs-afc-2026-02.pdf> |
| <a id="sa-30"></a>`SA-30` | GOV.UK — national minimum wage rates | 2026-08-21 | 2026-08-21 | [`1ntrDgwk5hGJpIZZs4RrhrQselNEnqVVy`](https://drive.google.com/file/d/1ntrDgwk5hGJpIZZs4RrhrQselNEnqVVy/view) | <https://www.gov.uk/national-minimum-wage-rates> |
| <a id="sa-27"></a>`SA-27` | Health Careers — AfC pay rates | 2026-08-21 | 2026-08-21 | [`1qt-1syUAlbUHsXj0HbUA2S9ShsmIy03c`](https://drive.google.com/file/d/1qt-1syUAlbUHsXj0HbUA2S9ShsmIy03c/view) | <https://www.healthcareers.nhs.uk/working-health/working-nhs/nhs-pay-and-benefits/agenda-change-pay-rates> |
| <a id="sa-26"></a>`SA-26` | NHS Employers — AfC pay scales 2026/27 **(see note)** | 2026-08-21 | 2026-08-21 | [`1g9BYl3NIP3cPIALgnlU_0xI3XgR5NBqE`](https://drive.google.com/file/d/1g9BYl3NIP3cPIALgnlU_0xI3XgR5NBqE/view) | <https://www.nhsemployers.org/articles/pay-scales-202627> |
| <a id="sa-25"></a>`SA-25` | NHS Employers — AfC pay scales 2025/26 | 2026-08-21 | 2026-08-21 | [`1MQg8PHufj0nv4JTjQCCyxHYjN0zDf6TH`](https://drive.google.com/file/d/1MQg8PHufj0nv4JTjQCCyxHYjN0zDf6TH/view) | <https://www.nhsemployers.org/articles/pay-scales-202526> |
| <a id="sa-03"></a>`SA-03` | England, Pay & Conditions Circular (M&D) 1/2026 R2 | 2026-04-01 | 2026-09-03 | [`13HAA6leDTYJUlS73XshlPKzdsrSRx6iC`](https://drive.google.com/file/d/13HAA6leDTYJUlS73XshlPKzdsrSRx6iC/view) | <https://www.nhsemployers.org/system/files/2026-07/Pay-and-Conditions-Circular-%28MD%29-1-2026-R2.pdf> |
| <a id="sa-04"></a>`SA-04` | Northern Ireland, HSC (TC8) 05/2025 | 2025-04-01 | 2026-07-08 | [`1KGLd4ZflizTHOsGzdqagzeoqeM_iXQ16`](https://drive.google.com/file/d/1KGLd4ZflizTHOsGzdqagzeoqeM_iXQ16/view) | <https://www.health-ni.gov.uk/sites/default/files/2025-12/HSC%20%28TC8%29%2005%202025%20-%20Pay%20and%20Conditions%20of%20Service%20for%20Hospital%20Medical%20and%20Dental%20Staff.PDF> |
| <a id="sa-05"></a>`SA-05` | Scotland, PCS(DD)2025/01 | 2025-04-01 | 2026-07-17 | [`1Nj0B47bGVyfcuqkp6SXGEqvipBiphM79`](https://drive.google.com/file/d/1Nj0B47bGVyfcuqkp6SXGEqvipBiphM79/view) | <https://www.publications.scot.nhs.uk/files/pcs2025-dd-01.pdf> |
| <a id="sa-06"></a>`SA-06` | Scotland, PCS(DD)2025/01 addendum | 2025-04-01 | 2026-07-17 | [`1k38mibbNwum2dn6GtOt5WzfltKBX6vjr`](https://drive.google.com/file/d/1k38mibbNwum2dn6GtOt5WzfltKBX6vjr/view) | <https://www.publications.scot.nhs.uk/files/pcs2025-dd-01add.pdf> |
| <a id="sa-07"></a>`SA-07` | Scotland, PCS(DD)2026/01 | 2026-04-01 | 2026-07-08 | [`1TbFHtH_5R9tYMxCG8z9VIdU7tVgyea0z`](https://drive.google.com/file/d/1TbFHtH_5R9tYMxCG8z9VIdU7tVgyea0z/view) | <https://www.publications.scot.nhs.uk/files/pcs-dd-2026-01.pdf> |
| <a id="sa-08"></a>`SA-08` | Wales, M&D(W) 01/2025 | 2025-04-01 | 2026-07-08 | [`1yJzHpOGqjOYx6VkXEDsfV-X6Wmg-t8Nx`](https://drive.google.com/file/d/1yJzHpOGqjOYx6VkXEDsfV-X6Wmg-t8Nx/view) | <https://www.nhs.wales/files/pc-resources/md-w-01-25-pay-award-v3-pdf/> |
| <a id="sa-09"></a>`SA-09` | Wales, M&D(W) 01/2026 | 2026-04-01 | 2026-07-17 | [`1vslNK0ihTP7dnhzVqxyi6PJtiNETf9Jp`](https://drive.google.com/file/d/1vslNK0ihTP7dnhzVqxyi6PJtiNETf9Jp/view) | <https://www.nhs.wales/files/pc-resources/md-w-0126-pay-award-02-04-26-version-2/> |
| <a id="sa-12"></a>`SA-12` | NHS Scotland, AfC pay scales 2025-26 and 2026-27 (MSG) | 2025-04-01 | 2026-08-20 | [`180vd_V-ecNyhYNNPL6xU-b-ALWzgEN2H`](https://drive.google.com/file/d/180vd_V-ecNyhYNNPL6xU-b-ALWzgEN2H/view) | <https://www.msg.scot.nhs.uk/wp-content/uploads/AfC-Pay-Scales-2025-26-and-2026-27.pdf> |
| <a id="sa-13"></a>`SA-13` | Scotland, PCS(AFC)2026/1 | 2026-04-01 | 2026-08-20 | [`1_CjzB3D_3N9Gk17mgHR96AHSZxO7dXYQ`](https://drive.google.com/file/d/1_CjzB3D_3N9Gk17mgHR96AHSZxO7dXYQ/view) | <https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf> |
| <a id="sa-14"></a>`SA-14` | Wales, AFC(W) 01/2026 living wage | 2026-04-01 | 2026-08-20 | [`1Nf77CreuGT1Q4zZ7SuUDN0TJaomfEJFz`](https://drive.google.com/file/d/1Nf77CreuGT1Q4zZ7SuUDN0TJaomfEJFz/view) | <https://www.nhs.wales/files/pc-resources/2026-afc-1-2026-living-wage-pdf-pdf/> |
| <a id="sa-16"></a>`SA-16` | NHS Employers, 2026 AfC pay scales poster | 2026-04-01 | 2026-08-21 | [`1T2ongcJGKQhA-BgiktnxHlDhERRVZqV-`](https://drive.google.com/file/d/1T2ongcJGKQhA-BgiktnxHlDhERRVZqV-/view) | <https://www.nhsemployers.org/system/files/2026-02/2026%20AfC%20pay%20scales.pdf> |

### Note — the NHS Employers 2026/27 page has typos

Kept as served; that is what an archive is for. The *Hourly
rates* table prints Band 8d top as `£55,65` (a comma for the
decimal point — the page's own divisor confirms £55.65, being
108,814 ÷ 1,955.4), Band 8a entry as `£ 29.42`, and its header
shifts between the four- and six-column shapes.

None of it reaches the library. `scales.ts` transcribes the
**annual** column and derives hourly through `annualiseHourly`,
so the printed hourly figures are never read. The 2025/26 page
is clean, and the publisher's own poster agrees on every annual
figure.

## pay-reviews

Parent: <https://drive.google.com/drive/folders/1zABHa3-JASApClzXTFq6bVnfBKCeFsy9>

Its own class rather than a pay circular: a Review Body reports
*recommendations* to ministers, and an employer circular
implements what was *accepted*. The two disagree whenever an
award is modified, staged or rejected, so filing them together
would lose the distinction that matters when a figure is
queried.

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-42"></a>`SA-42` | NHS Pay Review Body, Thirty-Ninth Report 2026 (CP 1484) | 2026-02-12 | 2026-08-22 | [`1DSoZVZZyKzQ6ayvCbaKBXchA2WD2Yp49`](https://drive.google.com/file/d/1DSoZVZZyKzQ6ayvCbaKBXchA2WD2Yp49/view) | <https://www.gov.uk/government/publications/nhs-pay-review-body-thirty-ninth-report-2026> |

## contribution-tiers

Parent: <https://drive.google.com/drive/folders/1oUiomOoe8BeZsiEUzcjiHB1GUq12BGAx>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-29"></a>`SA-29` | HSC Pensions NI — member contributions | 2026-08-21 | 2026-08-21 | [`1n7NoBnOLLz1aPqBeDHgHE3C9K5B8SxSV`](https://drive.google.com/file/d/1n7NoBnOLLz1aPqBeDHgHE3C9K5B8SxSV/view) | <https://hscpensions.hscni.net/hsc-pension-scheme/hsc-pension-members-section/membership-contributions-pay/> |
| <a id="sa-28"></a>`SA-28` | SPPA — NHS employer contributions (Scotland, 22.5%) | 2026-08-21 | 2026-08-21 | [`1mS064fDWui07K7B3UIrdO08hKuy5bBvC`](https://drive.google.com/file/d/1mS064fDWui07K7B3UIrdO08hKuy5bBvC/view) | <https://pensions.gov.scot/nhs/employers/employer-contributions> |
| <a id="sa-24"></a>`SA-24` | NHS Employers — employer contributions (23.7% + 0.08% levy) | 2026-08-21 | 2026-08-21 | [`1cuo_DtTErSe7_PSzKKAl4P1cb4aJ-1CE`](https://drive.google.com/file/d/1cuo_DtTErSe7_PSzKKAl4P1cb4aJ-1CE/view) | <https://www.nhsemployers.org/articles/nhs-pension-scheme-employer-contributions> |
| <a id="sa-22"></a>`SA-22` | NHSBSA — employer pay & contributions | 2026-08-21 | 2026-08-21 | [`15G4E8k4U1aHAShNT1JEidTELpWEyOuOl`](https://drive.google.com/file/d/15G4E8k4U1aHAShNT1JEidTELpWEyOuOl/view) | <https://www.nhsbsa.nhs.uk/employer-hub/technical-guidance/pay-and-contributions> |
| <a id="sa-21"></a>`SA-21` | NHSBSA — contribution rates 2025/26 | 2026-08-21 | 2026-08-21 | [`104hMHqBKURjXOpGw6cwPvZi7b-8xfFSc`](https://drive.google.com/file/d/104hMHqBKURjXOpGw6cwPvZi7b-8xfFSc/view) | <https://www.nhsbsa.nhs.uk/nhs-pensions-contribution-rates-202526> |
| <a id="sa-20"></a>`SA-20` | NHSBSA — cost of being in the Scheme (tier tables, 2024/25/26) | 2026-08-21 | 2026-08-21 | [`1G1nfQsISMOkBgPnsaUu0bmTbaG-1VAzM`](https://drive.google.com/file/d/1G1nfQsISMOkBgPnsaUu0bmTbaG-1VAzM/view) | <https://www.nhsbsa.nhs.uk/member-hub/cost-being-scheme> |
| <a id="sa-17"></a>`SA-17` | SPPA, NHS Circular 2025/07 — employee contribution tiers 2025/26 | 2025-04-01 | 2026-07-17 | [`1x-9qzs6l_U2TUTycZyFIjYDrGTZwHhR1`](https://drive.google.com/file/d/1x-9qzs6l_U2TUTycZyFIjYDrGTZwHhR1/view) | <https://pensions.gov.scot/sites/default/files/2025-07/NHS_Circular_2025-07_Employee_contribution_tiers_2025-26.pdf> |
| <a id="sa-18"></a>`SA-18` | SPPA, NHS Circular 2026/03 — employee contribution tier bandings from 1 April 2026 | 2026-04-01 | 2026-07-08 | [`1Pg2cKibBiezTdwal-4PURf72N-sjnUx6`](https://drive.google.com/file/d/1Pg2cKibBiezTdwal-4PURf72N-sjnUx6/view) | <https://pensions.gov.scot/sites/default/files/2026-03/2026_03_-_NHS_Employee_contribution_tier_bandings_from_1_April_2026.pdf> |

## benefit-statements

Parent: <https://drive.google.com/drive/folders/1Wk_zX6BGvK7IafR4zE_C9GTM1bWxh1p2>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-19"></a>`SA-19` | Annual Benefit Statement, 2015 Section, redacted | 2025-03-31 | 2026-08-13 | [`1UJ8FIXC-6JbLOHIHZ3fbvqBLyTG-noL3`](https://drive.google.com/file/d/1UJ8FIXC-6JbLOHIHZ3fbvqBLyTG-noL3/view) | *(a member's own document — no publisher URL)* |

The oracle for `tests/golden-abs.test.ts`, alongside a
[projection built by hand from it][sheet].

[sheet]: https://docs.google.com/spreadsheets/d/1S6CamxFiVqVDsy9rrSd2Lwke38y1N3Pu4x7fhZHoRkA/edit

## revaluation

Parent: <https://drive.google.com/drive/folders/1EjnBGg0Wa8AqZiRfAYM9C3aoyV-dLwDM>

Sources behind the CARE revaluation series in `revaluation.ts`
— the rate as legislated and the rate as actually applied.

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-32"></a>`SA-32` | SI 2015/94 Sch 9 para 3 — revaluation | 2026-08-21 | 2026-08-21 | [`1x0xbWna9fCnnlvyg-rAfDBKGQaVcB2Bs`](https://drive.google.com/file/d/1x0xbWna9fCnnlvyg-rAfDBKGQaVcB2Bs/view) | <https://www.legislation.gov.uk/uksi/2015/94/schedule/9/paragraph/3> |
| <a id="sa-23"></a>`SA-23` | NHSBSA KA-02728 — how your pension is revalued | 2026-08-21 | 2026-08-21 | [`18RgmAxU1ZxxPIUZo5ecz5RawFzdUvPbM`](https://drive.google.com/file/d/18RgmAxU1ZxxPIUZo5ecz5RawFzdUvPbM/view) | <https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-02728/en-us> |
| <a id="sa-33"></a>`SA-33` | HM Treasury HCWS437 — Public Service Pension Scheme Indexation and Revaluation 2025 | 2025-02-11 | 2026-08-21 | [`1Rwy-L-_ubpyvI4nSqe2GQMtRI7sDWeIs`](https://drive.google.com/file/d/1Rwy-L-_ubpyvI4nSqe2GQMtRI7sDWeIs/view) | <https://questions-statements.parliament.uk/written-statements/detail/2025-02-11/hcws437>
| <a id="sa-40"></a>`SA-40` | HM Treasury — 2026 pensions increase multiplier tables, covering note | 2026-04-06 | 2026-08-21 | [`1c3xB5cgeRgrVjFvtK6K56Yc2v6jMAi99`](https://drive.google.com/file/d/1c3xB5cgeRgrVjFvtK6K56Yc2v6jMAi99/view) | <https://www.gov.uk/government/publications/public-service-pensions-increase-2026> |
| <a id="sa-39"></a>`SA-39` | HM Treasury — 2026 pensions increase multiplier tables, Annexes B and C | 2026-04-06 | 2026-08-21 | [`1vfaZbvGOCWmv69Td_9hrwbEHrB8C8SXP`](https://drive.google.com/file/d/1vfaZbvGOCWmv69Td_9hrwbEHrB8C8SXP/view) | <https://www.gov.uk/government/publications/public-service-pensions-increase-2026> |
| <a id="sa-36"></a>`SA-36` | SPPA NHS Circular 2023/01 — pension indexation and CARE revaluation | 2023-04-01 | 2026-08-20 | [`1Y9LYZHR3VZJN_PJc7JJoS2_8hu4nNL0w`](https://drive.google.com/file/d/1Y9LYZHR3VZJN_PJc7JJoS2_8hu4nNL0w/view) | <https://pensions.gov.scot/sites/default/files/2023-02/2023-01_-_NHS_Circular_-_Pension_Indexation_and_CARE_Revaluation.pdf> |
| <a id="sa-37"></a>`SA-37` | NHS Pension Scheme Valuation Report 2020 (Appendix E, inter-valuation events) | 2020-03-31 | 2026-08-20 | [`1hOHsbtURAiKq-YrVh8KYn1uamJzVfYqf`](https://drive.google.com/file/d/1hOHsbtURAiKq-YrVh8KYn1uamJzVfYqf/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-04/NHS%20Pension%20Scheme%20Valuation%20Report%202020.pdf> |

## scheme-guides

Parent: <https://drive.google.com/drive/folders/1v2zSXRlAbXs2owgw70VTkVwPAlKik1vJ>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-41"></a>`SA-41` | NHS Terms and Conditions of Service Handbook, amendment 62 | 2026-06-01 | 2026-08-21 | [`1iXiRypAr2IgsdbPhgTvXOCzdzad9IsBC`](https://drive.google.com/file/d/1iXiRypAr2IgsdbPhgTvXOCzdzad9IsBC/view) | <https://www.nhsemployers.org/publications/nhs-terms-and-conditions-service-handbook> |
| <a id="sa-31"></a>`SA-31` | HMRC PTM044230 — net pay arrangements | 2026-08-21 | 2026-08-21 | [`1iJA02Nl1hEYfS_RwAgJ-PTJjyuTNd6Yo`](https://drive.google.com/file/d/1iJA02Nl1hEYfS_RwAgJ-PTJjyuTNd6Yo/view) | <https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044230> |
| <a id="sa-38"></a>`SA-38` | NHSBSA 2015 Members' Guide V13 | 2024-05-01 | 2026-08-20 | [`1wp3F-7zrDPxbtqjWz_cU13XYkegt382M`](https://drive.google.com/file/d/1wp3F-7zrDPxbtqjWz_cU13XYkegt382M/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-05/2015%20Members%20Guide%20%28V13%29%2005.2024.pdf> |
