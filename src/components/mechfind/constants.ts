import type { FormState } from './types';

export const DEFAULT_EXAMPLE =
  'CC(=O)SCC.[OH2:1].[NH3+]CC>>CC(=O)NCC.SCC.[OH3+:1]';

export const DEFAULT_FORM: FormState = {
  reaction: '',
  radius: 1,
  max_steps: 20,
  iterations: 10,
  time_limit: 120,
};
