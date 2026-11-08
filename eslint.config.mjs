import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import {createLibConfig} from '@casomoltd/tooling/eslint-lib';

export default [
  ...createLibConfig({tseslint, sonarjs}),
  {
    // A deliberate, permanent deviation. These modules are transcribed
    // published tables (GAD factor workbooks, pay circulars): each number is
    // the source's own figure, cited at the data and pinned to a fixture
    // (docs/source-archive.md). Naming every entry would say nothing the
    // citation does not, and listing the files as lint debt would refuse
    // every future round of figures.
    files: ['src/gad/**', 'src/circulars/**'],
    rules: {'@typescript-eslint/no-magic-numbers': 'off'},
  },
  {
    // A deliberate deviation for as long as `projectPension` is
    // deprecated: these tests hold it to its oracle and to
    // `memberBenefits` until it is retired
    // (https://github.com/casomoltd/nhs-pay/issues/21). Delete this
    // block with it.
    files: [
      'tests/golden-abs.test.ts',
      'tests/pension-projection.test.ts',
      'tests/projection-agreement.test.ts',
    ],
    rules: {'sonarjs/deprecation': 'off'},
  },
];
