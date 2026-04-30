import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import {createLibConfig} from '@casomoltd/tooling/eslint-lib';

export default createLibConfig({tseslint, sonarjs});
