import { request } from './api';
import type { SimulationConfig, SimulationTrace } from './simulation';

export const MAX_ALGORITHM_SCAN_SOURCES = 8;
export const MAX_ALGORITHM_SCAN_PATHS = 30;

export type AlgorithmTutorAction = 'ask' | 'quiz' | 'scenario' | 'summary' | 'hint' | 'explain_code' | 'flashcards';

export interface AlgorithmFlashcard { front: string; back: string; source_index?: number; source_quote?: string }
export interface AlgorithmTutorSource { title: string; url: string; kind: 'lesson' | 'document' }

export interface AlgorithmQuizOptions {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  focus: 'mixed' | 'problem' | 'principle' | 'trace' | 'complexity' | 'application';
  topic: string;
}

export interface AlgorithmScenarioOptions {
  topic: string;
  style: 'trace' | 'application';
}

export interface AlgorithmFlashcardOptions {
  topic: string;
  count: number;
  focus: string;
}

export interface AlgorithmQuizQuestion {
  content: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source_index?: number;
  source_quote?: string;
}

export interface AlgorithmTutorResult {
  action: AlgorithmTutorAction;
  title: string;
  content: string;
  questions?: AlgorithmQuizQuestion[];
  cards?: AlgorithmFlashcard[];
  sources?: AlgorithmTutorSource[];
  prompt_version: string;
}

export const algorithmTutorApi = {
  generate: (path: string, body: {
    action: AlgorithmTutorAction;
    question?: string;
    frame?: { message: string; code_line: number; values: string } | null;
    quiz_options?: AlgorithmQuizOptions;
    scenario_options?: AlgorithmScenarioOptions;
    flashcard_options?: AlgorithmFlashcardOptions;
    code_selection?: { start_line: number; end_line: number; source: string };
  }) => request<AlgorithmTutorResult>(`/algorithms/${path}/tutor/`, {
    method: 'POST', body: JSON.stringify(body),
  }),
};

export interface AlgorithmLessonBlock {
  id: string;
  kind: 'theory' | 'example' | 'exercise';
  title: string;
  text: string;
  image: string;
  image_url?: string;
  alt: string;
  caption: string;
  source: string;
  attribution: string;
  answerType: 'choice' | 'short' | 'essay';
  options: string;
  answer: string;
  hint: string;
  solution: string;
}

export interface AlgorithmCodeLesson {
  language: 'cpp';
  source: string;
  steps: { start_line: number; end_line: number; title: string; note: string }[];
}

export interface StoredSimulation {
  version: 1;
  algorithm_path: string;
  config: SimulationConfig;
  samples: Record<string, SimulationTrace>;
}

export interface ApplicationStep {
  title: string;
  description: string;
  route: number[];
  state: 'try' | 'backtrack' | 'success';
  phase?: 'plan' | 'move' | 'act' | 'done';
}

export interface AlgorithmApplicationScenario {
  scene?: {
    kind: 'route' | 'tour' | 'placement' | 'subset';
    theme: 'factory' | 'circuit' | 'town' | 'delivery' | 'robot' | 'knight' | 'terminal' | 'flag' | 'sensor' | 'calendar' | 'tower' | 'queen' | 'coins' | 'crate' | 'clock' | 'receipt';
    title: string;
    values?: number[];
    target?: number;
    unit?: string;
    caption?: string;
    metricLabel?: string;
    distance?: { metric: 'euclidean' | 'manhattan'; scale: number; unit: string };
    alternatives?: { id: string; label: string; steps: ApplicationStep[] }[];
  };
  id: string;
  title: string;
  summary: string;
  tag: string;
  problem: string;
  model: string;
  solution: string;
  result: string;
  limitations: string;
  nodes: { label: string; x: number; y: number }[];
  edges: [number, number][];
  steps: ApplicationStep[];
}

export interface AlgorithmContentDto {
  application_scenarios?: AlgorithmApplicationScenario[];
  simulation?: StoredSimulation | Record<string, never>;
  code_lesson?: AlgorithmCodeLesson | Record<string, never>;
  lesson_blocks?: AlgorithmLessonBlock[];
  lesson_fields?: Record<string, string>;
  summary: string;
  theory: string;
  time_best: string;
  time_average: string;
  time_worst: string;
  space: string;
  applications: string[];
  status: 'draft' | 'published';
  updated_at: string;
}

export interface AlgorithmItem {
  id: number;
  key: string;
  name: string;
  description?: string;
  category_key: string;
  category_name: string;
  is_published: boolean;
  last_synced_at: string | null;
}

export interface AlgorithmCategory {
  id: number;
  key: string;
  name: string;
  name_en: string;
  name_vi: string;
  description: string;
  order: number;
  algorithms: AlgorithmItem[];
}

export interface AlgorithmDetailResponse {
  algorithm: AlgorithmItem;
  content: AlgorithmContentDto | null;
  references: { id: number; citation: string; page_start: number | null; page_end: number | null; excerpt: string }[];
}

export interface AlgorithmViewDetail {
  visualization?: SimulationConfig;
  categoryKey: string;
  categoryName: string;
  algorithmKey: string;
  algorithmName: string;
  description: string;
  files: { name: string; content: string }[];
}

export interface AlgorithmImportSource {
  id: number;
  name: string;
  kind: 'document' | 'url';
  source_type: 'openstax' | 'pdf' | 'url';
  source_url: string;
  allowed_domain: string;
  license_name: string;
  description: string;
  enabled: boolean;
  priority: number;
  document: string | null;
}

