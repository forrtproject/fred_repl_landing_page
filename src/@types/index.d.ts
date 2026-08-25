// TypeScript types generated from results.json

export type Author = {
  given: string;
  family: string;
  sequence: "first" | "additional";
  ORCID?: string;
};

export type ReplicationStats = {
  n_replications_total: number;
  n_replications_with_doi: number;
  n_replications_only: number;
  n_unique_replication_dois: number;
  n_reproductions_total: number;
  n_reproductions_with_doi: number;
  n_reproductions_only: number;
  n_originals_total: number;
  n_unique_original_dois: number;
};

export type ReplicationItem = {
  doi: string;
  doi_hash: string;
  type: "replication" | "reproduction" | "original";
  title: string;
  authors: Author[];
  journal: string;
  year: number;
  volume: string;
  issue: string | null;
  pages: string | null;
  apa_ref: string;
  bibtex_ref: string;
  url: string | null;
  outcome: "successful" | "failed" | "mixed" | "partial"
    | "computationally successful, robust"
    | "computationally successful, robustness challenges"
    | "computationally successful, robustness not checked"
    | "computational issues, robust"
    | "computational issues, robustness challenges"
    | "computational issues, robustness not checked"
    | "computation not checked, robust"
    | "computation not checked, robustness challenges"
    | "computation not checked, robustness not checked"
    | string;
  outcome_quote?: string;
  outcome_quote_source?: string;
};

export type RecordData = {
  stats: ReplicationStats;
  replications: ReplicationItem[];
  originals: ReplicationItem[];
  reproductions: ReplicationItem[];
};

export type CitationTimelineEntry = {
  year: number;
  only: number;
  with_successful: number;
  with_failed: number;
  with_mixed: number;
};

// The API also serves a legacy `citation_timeline` seeded by an older ETL: a
// {year: count} map of replications, not citations. Discriminate on `entries`.
export type CitationTimeline = {
  last_updated?: string;
  entries: CitationTimelineEntry[];
};

export type OriginalPaper = {
  doi: string;
  doi_hash: string;
  title: string;
  authors: Author[];
  journal: string;
  year: number;
  volume: string;
  issue: string | null;
  pages: string;
  apa_ref: string;
  bibtex_ref: string;
  url: string | null;
  types?: string[];
  record: RecordData | null;
  citation_timeline?: CitationTimeline | Record<string, number>;
  n_citations?: number;
  outcome_mix?: Record<string, number>;
  replication_year_counts?: Record<string, number>;
  first_replication_year?: string | null;
  first_replication_outcome?: string | null;
};

export type DOIResults = {
  results: Record<string, OriginalPaper>;
  isEmpty: boolean;
};

export type FormattedDOIResult = {
  doi?: string;
  title?: string;
  authors?: Author[];
  journal?: string;
  year?: number;
  apaRef?: string;
  bibtexRef?: string;
  stats?: ReplicationStats;
  replications?: ReplicationItem[];
  originals?: ReplicationItem[];
  reproductions?: ReplicationItem[];
  outcomes?: {
    success?: number;
    failed?: number;
    mixed?: number;
    partial?: number;
    total?: number;
  };
  data?: OriginalPaper;
};

export type IconProps = {
  className?: string;
  color?: string;
};