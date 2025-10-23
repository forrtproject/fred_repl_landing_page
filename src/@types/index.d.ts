// TypeScript types generated from sample.json

export type Author = {
  given: string;
  family: string;
  sequence: "first" | "additional";
  ORCID: string | null;
};

export type Replication = {
  doi_o: string;
  doi_o_hash: string;
  title_o: string;
  author_o: Author[];
  journal_o: string;
  year_o: number;
  volume_o: number;
  issue_o: string;
  pages_o: string;
  apa_ref_o: string;
  bibtex_ref_o: string;
  doi_r: string;
  doi_r_hash: string;
  title_r: string | null;
  author_r: Author[] | null;
  journal_r: string | null;
  year_r: number | null;
  volume_r: number | null;
  issue_r: string | null;
  pages_r: string | null;
  apa_ref_r: string | null;
  outcome: "failed" | "successful" | "partial" | "mixed";
};

export type Meta = {
  original_doi: string;
  replications: Replication[];
};

export type Candidate = {
  hash_prefix: string;
  meta: Meta;
};

export type DOIResult = {
  prefix: string;
  candidate: Candidate;
};

export type DOIAPIResponse = {
  results: Record<string, DOIResult>;
};

export type FormattedDOIResult = { 
    doi?: string,
    original?: Replication,
    replications?: Replication[],
    data?: DOIResult,
    outcomes?: {
      success?: number,
      failed?: number,
      mixed?: number,
      total?: number,
    },
    authors?: Author[],
};

type IconProps = {
    className?: string;
    color?: string;
};