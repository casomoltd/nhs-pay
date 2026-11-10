# Source archive

Every figure in this library is transcribed from a published document on a site we do not control, and government pages move. We keep our own copy of each cited document; this file is the inventory. **The bytes live in Google Drive, the manifest in git.**

Nothing here is read at build or test time.

## Note — the NHS Wales estate was down on 2 Sep 2026

Recorded because it affected how SA-44 and SA-45 were obtained, not because anything about them changed.

On 2 September 2026 the NHS Wales public web estate was serving a "Service Unavailable" page, over a wildcard certificate that had expired on 18 August 2025 — so browsers refused it outright. The Welsh AfC circulars were therefore read from NHS Wales Employers' copy to complete the transcription, after checking each file byte-for-byte against a copy taken from `www.nhs.wales` the previous day. Both matched.

Authoritative URLs below are unchanged and remain the publisher's. Nothing in the code or in any consumer links anywhere else.

## Where links live

**Source files name documents. This manifest holds the links.**

A transcription header says *Source: "Wales, M&D(W) 01/2025" — see docs/source-archive.md#sa-08* and nothing more. It does not repeat the publisher's URL, and it does not repeat the Drive id. Both are here, once, on the row that id points at.

A URL that moves, or a file that is replaced, is then one row to edit rather than a dozen comments to chase.

**Cite the id, never the title.** Every row carries a short key — `SA-01`, `SA-02` — that is also an anchor, so `docs/source-archive.md#sa-08` opens on the row itself. An id is assigned once and then fixed: never renumbered, never reused, and never reassigned to a different document. A row can be retitled, refiled under another class, or re-uploaded and every reference to it still resolves.

A retired document keeps its id as a gap in the sequence rather than letting a later one inherit it.

**Three exceptions, all typed data rather than comments, and all justified the same way — a consumer RENDERS the link:**

- `FactorProvenance.sourceUrl` on the GAD tables. The calculator RENDERS it as a citation link on its methods panel, so it has to be a URL a consumer can follow.
- `EmployerPensionRate.source` in `pension.ts`, for the same reason: it is the citation for a rate, carried with the rate.
- `DocumentSource.url` in `sources.ts`, carried by every award, allowance and pay SCALE. A pay table renders its own circular as a footnote link, and the scale's circular is a different document from the award's instrument in every nation — so the consumer cannot derive one from the other and must be handed it. Without it a consumer keeps its own table of the same URLs, which is the second copy this rule exists to prevent.

None of the three carries an archive link: a Drive id in a second place is a Drive id that can fall out of step with this file.

## Checking these links: nhs.wales soft-404s

`nhs.wales` returns **HTTP 200 for any unknown path**, serving an identical page. A status-code sweep over every row whose authoritative URL is on that host therefore reports green whether or not the document is still there, and a moved circular would look fine until someone opened it. Stated as a predicate rather than a list of ids, for the same reason this file keeps Drive ids in one place: a second copy goes stale the day a new Welsh row lands.

Verify those rows by **content-type and content**, never by status. `publications.scot.nhs.uk` and `nhsemployers.org` return genuine 404s, so probing there is trustworthy — which is why the SA-03 note below can state that the old R issue's URL is really gone.

## Finding a file

**Every Drive id below is a link — click it.** That is the whole route, and the only one that needs no searching:

> the transcription's header cites `#sa-NN` -> that row -> its Drive
> link -> the file.

The id alone is **not searchable in the Drive UI**. Pasting `13HAA6leDTYJUlS73XshlPKzdsrSRx6iC` into Drive's search box finds nothing; the id only appears in a share link, so searching by it means opening candidates and comparing URLs. Follow the link instead of hunting.

**If you must search by name**, note that a filename cannot contain `/`, so a circular's own reference never matches its filename: `PC(M&D) 1/2026 R2` is filed as `PC(M&D) 1-2026 R2`. Search the **slug** instead — the third field of the name, which is plain words: `england-medical-dental-payscales`, `scotland-medical-dental-payscales`, `wales-afc-payscales`.

## The two rules that matter

**The Drive file id is the durable identifier, not the name.** Renaming or moving a file keeps its id, so the links below never break and the naming scheme can be revised later without touching this manifest. Names are a human convenience.

