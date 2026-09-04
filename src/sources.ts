/**
 * Every published document this library cites, as one record each.
 *
 * One document, one record. The same circular is frequently the source
 * of more than one kind of figure — PCS(AFC)2026/1 sets Scotland's AfC
 * award, publishes its pay scales AND sets its on-call availability
 * allowance — so a second copy of its url or issue date is a second
 * copy that can fall out of step with the first.
 *
 * Three kinds live here and the difference is load-bearing:
 *
 * - **Award instruments** — what a nation ACCEPTED. A written
 *   ministerial statement, a gov.scot news page, a Welsh written
 *   statement. Prints a percentage, usually no pay table.
 * - **Scale circulars** — what PUBLISHES the salary figures. Prints a
 *   pay table, often no percentage at all.
 * - **Allowance letters** — what sets a cash allowance per session.
 *
 * They diverge in every nation. England's 2026-27 medical award was
 * enacted by HCWS1462 on parliament.uk while its salaries are printed
 * in PC(M&D) 1/2026 R2 on nhsemployers.org. Reading the award's source
 * under a salary table puts a parliamentary statement beneath a list of
 * salaries — and Northern Ireland has no medical award record at all
 * while still rendering a table that needs a citation.
 *
 * Employer-body summaries are deliberately not cited: accurate as they
 * are, they restate a document rather than being one.
 *
 * `url` is the publisher's own link, never the archived copy.
 * `docs/source-archive.md` is the one home for archive links; a Drive
 * id in a second place is a Drive id that can fall out of step with the
 * manifest.
 */

import type {DocumentSource} from './document-source.js';

// ── Award instruments: medical & dental ──────────

/** The 54th DDRB round, as accepted by each government. The report
 *  itself is NOT the source: a recommendation can be modified, staged
 *  or refused on the way in, and when it is, the acceptance is right
 *  and the report is not. */
export const DDRB_54_ENGLAND: DocumentSource = {
  issuer: 'the UK government',
  reference: 'written ministerial statement HCWS1462',
  url: 'https://questions-statements.parliament.uk/written-statements'
    + '/detail/2026-03-25/hcws1462',
  issued: '2026-03-25',
  // The DDRB reports annually and government responds in the
  // spring, ahead of the April start.
  nextExpected: '2027-04-01',
};

export const DDRB_54_WALES: DocumentSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 54th DDRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-54th-doctors-and-dentists-review-body',
  issued: '2026-03-25',
  nextExpected: '2027-04-01',
};

export const DDRB_54_SCOTLAND: DocumentSource = {
  issuer: 'the Scottish Government',
  reference: 'NHS pay awards',
  url: 'https://www.gov.scot/news/nhs-pay-awards/',
  issued: '2026-08-12',
  nextExpected: '2027-04-01',
};

// ── Award instruments: Agenda for Change ─────────

export const AFC_ENGLAND_2025: DocumentSource = {
  issuer: 'the UK government',
  reference: 'NHS pay award 2025 to 2026',
  url: 'https://www.gov.uk/government/publications'
    + '/nhs-pay-awards-2025-to-2026-agenda-for-change-staff'
    + '/nhs-pay-award-2025-to-2026-a-fair-deal-for-nhs-staff',
  issued: '2025-05-22',
};

export const AFC_ENGLAND_2026: DocumentSource = {
  issuer: 'the UK government',
  reference: 'written ministerial statement HCWS1340',
  url: 'https://questions-statements.parliament.uk/written-statements'
    + '/detail/2026-02-12/hcws1340',
  issued: '2026-02-12',
  // The AfC round is annual and effective 1 April; the review
  // body reports and the government responds in the months
  // before it.
  nextExpected: '2027-04-01',
};

export const AFC_WALES_2025: DocumentSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 38th NHSPRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-38th-nhs-pay-review-body'
    + '-and-53rd-doctors-and-dentists-review-body',
  issued: '2025-05-22',
};

export const AFC_WALES_2026: DocumentSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 39th NHSPRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-39th-nhs-pay-review-body',
  issued: '2026-02-12',
  nextExpected: '2027-04-01',
};

/**
 * Northern Ireland's 2026-27 figure rests on a WEAKER instrument than
 * every other award row, and the difference is not modelled — it is
 * recorded here so a maintainer knows.
 *
 * The Health Minister stated a desire to proceed with 3.3% for AfC
 * staff in 2026/27, explicitly subject to his budgetary position; no
 * HSC pay circular implementing it had been issued as at 3 Sep 2026.
 * Every other row is a settled acceptance or an implementing circular.
 * Carrying that distinction as a field was considered and rejected:
 * the caveat's only use is wording on a page, and presentation copy is
 * the consumer's. Re-check for an implementing circular before relying
 * on this row, and revisit the decision if a second conditional award
 * ever appears.
 *
 * It is NOT the source of any scale. NI has published no 2026-27 pay
 * table, so `afcScaleSource` has no 2026-27 row for it and
 * `getAfcScales` throws for that year — HSC staff are still paid on
 * HSC (AfC) 06/2025. An announced award and a published scale are
 * different things, and this record is only the first.
 *
 * Confirmed 3 Sep 2026 against primary sources: no 2026-27 HSC (AfC)
 * or HSC (TC8) circular exists, and the last three rounds all landed
 * late and were backdated — 2025/26 was announced in November 2025 and
 * paid in February 2026, backdated to 1 April 2025.
 */
