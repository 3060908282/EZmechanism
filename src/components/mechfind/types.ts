export interface MCSAMatch {
  mcsa_id: string | number;
  enzyme_name?: string;
  score?: number;
  [key: string]: unknown;
}

export interface Mechanism {
  rank: number;
  similarity: number;
  score?: number;
  rules: string[];
  steps?: string[];
  mcsa_matches?: MCSAMatch[];
  [key: string]: unknown;
}

export interface MatrixData {
  moieties: string[];
  columns: string[];
  rows: number[][];
  [key: string]: unknown;
}

export interface SummaryData {
  computation_time: number;
  num_solutions: number;
  parameters: {
    reaction: string;
    radius: number;
    max_steps: number;
    iterations: number;
    time_limit: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PredictionResult {
  mechanisms: Mechanism[];
  matrix: MatrixData;
  summary: SummaryData;
  [key: string]: unknown;
}

export interface FormState {
  reaction: string;
  radius: number;
  max_steps: number;
  iterations: number;
  time_limit: number;
}