**Replace a document with Drive's "Manage versions", never by deleting and re-uploading.** Delete-and-reupload mints a *new* id and silently breaks every pointer we hold — in this file, in `FactorProvenance`, and in the transcription headers. It is easy to get wrong because the obvious action (drag the new PDF in, bin the old one) is the failing one.

**A revision is a new VERSION, not a new row.** Publishers revise a circular in place and keep its number: NHS Employers' `PC(M&D) 1/2026` was first published 11 May 2026, revised to `1/2026R` on 30 June, and to `1/2026 R2` on 24 July — one document in three states, not three documents. Manage versions is what models that: the id stays, every pointer keeps resolving, and Drive keeps the superseded bytes retrievable underneath. So you get both issues without a second row, and without a stale row that nothing cites.

**Rename the PDF before you upload it, because that is the only label a version gets.** Drive's *Manage versions* has no field for naming a version: each entry is labelled with the filename of the file that was uploaded, and uploading a version does not rename the file itself. So a version arrives correctly labelled or not at all — put the publisher's revision into the issuer-ref field first (`md-1-2026-r2`), and rename the Drive file to match afterwards so the current name states the current issue.

Then update this row's Document cell to the revision the bytes now hold, and its Retrieved date. Renaming is safe: the id is the durable identifier, so nothing that points here breaks.

A row is only split in two when the publisher issues a genuinely separate document, such as an addendum with its own reference (see `SA-05` and `SA-06`).

## Naming

`<iso-as-at>__<issuer-ref>__<slug>.<ext>`

The **as-at** is the date the document's contents take effect, not the date we fetched it — except for a live web page, which rarely says when its contents took effect, where the as-at IS the capture date. The **issuer-ref** is the publisher's own reference wherever one exists — `MD(W) 01/2025`, `PCS(DD)2025/01`, `HSC (TC8) 05/2025` — because that is what lets a copy be matched back to the publisher. An archive named entirely in private conventions is one nobody else can verify.

## Sharing, and the redaction rule

**Every folder here is shared with anyone who has the link**, including `benefit-statements`. That is safe because of an admission rule, not because benefit statements are harmless:

> **Nothing enters this archive until it is redacted.** A
> document is redacted before it is uploaded, never after.

Redacted means no name, membership number, National Insurance number, address, or anything else that identifies the member. The figures and dates stay — they are the entire point of keeping the document, and they identify nobody on their own.

It is a rule at the door because the failure is unrecoverable: a personal document is public the moment it is shared, and un-sharing it does not undo that.

The corollary is that **an unredacted document has no home here**. If one cannot be redacted, it does not go in the archive — it does not go in a private subfolder either, because a private subfolder inside a shared parent is exactly the arrangement this rule exists to avoid.

## gad-factors

