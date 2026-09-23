/**
 * Verbatim transcription — GAD, "NHS Pension Scheme: Summary of the
 * 2020 assumptions used in the actuarial valuation as at 31 March
 * 2020", 19 October 2023, page 3, "Promotional pay increases".
 *
 * Source: see docs/source-archive.md#sa-57. Mirrored cell by cell,
 * from the PDF's text, in tests/fixtures/gad-promotional-scale-2020.csv.
 *
 * This summary is the document that prints the table. The valuation
 * results report does not contain it, and the advice-on-assumptions
 * report discusses it (Part B6) without reprinting it, so neither is
 * cited for these figures.
 *
 * Index values by age, relative to 100 at age 25: growth in pay from
 * promotion and progression OVER AND ABOVE general pay awards, which
 * is why it composes with a pay figure in today's money without
 * counting the awards twice. All four published columns are
 * transcribed, so none is ever guessed later; which ones a caller
 * reads is `promotionalIndex`'s decision, not this file's.
 *
 * Delete this file whole when a later valuation's summary supersedes
 * it; git history is the archive.
 */
export const PROMOTIONAL_SCALE_2020 = {
  ages: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
  /** "Non-manual Officers and Practitioners" — every Agenda for
   *  Change band. */
  nonManual: {
    male: [73, 100, 132, 165, 195, 215, 229, 236, 242, 242],
    female: [77, 100, 125, 140, 151, 157, 162, 166, 169, 169],
  },
  /** "Manual Officers". */
  manual: {
    male: [83, 100, 120, 136, 146, 155, 161, 165, 165, 165],
    female: [83, 100, 120, 132, 140, 144, 147, 148, 148, 148],
  },
} as const;
