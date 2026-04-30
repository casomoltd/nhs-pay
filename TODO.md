# TODO

## Scotland AFC hours

Scotland has reduced contracted hours for 2026-27.
`AFC_HOURS_PER_YEAR` is currently a single constant
(37.5 * 52 = 1950) used by `annualiseHourly()` and
hub-site's pay chart. It needs to become region-aware
so that Scottish hourly rates are calculated correctly.

## Move test fixtures into artefacts

Regression test CSVs (`tests/fixtures/`) should live in
the artefacts submodule (`hub-site/data/artefacts/nhs-pay/`)
so provenance is tracked alongside other golden-value
artefacts. Currently blocked because the relative path
between repos is fragile. Options to explore:

- Environment variable pointing to the artefacts root
- Symlink from `tests/fixtures/` into the submodule
- Workspace-level config that sets the path