export const AFC_NI_2026: DocumentSource = {
  issuer: 'the Department of Health (NI)',
  reference: 'Health Minister’s statement on 2026/27 HSC pay',
  url: 'https://www.health-ni.gov.uk/news'
    + '/health-minister-reaffirms-commitment-time-pay-settlement-health-staff',
  issued: '2026-02-12',
  // Deliberately in the past. This is a ministerial statement of
  // intent, explicitly subject to the NI Executive's budget, and the
  // HSC (AfC) circular that would implement it has not appeared —
  // so a reader is looking at an announced figure with no
  // instrument behind it. Recording the lapse is the honest
  // position: the delay is the publisher's, and saying so is more
  // use to an NI reader than silence.
  nextExpected: '2026-04-01',
  nextExpectedReason:
    'the implementing HSC (AfC) pay circular. The 3.3% is unfunded — '
    + 'the Minister made it conditional on his budgetary position — '
    + 'and no implementation date has been stated publicly',
};

// ── Scale circulars: Agenda for Change ───────────

/**
 * The documents NHS Employers publishes the England/NI AfC scales in.
 * Unlike the devolved nations these are not numbered circulars — NHS
 * Employers states the scales on a per-year page — so `reference`
 * names the publisher's own title for each.
 *
 * One per year, deliberately. A single year-blind record cites the
 * 2026/27 page beneath a 2025-26 pay table, which is the defect this
 * pair exists to stop.
 */
export const AFC_ENGLAND_SCALES_2025: DocumentSource = {
  issuer: 'NHS Employers',
  reference: 'Pay scales for 2025/26',
  url: 'https://www.nhsemployers.org'
    + '/articles/pay-scales-202526',
  issued: '2025-05-22',
};

export const AFC_ENGLAND_SCALES_2026: DocumentSource = {
  issuer: 'NHS Employers',
  reference: 'Pay scales for 2026/27',
  url: 'https://www.nhsemployers.org'
    + '/articles/pay-scales-202627',
  issued: '2026-02-12',
  nextExpected: '2027-04-01',
};

/**
 * Northern Ireland's AfC pay arrangements circular — the instrument
 * that PUBLISHES the NI scales. NI's is not England's: it has its own
 * issuer, its own reference and its own date, even though the salary
 * figures it prints are identical to England's for 2025-26.
 */
export const AFC_NI_2025: DocumentSource = {
  issuer: 'the Department of Health (NI)',
  reference: 'HSC (AfC) 06/2025',
  url: 'https://www.health-ni.gov.uk/sites/default/files/2025-12'
    + '/HE1%2025%20379860%20%20HSC%20%28AfC%29%20%286%29%202025%20-%20'
    + 'Agenda%20for%20Change%20Pay%20Arrangements%202025-26.pdf',
  issued: '2025-12-03',
};

/**
 * The circular that PUBLISHES the Welsh scales and allowances.
 *
 * Distinct from {@link AFC_WALES_2026}, which is the written
 * statement ANNOUNCING the percentage: the statement prints no
 * pay table and no allowance rate, so it cannot be the source of
 * either figure.
 */
export const AFC_W_02_2026: DocumentSource = {
  issuer: 'NHS Wales',
  reference: 'circular AfC(W) 02/2026',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/afc-w-02-2026-pdf-pdf/',
  // The date on the circular's face, not the date its rates
  // take effect (1 April 2026) — `issued` is when the
  // publisher said it, which is what dates the citation.
  issued: '2026-02-12',
  nextExpected: '2027-04-01',
};

/** The prior year's Welsh circular. Same role as
 *  {@link AFC_W_02_2026}: it publishes Wales's own ladder and its
 *  allowance table, where the written statement announces only a
 *  percentage. */
export const AFC_W_02_2025: DocumentSource = {
  issuer: 'NHS Wales',
  reference: 'circular AfC(W) 02/2025',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/afc-w-02-2025-pdf-2-pdf/',
  issued: '2025-05-29',
};

/**
 * Both Scottish years. The two-year deal was ENACTED by
 * PCS(AFC)2025/5; this circular revised its 2025-26 figure once the
 * inflation guarantee triggered, and restates the 2026-27 one — so it
 * is the current source for both years' scales, and for Scotland's AfC
 * award and its on-call availability allowance.
 */
export const AFC_SCOTLAND: DocumentSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(AFC)2026/1',
  url: 'https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf',
  issued: '2026-01-23',
  // NOT the annual round — a REVISION lands first. Annex A carries
  // the same inflation guarantee into 2026-27: if CPI for calendar
  // 2026 averages above 2.75%, pay is adjusted, and the 2025-26
  // adjustment was paid the March after the calendar year. So the
  // next instrument to touch these figures is due around March
  // 2027, ahead of the 2027-28 round. Dating this at the annual
  // cycle would have us believe the figures were current through a
  // restatement — which is exactly how the 4.25% column stayed on
  // the site for a year.
  nextExpected: '2027-03-01',
  nextExpectedReason:
    'a possible restatement under the settlement\'s inflation '
    + 'guarantee, once CPI for calendar 2026 is confirmed',
};

