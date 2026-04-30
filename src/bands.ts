/**
 * Merge layer — combines static band metadata with
 * year-specific salary data and pension tiers.
 *
 * Role descriptions sourced from NHS Health Careers:
 * https://www.healthcareers.nhs.uk/working-health/working-nhs/nhs-pay-and-benefits/agenda-change-pay-rates
 */

import type {TaxYear} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import type {
  AfcBandId,
  ScalePoint,
  HcasZones,
} from './scales.js';
import {
  AFC_BAND_IDS,
  getScalesForYear,
} from './scales.js';
import type {PensionTier} from './pension.js';
import {getPensionTiers} from './pension.js';

// ── Band metadata ───────────────────────────────

export interface AfcBandInfo {
  slug: string;
  label: string;
  roles: string;
  roleContext: string;
}

export const AFC_BAND_INFO: Record<
  AfcBandId, AfcBandInfo
> = {
  '2': {
    slug: 'nhs-band-2-pay',
    label: 'Band 2',
    roles:
      'Healthcare assistants,'
      + ' housekeeping, security',
    roleContext:
      'Entry-level support roles including'
      + ' domestic support workers,'
      + ' housekeeping assistants, drivers,'
      + ' security officers and healthcare'
      + ' assistants.',
  },
  '3': {
    slug: 'nhs-band-3-pay',
    label: 'Band 3',
    roles:
      'Emergency care assistants,'
      + ' therapy support workers',
    roleContext:
      'Experienced support roles such as'
      + ' emergency care assistants and'
      + ' occupational therapy support'
      + ' workers.',
  },
  '4': {
    slug: 'nhs-band-4-pay',
    label: 'Band 4',
    roles:
      'Assistant practitioners,'
      + ' pharmacy technicians',
    roleContext:
      'Roles requiring specialist training'
      + ' including assistant practitioners,'
      + ' pharmacy technicians, dental nurses'
      + ' and trainee psychological wellbeing'
      + ' practitioners.',
  },
  '5': {
    slug: 'nhs-band-5-pay',
    label: 'Band 5',
    roles:
      'Newly qualified nurses,'
      + ' midwives, therapists',
    roleContext:
      'The entry point for newly qualified'
      + ' clinical professionals including'
      + ' nurses, operating department'
      + ' practitioners, podiatrists and'
      + ' therapeutic radiographers.',
  },
  '6': {
    slug: 'nhs-band-6-pay',
    label: 'Band 6',
    roles:
      'Senior nurses,'
      + ' specialist practitioners',
    roleContext:
      'Experienced clinical and specialist'
      + ' roles such as school nurses,'
      + ' paramedics, estates officers and'
      + ' health records managers.',
  },
  '7': {
    slug: 'nhs-band-7-pay',
    label: 'Band 7',
    roles:
      'Team leaders,'
      + ' advanced practitioners',
    roleContext:
      'Advanced and management roles'
      + ' including communications managers,'
      + ' estates managers and advanced'
      + ' speech and language therapists.',
  },
  '8a': {
    slug: 'nhs-band-8a-pay',
    label: 'Band 8a',
    roles:
      'Modern matrons, nurse consultants',
    roleContext:
      'Senior specialist and management'
      + ' roles such as consultant'
      + ' prosthetists, dental laboratory'
      + ' managers, modern matrons and nurse'
      + ' consultants.',
  },
  '8b': {
    slug: 'nhs-band-8b-pay',
    label: 'Band 8b',
    roles:
      'Heads of service, strategic managers',
    roleContext:
      'Strategic management and senior'
      + ' clinical leadership including heads'
      + ' of education, clinical physiology'
      + ' service managers and head'
      + ' orthoptists.',
  },
  '8c': {
    slug: 'nhs-band-8c-pay',
    label: 'Band 8c',
    roles:
      'Heads of HR,'
      + ' consultant clinical scientists',
    roleContext:
      'Senior leadership roles such as'
      + ' heads of human resources,'
      + ' consultant clinical scientists and'
      + ' consultant paramedics.',
  },
  '8d': {
    slug: 'nhs-band-8d-pay',
    label: 'Band 8d',
    roles:
      'Chief nurses, chief finance managers',
    roleContext:
      'Executive-level clinical and'
      + ' corporate roles including consultant'
      + ' psychologists, chief nurses and'
      + ' chief finance managers.',
  },
  '9': {
    slug: 'nhs-band-9-pay',
    label: 'Band 9',
    roles: 'Directors, chief officers',
    roleContext:
      'The most senior AfC roles including'
      + ' podiatric surgery consultants, chief'
      + ' finance managers and directors of'
      + ' estates and facilities.',
  },
};

// ── Merged scale data ───────────────────────────

export interface AfcBandMeta {
  band: AfcBandId;
  slug: string;
  label: string;
  roles: string;
  roleContext: string;
  points: ScalePoint[];
  salaryMin: number;
  salaryMax: number;
}

export interface AfcScaleData {
  bands: AfcBandMeta[];
  hcas: HcasZones;
  pensionTiers: PensionTier[];
}

/** Current financial year for band pages. */
export const AFC_CURRENT_YEAR = TAX_YEARS.Y2026_27;

/** Previous financial year for comparison. */
export const AFC_PREVIOUS_YEAR = TAX_YEARS.Y2025_26;

/** healthcareers.nhs.uk AfC pay rates page */
export const AFC_SOURCE_URL =
  'https://www.healthcareers.nhs.uk'
  + '/working-health/working-nhs'
  + '/nhs-pay-and-benefits'
  + '/agenda-change-pay-rates';

/** Load AFC scale data — synchronous, no file I/O. */
export function getAfcScales(
  year: TaxYear = AFC_CURRENT_YEAR,
): AfcScaleData {
  const scaleYear = getScalesForYear(year);
  const pensionTiers = getPensionTiers(year);

  const bands = AFC_BAND_IDS.map((band) => {
    const info = AFC_BAND_INFO[band];
    const points = scaleYear.scales[band];
    const salaries = points.map(
      (p) => p.salary,
    );
    return {
      band,
      ...info,
      points,
      salaryMin: Math.min(...salaries),
      salaryMax: Math.max(...salaries),
    };
  });

  return {
    bands,
    hcas: scaleYear.hcas,
    pensionTiers,
  };
}