export interface AlgorithmSourcePreview {
  title: string;
  url: string;
  content: string;
  allowed_domain: string;
  headings?: { level: number; title: string }[];
  topics?: string[];
  code_source_url?: string;
  pseudocode?: string;
}

export interface AlgorithmDiscoveredSource {
  title: string;
  url: string;
  allowed_domain: string;
  excerpt: string;
  reason: string;
}

export interface AlgorithmSourceDiscovery {
  query: string;
  gap_fields: string[];
  results: AlgorithmDiscoveredSource[];
}

export interface MissingAlgorithmSuggestion {
  name: string;
  source_id: number;
  source_name: string;
  url: string;
  page: number | null;
}

export interface MissingAlgorithmDiscovery {
  results: MissingAlgorithmSuggestion[];
  warnings: string[];
}

export type CandidateFieldStatus = 'found' | 'weak' | 'missing' | 'conflict';
export interface AlgorithmCandidateField {
  value: string;
  status: CandidateFieldStatus;
  confidence: number;
  sources: number[];
  generated: boolean;
}

export interface AlgorithmDraftCandidate {
  id: number;
  algorithm_path: string;
  algorithm_name: string;
  job: string;
  status: 'pending' | 'applied' | 'discarded' | 'no_source' | 'failed';
  fields: Record<string, AlgorithmCandidateField>;
  citations: { n: number; citation: string; url: string; excerpt: string }[];
  source_ids: number[];
  warnings: string[];
  error: string;
  created_at: string;
}

export interface AlgorithmScanJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  log: { message: string; level: 'info' | 'success' | 'warning' | 'error'; at: string }[];
  error: string;
  candidate_ids: number[];
}

export function toAlgorithmViewDetail(
  algorithm: AlgorithmItem,
  extras: Partial<Pick<AlgorithmViewDetail, 'visualization' | 'description' | 'files'>> = {},
): AlgorithmViewDetail {
  return {
    categoryKey: algorithm.category_key,
    categoryName: algorithm.category_name,
    algorithmKey: algorithm.key,
    algorithmName: algorithm.name,
    description: extras.description ?? '',
    files: extras.files ?? [],
    visualization: extras.visualization,
  };
}

export const algorithmApi = {
  categories: (includeDrafts = false) =>
    request<AlgorithmCategory[]>(`/algorithms/${includeDrafts ? '?include_drafts=1' : ''}`),

  get: (categoryKey: string, algorithmKey: string) =>
    request<AlgorithmDetailResponse>(`/algorithms/${categoryKey}/${algorithmKey}/`),

  importSources: () => request<AlgorithmImportSource[]>('/algorithms/admin/import/sources/'),

  discoverMissing: (sourceIds: number[]) =>
    request<MissingAlgorithmDiscovery>('/algorithms/admin/import/discover-missing/', {
      method: 'POST', body: JSON.stringify({ source_ids: sourceIds }),
    }),

  previewSource: (url: string) =>
    request<AlgorithmSourcePreview>('/algorithms/admin/import/sources/preview/', {
      method: 'POST', body: JSON.stringify({ url }),
    }),

  discoverSources: (candidateId: number) =>
    request<AlgorithmSourceDiscovery>('/algorithms/admin/import/sources/discover/', {
      method: 'POST', body: JSON.stringify({ candidate_id: candidateId }),
    }),

  createUrlSource: (source: Pick<AlgorithmImportSource, 'name' | 'source_url' | 'allowed_domain' | 'license_name'>) =>
    request<AlgorithmImportSource>('/algorithms/admin/import/sources/', {
      method: 'POST',
      body: JSON.stringify({
        name: source.name,
        kind: 'url',
        url: source.source_url,
        allowed_domain: source.allowed_domain,
        license_name: source.license_name,
      }),
    }),

  startScan: (algorithmPaths: string[], sourceIds: number[]) =>
    request<AlgorithmScanJob>('/algorithms/admin/import/scans/', {
      method: 'POST',
      body: JSON.stringify({ algorithm_paths: algorithmPaths, source_ids: sourceIds }),
    }),

  startNewLessonScan: (name: string, categoryKey: string, sourceIds: number[]) =>
    request<AlgorithmScanJob>('/algorithms/admin/import/scans/', {
      method: 'POST',
      body: JSON.stringify({ new_algorithm: { name, category_key: categoryKey }, source_ids: sourceIds }),
    }),

  startNewLessonsScan: (items: { name: string; category_key: string }[], sourceIds: number[]) =>
    request<AlgorithmScanJob>('/algorithms/admin/import/scans/', {
      method: 'POST',
      body: JSON.stringify({ new_algorithms: items, source_ids: sourceIds }),
    }),

  scanJob: (id: string) => request<AlgorithmScanJob>(`/algorithms/admin/import/scans/${id}/`),

  candidates: (jobId: string) =>
    request<AlgorithmDraftCandidate[]>(`/algorithms/admin/import/candidates/?job=${encodeURIComponent(jobId)}`),

  applyCandidate: (id: number, fields: string[]) =>
    request(`/algorithms/admin/import/candidates/${id}/apply/`, {
      method: 'POST', body: JSON.stringify({ fields }),
    }),

  applyCandidates: (items: { id: number; fields: string[] }[]) =>
    request<AlgorithmDraftCandidate[]>('/algorithms/admin/import/candidates/apply/', {
      method: 'POST', body: JSON.stringify({ items }),
    }),

  discardCandidate: (id: number) =>
    request<AlgorithmDraftCandidate>(`/algorithms/admin/import/candidates/${id}/discard/`, { method: 'POST' }),
};