Parent: <https://drive.google.com/drive/folders/1z5uLpdepmR3zool9OKVbfLS_pip6APcO>

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-01"></a>`SA-01` | GAD NHS_EW Consolidated Factors, version 2026-01 | 2026-06-01 | 2026-07-22 | [`1moNeO3yOWIb0LZmSGq58EXAfp-vPKqeE`](https://drive.google.com/file/d/1moNeO3yOWIb0LZmSGq58EXAfp-vPKqeE/view) | <https://gadfactorguidancehub.co.uk/download/consolidated_factors/NHS_EW/NHS_EW_Consolidated_Factors_2026-01.xlsx> |
| <a id="sa-02"></a>`SA-02` | NHSBSA, "Early and Late Retirement Factors" | 2024-02-01 | 2026-07-22 | [`1x7_9gJ3ivL2fmCUO2O-TAm3wgAtB9Mek`](https://drive.google.com/file/d/1x7_9gJ3ivL2fmCUO2O-TAm3wgAtB9Mek/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-02/Early%20and%20Late%20Retirement%20Factors.pdf> |
| <a id="sa-57"></a>`SA-57` | GAD, "NHS Pension Scheme: Summary of the 2020 assumptions used in the actuarial valuation as at 31 March 2020" | 2023-10-19 | 2026-09-23 | [`1ZFD474uVqVSZ1gT-Gx8Sscxb2LWUwt_S`](https://drive.google.com/file/d/1ZFD474uVqVSZ1gT-Gx8Sscxb2LWUwt_S/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2023-10/NHSPS%20-%202020%20valuation%20-%20Assumptions%20summary%20-%2019%20October%202023.pdf> |
| <a id="sa-58"></a>`SA-58` | NHSBSA, "Added benefits: Additional pension factsheet" V15 | 2026-04-01 | 2026-09-25 | [`19QABTLnz2yZnXQjmn_lUrd_8P2z70Uz3`](https://drive.google.com/file/d/19QABTLnz2yZnXQjmn_lUrd_8P2z70Uz3/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2026-03/Added%20benefits-Additional%20pension%20factsheet-20260401-%28V15%29.docx> |

The workbook is the source of record: only it carries the *Version control* sheet that says whether a table has moved. GAD publishes each version at its factor guidance hub, the version in the file name, so a new version is a new URL; the archived copy's worksheets are byte-identical to that download (checked 25 Sep 2026).

**Last checked current:**

- **x-420 and x-421** (2015 Section) on 20 Aug 2026, against version 2026-01: both last updated in version 2023-02, dated 30 June 2023, and 2026-01 touched only x-201 to x-209 and x-301 to x-308. The 25 rows of the two tables were diffed with zero differences.
- **x-401, x-402, x-407 and x-416** (1995 and 2008 Sections) on 23 Sep 2026, against the same version: last updated in 2023-02 and named by no later version. All 544 cells were diffed against the NHSBSA extract with zero differences.
- **x-422 and x-703, x-712 to x-719** (2015 Section additional pension) on 25 Sep 2026, against version 2026-01: x-422 last updated in 2023-02, the purchase tables in 2023-04 (issued 3 October 2023, in use from 1 April 2024), and 2026-01 touched none of them. All 121 cells of x-422 agree with the NHSBSA extract; the 6,660 cells of the purchase tables, which the extract does not carry, were read twice from the workbook, from its cells and from its text export, with zero differences.

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

Kept as served; that is what an archive is for. The *Hourly rates* table prints Band 8d top as `£55,65` (a comma for the decimal point — the page's own divisor confirms £55.65, being 108,814 ÷ 1,955.4), Band 8a entry as `£ 29.42`, and its header shifts between the four- and six-column shapes.

None of it reaches the library. `scales.ts` transcribes the **annual** column and derives hourly through `annualiseHourly`, so the printed hourly figures are never read. The 2025/26 page is clean, and the publisher's own poster agrees on every annual figure.

## pay-reviews

Parent: <https://drive.google.com/drive/folders/1zABHa3-JASApClzXTFq6bVnfBKCeFsy9>

Its own class rather than a pay circular: a Review Body reports *recommendations* to ministers, and an employer circular implements what was *accepted*. The two disagree whenever an award is modified, staged or rejected, so filing them together would lose the distinction that matters when a figure is queried.

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

The oracle for `tests/golden-abs.test.ts`, alongside a [projection built by hand from it][sheet].

[sheet]: https://docs.google.com/spreadsheets/d/1S6CamxFiVqVDsy9rrSd2Lwke38y1N3Pu4x7fhZHoRkA/edit

## revaluation

Parent: <https://drive.google.com/drive/folders/1EjnBGg0Wa8AqZiRfAYM9C3aoyV-dLwDM>

Sources behind the CARE revaluation series in `revaluation.ts` — the rate as legislated and the rate as actually applied.

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
| <a id="sa-59"></a>`SA-59` | DHSC, government response to petition 779519 | 2026-10-19 | 2026-11-05 | [`1Ym8BtDeX4vMoNYOIBygpFIT2XEkTV37e`](https://drive.google.com/file/d/1Ym8BtDeX4vMoNYOIBygpFIT2XEkTV37e/view) | <https://petition.parliament.uk/petitions/779519?reveal_response=yes> |
| <a id="sa-60"></a>`SA-60` | Finance Act 2004 Sch 36 para 23ZB — protected pension age: scheme rights existing before 4 November 2021 | 2026-11-05 | 2026-11-05 | [`1B884GhQ7fdaRx1Ig8Q3Xss2aEt7VGTs_`](https://drive.google.com/file/d/1B884GhQ7fdaRx1Ig8Q3Xss2aEt7VGTs_/view) | <https://www.legislation.gov.uk/ukpga/2004/12/schedule/36/paragraph/23ZB> |
| <a id="sa-61"></a>`SA-61` | SPPA, NHS Circular 2025/09 — increase to the normal minimum pension age from 6 April 2028 (31 Jul 2025; para 9 updated 4 Nov 2025) | 2025-11-04 | 2026-11-05 | [`1eMCF-ttP3RJ2IVDAmEN5CATvXvu6adB6`](https://drive.google.com/file/d/1eMCF-ttP3RJ2IVDAmEN5CATvXvu6adB6/view) | <https://pensions.gov.scot/sites/default/files/2025-07/NHS_Circular_2025-09_Increase_to_the_normal_minimum_pension_age_from_6_April_2028.pdf> |
| <a id="sa-62"></a>`SA-62` | DWP, "State Pension age timetable" | 2014-05-15 | 2026-11-05 | [`17tjmfZqc8BpPftIgbv9JpSFUqfXCJ4N3`](https://drive.google.com/file/d/17tjmfZqc8BpPftIgbv9JpSFUqfXCJ4N3/view) | <https://www.gov.uk/government/publications/state-pension-age-timetable> |
| <a id="sa-63"></a>`SA-63` | NHSBSA, "Understanding your statement: Pension" | 2026-11-07 | 2026-11-07 | [`1s4834sg3mttdxwr4lsJGjCB4MOzHMAu3`](https://drive.google.com/file/d/1s4834sg3mttdxwr4lsJGjCB4MOzHMAu3/view) | <https://www.nhsbsa.nhs.uk/employee-section/understanding-your-statement/pension> |
| <a id="sa-64"></a>`SA-64` | NHSBSA, "Getting an estimate of your pension" | 2026-11-07 | 2026-11-07 | [`1lpR7JUaG4-5Z68f8oPECXJRlBRZyhevd`](https://drive.google.com/file/d/1lpR7JUaG4-5Z68f8oPECXJRlBRZyhevd/view) | <https://www.nhsbsa.nhs.uk/member-hub/getting-estimate-your-pension> |
| <a id="sa-65"></a>`SA-65` | SPPA, "Keep track of your pension" (NHS) | 2026-11-07 | 2026-11-07 | [`1FPJiNtBePPxjqKfcFbgVwzOyt-RqXTqO`](https://drive.google.com/file/d/1FPJiNtBePPxjqKfcFbgVwzOyt-RqXTqO/view) | <https://pensions.gov.scot/nhs/growing-your-pension/keep-track-your-pension> |
| <a id="sa-66"></a>`SA-66` | SPPA, "Understand how much you'll get" (NHS) | 2026-11-07 | 2026-11-07 | [`1evQCp55UrfiZpxtXFQC8qJxzfkVr0zt4`](https://drive.google.com/file/d/1evQCp55UrfiZpxtXFQC8qJxzfkVr0zt4/view) | <https://pensions.gov.scot/nhs/ready-retirement/understand-how-much-youll-get> |
| <a id="sa-67"></a>`SA-67` | HSC Pension Service, "Annual Benefit Statements (HSC)" | 2026-11-07 | 2026-11-07 | [`1VZQUDvhoDWFGFv4rzgVbtA9mkeDj5Q0I`](https://drive.google.com/file/d/1VZQUDvhoDWFGFv4rzgVbtA9mkeDj5Q0I/view) | <https://hscpensions.hscni.net/hsc-pension-scheme/hsc-pension-members-section/annual-benefit-statements-hsc/> |
| <a id="sa-68"></a>`SA-68` | NHSBSA KA-02742 — what's included in a Total Reward Statement | 2026-11-07 | 2026-11-07 | [`1yLx9Ob_cjGTJCSFvFZGnJnIT2IiYX0k6`](https://drive.google.com/file/d/1yLx9Ob_cjGTJCSFvFZGnJnIT2IiYX0k6/view) | <https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-02742/en-us> |
| <a id="sa-69"></a>`SA-69` | NHSBSA KA-04362 — which payments are pensionable? | 2026-11-08 | 2026-11-08 | [`1cSPIuF9DEG0xRoGSZTUgMOheW6zfXIxe`](https://drive.google.com/file/d/1cSPIuF9DEG0xRoGSZTUgMOheW6zfXIxe/view) | <https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-04362/en-us> |
| <a id="sa-70"></a>`SA-70` | NHSBSA, "NHS Pension Scheme member contribution changes: October 2022 requirements" v6.1 (payroll provider requirements) | 2023-11-02 | 2026-11-08 | [`1weE85Rt0QlX9IcPrEAcDjgp8h9hnjdSt`](https://drive.google.com/file/d/1weE85Rt0QlX9IcPrEAcDjgp8h9hnjdSt/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2023-11/MemberContributionChanges_PayrollProviderRequirements_v6.1_FINAL_112023.pdf> |
| <a id="sa-71"></a>`SA-71` | NHSBSA, "Pensionable pay" factsheet V5 | 2024-07-18 | 2026-11-08 | [`13VZSYlH4Kl9DuHnnAuJ6rz_s0dS7GNcY`](https://drive.google.com/file/d/13VZSYlH4Kl9DuHnnAuJ6rz_s0dS7GNcY/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-07/Pensionable%20pay%20factsheet-20240718-%28V5%29.docx> |
| <a id="sa-72"></a>`SA-72` | SPPA, "Pensionable Allowances and Pay Enhancements" (NHS; accordions expanded for capture) | 2026-11-08 | 2026-11-08 | [`1QMLvy4ROkkNWYkA9kJQb9YfX9Xyn2DuA`](https://drive.google.com/file/d/1QMLvy4ROkkNWYkA9kJQb9YfX9Xyn2DuA/view) | <https://pensions.gov.scot/nhs/employers/pensionable-allowances-and-pay-enhancements> |
| <a id="sa-73"></a>`SA-73` | HSC Pension Service, Employer Technical Update HSC (P) 04-17/18 (Quarter 4 2017-18) | 2018-03 | 2026-11-08 | [`15izopx5xMnhKQ62TPyAF-pVnC95idnUJ`](https://drive.google.com/file/d/15izopx5xMnhKQ62TPyAF-pVnC95idnUJ/view) | <https://hscpensions.hscni.net/wp-content/uploads/2024/07/Employer-Technical-Update-Quarter-4-2017-2018.pdf> |
| <a id="sa-74"></a>`SA-74` | SI 2015/94 reg 27 — pensionable earnings | 2026-11-08 | 2026-11-08 | [`1DX-RqaVhNqUzsKZR55dBbz3XM5SLAZ7M`](https://drive.google.com/file/d/1DX-RqaVhNqUzsKZR55dBbz3XM5SLAZ7M/view) | <https://www.legislation.gov.uk/uksi/2015/94/regulation/27> |
| <a id="sa-75"></a>`SA-75` | SI 2015/94 Sch 15 — definitions (including "overtime" as substituted by SI 2025/316) | 2026-11-08 | 2026-11-08 | [`14byo_JjKgx0bbSfxfaQQrSmvkBecaGbH`](https://drive.google.com/file/d/14byo_JjKgx0bbSfxfaQQrSmvkBecaGbH/view) | <https://www.legislation.gov.uk/uksi/2015/94/schedule/15> |
| <a id="sa-38"></a>`SA-38` | NHSBSA 2015 Members' Guide V13 | 2024-05-01 | 2026-08-20 | [`1wp3F-7zrDPxbtqjWz_cU13XYkegt382M`](https://drive.google.com/file/d/1wp3F-7zrDPxbtqjWz_cU13XYkegt382M/view) | <https://www.nhsbsa.nhs.uk/sites/default/files/2024-05/2015%20Members%20Guide%20%28V13%29%2005.2024.pdf> |

## terms-of-service

Parent: <https://drive.google.com/drive/folders/1J_AT1q4nzcECKqNkh9CLcOvS99k5kjmm>

Medical and dental terms and conditions of service, and the model terms for salaried posts.

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-76"></a>`SA-76` | England, TCS for NHS Doctors and Dentists in Training 2016, version 14 | 2026-06-01 | 2026-11-08 | [`1x7rKTnpiwxmFt_elgUeSXpu7Sp5TztBr`](https://drive.google.com/file/d/1x7rKTnpiwxmFt_elgUeSXpu7Sp5TztBr/view) | <https://www.nhsemployers.org/system/files/2026-06/Doctors-dentists-in-training-2016-TCS-version-14-June-2026.pdf> |
| <a id="sa-77"></a>`SA-77` | Wales, TCS Resident Doctors and Dentists (Wales) 2026, version 1.3 (introduced by M&D(W) 04/2026) | 2026-08-01 | 2026-11-08 | [`1GsBn_fjO3sweX6Cvan216H7_63ySMywx`](https://drive.google.com/file/d/1GsBn_fjO3sweX6Cvan216H7_63ySMywx/view) | <https://nhs-alliance.uksouth01.umbraco.io/media/2bshz5sg/2026_08_21-tcs-resident-doctors-and-dentists-version-13-2026-updated-published.pdf> |
| <a id="sa-78"></a>`SA-78` | England, Terms and Conditions – Consultants (England) 2003, version 16 | 2025-05-12 | 2026-11-08 | [`1wRjszmmULURXKjJo9N2dL8UKSv-gRJle`](https://drive.google.com/file/d/1wRjszmmULURXKjJo9N2dL8UKSv-gRJle/view) | <https://www.nhsemployers.org/system/files/2025-05/Terms-and-Conditions-Consultants-%28England%29-2003-Version-16-May-2025.pdf> |
| <a id="sa-79"></a>`SA-79` | Wales, Amendment to the National Consultant Contract in Wales (Welsh Assembly Government, ISBN 0 7504 3457 0; the publisher's copy is hosted by the BMA) | 2004-07 | 2026-11-08 | [`1gVConTpXURL13zOzpwKrrJF4e6KMuGXn`](https://drive.google.com/file/d/1gVConTpXURL13zOzpwKrrJF4e6KMuGXn/view) | <https://www.bma.org.uk/media/cbippmkw/bma-amendment-to-the-national-consultant-contract-in-wales.pdf> |
| <a id="sa-80"></a>`SA-80` | Scotland, Consultant Grade Terms and Conditions of Service, consolidated as at August 2007 (PCS(DD)2004/2 as amended) | 2007-08 | 2026-11-08 | [`1fZEuV2G09Eh1aPJ-RJy1FLhXfndOYfBv`](https://drive.google.com/file/d/1fZEuV2G09Eh1aPJ-RJy1FLhXfndOYfBv/view) | <https://www.msg.scot.nhs.uk/wp-content/uploads/Consultant-contract-2007-version.doc> |
| <a id="sa-81"></a>`SA-81` | Northern Ireland, Consultant Terms and Conditions of Service (NI) 2004, version 4 | 2013-04 | 2026-11-08 | [`1F8-ha3c4ueabo_EZ93x0eUNX81K7mVmy`](https://drive.google.com/file/d/1F8-ha3c4ueabo_EZ93x0eUNX81K7mVmy/view) | <https://www.health-ni.gov.uk/sites/default/files/publications/dhssps/consultants-terms-2013.pdf> |
| <a id="sa-82"></a>`SA-82` | England, TCS Specialty Doctors (England) 2021, version 2 | 2022-06-09 | 2026-11-08 | [`1dIR3QpGqRZrQDklj5FVbgkgk2nJYXdRx`](https://drive.google.com/file/d/1dIR3QpGqRZrQDklj5FVbgkgk2nJYXdRx/view) | <https://www.nhsemployers.org/system/files/2022-06/Specialty-Doctor-terms-and-conditions-June-2022.pdf> |
| <a id="sa-83"></a>`SA-83` | England, TCS Specialists (England) 2021, version 2 | 2022-06-09 | 2026-11-08 | [`1QM17UGYgSXf07WQXCYuy5jh2cBejw2Tx`](https://drive.google.com/file/d/1QM17UGYgSXf07WQXCYuy5jh2cBejw2Tx/view) | <https://nhsemployers.org/system/files/2022-06/Specialist-terms-and-conditions-June-2022.pdf> |
| <a id="sa-84"></a>`SA-84` | Scotland, PCS(DD)2022/2 — new contract for the Specialty Doctor grade | 2022-12-01 | 2026-11-08 | [`1Nk39CxB1Ln8Ky1sFIzvIrCgSAU-0rY5l`](https://drive.google.com/file/d/1Nk39CxB1Ln8Ky1sFIzvIrCgSAU-0rY5l/view) | <https://www.sehd.scot.nhs.uk/pcs/PCS2022%28DD%2902.pdf> |
| <a id="sa-85"></a>`SA-85` | Scotland, PCS(DD)2022/3 — new contract for the Specialist Doctor grade | 2022-12-01 | 2026-11-08 | [`1BM_Ps825yRLbGdA5ZAJKtCqXXWnrm3Ue`](https://drive.google.com/file/d/1BM_Ps825yRLbGdA5ZAJKtCqXXWnrm3Ue/view) | <https://www.sehd.scot.nhs.uk/pcs/PCS2022%28DD%2903.pdf> |
| <a id="sa-86"></a>`SA-86` | Wales, TCS Specialty Doctor (Wales), version 4 | 2024-10 | 2026-11-08 | [`1Yzb6Bt7Iyn9uqjC0dO-HihWobkh370wT`](https://drive.google.com/file/d/1Yzb6Bt7Iyn9uqjC0dO-HihWobkh370wT/view) | <https://nhs-alliance.uksouth01.umbraco.io/media/e4uhtlhv/2024-terms-and-conditions-of-service-specialty-doctor-wales-2024.pdf> |
| <a id="sa-87"></a>`SA-87` | Wales, TCS Specialist (Wales), version 3 | 2024-10 | 2026-11-08 | [`1H4i9nmuJwgDNucF_AKNIpPSkLBdw9dUY`](https://drive.google.com/file/d/1H4i9nmuJwgDNucF_AKNIpPSkLBdw9dUY/view) | <https://nhs-alliance.uksouth01.umbraco.io/media/1nelvao1/2024-terms-and-conditions-of-service-specialist-doctor-wales-2024.pdf> |
| <a id="sa-88"></a>`SA-88` | Northern Ireland, TCS Specialty Doctors – Northern Ireland (2021) | 2021-07-20 | 2026-11-08 | [`1Nl75b-eP-TR31m3XDd4gOokxfnSIGzJT`](https://drive.google.com/file/d/1Nl75b-eP-TR31m3XDd4gOokxfnSIGzJT/view) | <https://www.health-ni.gov.uk/sites/default/files/publications/health/doh-terms-and-conditions-of-service-specialty-doctor.pdf> |
| <a id="sa-89"></a>`SA-89` | Northern Ireland, TCS Specialist – Northern Ireland (2021) | 2021-07-20 | 2026-11-08 | [`1XydCROEmRTlIlHy7SLYOhI8luclqnCtG`](https://drive.google.com/file/d/1XydCROEmRTlIlHy7SLYOhI8luclqnCtG/view) | <https://www.health-ni.gov.uk/sites/default/files/publications/health/doh-terms-and-conditions-of-service-specialist.pdf> |
| <a id="sa-90"></a>`SA-90` | England, model terms and conditions of service for a salaried GP employed by a GMS practice | 2009-04-15 | 2026-11-08 | [`1nJ_nhR15dYYQ9t0MHvSEu1iqlGi1hN3b`](https://drive.google.com/file/d/1nJ_nhR15dYYQ9t0MHvSEu1iqlGi1hN3b/view) | <https://nhsemployers.org/system/files/2021-06/TCS-GP-GMS-150409.pdf> |
| <a id="sa-91"></a>`SA-91` | England, Salaried Primary Dental Care Services TCS, V3 | 2024-06 | 2026-11-08 | [`1CwriUDvKXDhkNoHeTv5RY-u-m99YZtDG`](https://drive.google.com/file/d/1CwriUDvKXDhkNoHeTv5RY-u-m99YZtDG/view) | <https://www.nhsemployers.org/system/files/2024-06/salaried-dental-terms-and-conditions-june-2024.pdf> |

## illustrative-examples

Parent: <https://drive.google.com/drive/folders/1ux14kJSdBdThfiOZB5gBrgXiJDcg_Vqg>

A worked example published by a third party. Evidence for what a document's lines are called and how one line is computed from its rate and hours, never for a total or a rate.

| Id | Document | As at | Retrieved | Drive id | Authoritative URL |
| -- | -------- | ----- | --------- | -------- | ----------------- |
| <a id="sa-92"></a>`SA-92` | Dummy ESR payslip ("Mrs Test Employee", tax period 2, May 2022), a frame of a public video explaining an NHS payslip | 2022-05-31 | 2026-11-08 | [`1JtB2JlX3zGd5XlK_WMK2qlxpNJpZ-FHy`](https://drive.google.com/file/d/1JtB2JlX3zGd5XlK_WMK2qlxpNJpZ-FHy/view) | <https://www.youtube.com/watch?v=92I5jOt2pWk> |