// ── Scale circulars: medical & dental ────────────
//
// One record per transcription in `src/circulars/`. `issued` is the
// date on the document's own face, read from the document — not the
// date its rates take effect, and not the date we retrieved it.

/**
 * England's medical & dental scales. **R2 is the third state of one
 * document**, not a third document: first published 11 May 2026,
 * updated 30 June, and reissued 24 July 2026 amending the training
 * scales and the mirrored locally-employed nodal points. The archive
 * holds it as one row (`#sa-03`) with three versions, and the earlier
 * two are withdrawn — their urls 404 and 403 respectively.
 */
export const PC_MD_1_2026_R2: DocumentSource = {
  issuer: 'NHS Employers',
  reference: 'Pay & Conditions Circular (M&D) 1/2026 R2',
  url: 'https://www.nhsemployers.org/system/files/2026-07'
    + '/Pay-and-Conditions-Circular-%28MD%29-1-2026-R2.pdf',
  issued: '2026-07-24',
  nextExpected: '2027-04-01',
};

/**
 * Scotland's 2026/27 round is split across TWO circulars and both are
 * current: 2026/01 covers the training grades and defers the rest to
 * an addendum; 2026/02 carries everything else. A nation-year is
 * therefore not enough to identify a scale's source, which is why the
 * source is held per grade.
 */
export const PCS_DD_2026_01: DocumentSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(DD)2026/01',
  url: 'https://www.publications.scot.nhs.uk/files/pcs-dd-2026-01.pdf',
  issued: '2026-04-01',
  nextExpected: '2027-04-01',
};

export const PCS_DD_2026_02: DocumentSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(DD)2026/02',
  url: 'https://www.publications.scot.nhs.uk/files/pcs-dd-2026-02.pdf',
  issued: '2026-08-12',
  nextExpected: '2027-04-01',
};

/** Scotland's 2025/26 medical & dental round. Its own addendum
 *  (`#sa-06`) carries the training grades at a different uplift —
 *  4.25% against the circular's 4% — and both are transcribed in the
 *  one source file. */
export const PCS_DD_2025_01: DocumentSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(DD)2025/01',
  url: 'https://www.publications.scot.nhs.uk/files/pcs2025-dd-01.pdf',
  issued: '2025-06-11',
};

/**
 * The Residents Addendum to PCS(DD)2025/01 — a genuinely separate
 * document, not a revision of the circular, which is why the archive
 * gives it its own row (`#sa-06`) rather than a version beneath
 * `#sa-05`.
 *
 * It carries Scotland's 2025/26 TRAINING grades at a **4.25%** uplift
 * where the main circular carries the non-training scales at **4%** —
 * two uplifts, two documents, one year. A grade in that year cites
 * whichever of the two actually printed it.
 */
export const PCS_DD_2025_01_ADDENDUM: DocumentSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(DD)2025/01 addendum',
  url: 'https://www.publications.scot.nhs.uk/files/pcs2025-dd-01add.pdf',
  issued: '2025-11-26',
};

export const MD_W_01_2026: DocumentSource = {
  issuer: 'NHS Wales',
  reference: 'circular M&D(W) 01/2026',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/md-w-0126-pay-award-02-04-26-version-2/',
  issued: '2026-05-05',
  nextExpected: '2027-04-01',
};

/** Wales's 2025/26 medical & dental circular, **v3**. It was reissued
 *  from the 11 June version because the earlier one omitted that the
 *  4% uplift also covered GMPs; the pay scales themselves were already
 *  uplifted in the 29 May circular. `issued` is v3's own date. */
export const MD_W_01_2025: DocumentSource = {
  issuer: 'NHS Wales',
  reference: 'circular M&D(W) 01/2025',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/md-w-01-25-pay-award-v3-pdf/',
  issued: '2025-08-05',
};

/**
 * Northern Ireland's medical & dental circular. NI has published no
 * 2026-27 successor, so this remains the current source for its
 * doctor and dentist scales — and there is no NI medical AWARD record
 * at all, which is precisely why a scale cannot cite an award's
 * source and expect an answer.
 */
export const HSC_TC8_05_2025: DocumentSource = {
  issuer: 'the Department of Health (NI)',
  reference: 'circular HSC(TC8) 05/2025',
  url: 'https://www.health-ni.gov.uk/sites/default/files/2025-12'
    + '/HSC%20%28TC8%29%2005%202025%20-%20Pay%20and%20Conditions'
    + '%20of%20Service%20for%20Hospital%20Medical%20and%20Dental%20Staff.PDF',
  issued: '2025-12-02',
  // Deliberately in the past: the 2026-27 round should have produced
  // a successor by April 2026 and none has appeared.
  nextExpected: '2026-04-01',
  nextExpectedReason:
    'the 2026-27 HSC(TC8) medical & dental pay circular, which has '
    + 'not been issued',
};
