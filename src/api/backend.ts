import type { DOIResults, OriginalPaper } from "../@types";
import { createHttp, HttpError } from "../utils/http";
import { replicationResponseHasNoData } from "./formatter";

type SearchResponse = {
  results: Record<string, OriginalPaper>;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

// Temporarily pointed at dev: /sets (the DOI-list shortener behind ?set= links)
// is not on prod yet. Revert to https://rep-api.forrt.org/v1/ once it ships.
const backend = createHttp({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://rep-api.forrt.org/v1/",
});

export const fetchDOIInfo = async (doi: string) => {
  const response = await backend.post<DOIResults>('/original-lookup', { dois: [doi] });

  return response.data;
};

// /original-lookup silently truncates its response at 200 results, so batches
// stay below that with margin rather than sitting on the boundary.
const BATCH_SIZE = 150;

// Batch starts are staggered so a large set doesn't hit the API as one burst.
const BATCH_STAGGER_MS = 200;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchMultipleDOIInfo = async (dois: string[]): Promise<DOIResults> => {
  if (dois.length <= BATCH_SIZE) {
    const response = await backend.post<DOIResults>('/original-lookup', { dois });
    const data: DOIResults = response.data ?? { results: {}, isEmpty: true };
    data.isEmpty = replicationResponseHasNoData(data);
    return data;
  }

  const batches: string[][] = [];
  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    batches.push(dois.slice(i, i + BATCH_SIZE));
  }

  const responses = await Promise.all(
    batches.map(async (batch, i) => {
      if (i > 0) await delay(i * BATCH_STAGGER_MS);
      return backend.post<DOIResults>('/original-lookup', { dois: batch });
    })
  );

  const merged: DOIResults = { results: {}, isEmpty: true };
  for (const res of responses) {
    Object.assign(merged.results, (res.data ?? {}).results ?? {});
  }
  merged.isEmpty = replicationResponseHasNoData(merged);
  return merged;
};

export type DoiSet = {
  id: string;
  dois: string[];
  count: number;
  created: string;
  expires: string;
};

export class SetExpiredError extends Error {
  constructor() {
    super("This DOI set has expired");
    this.name = "SetExpiredError";
  }
}

export const fetchSet = async (id: string): Promise<DoiSet> => {
  try {
    const response = await backend.get<DoiSet>(`/sets/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error) {
    // Expiry is the documented end of a set's life, not a failure. The server's
    // message is human-facing copy, so branch on the code instead.
    const body = error instanceof HttpError ? error.response?.data : undefined;
    if ((body as { code?: string } | undefined)?.code === "set_expired") {
      throw new SetExpiredError();
    }
    throw error;
  }
};

export const createSet = async (dois: string[]): Promise<DoiSet> => {
  const response = await backend.post<DoiSet>("/sets", { dois });
  return response.data;
};

const MAX_PAGES = 50;

export const fetchFuzzySearch = async (query: string): Promise<DOIResults> => {
  const allResults: Record<string, OriginalPaper> = {};
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await backend.get<SearchResponse>(
      `/search?q=${encodeURIComponent(query)}&limit=1000&offset=${offset}`
    );
    const data = response.data;
    if (Object.keys(data.results ?? {}).length === 0) break;
    Object.assign(allResults, data.results ?? {});
    if (!data.hasMore) break;
    offset += 1000;
  }

  return { results: allResults, isEmpty: Object.keys(allResults).length === 0 };
};

export type AdvancedSearchParams = {
  mustHave?: string[];
  anyOf?: string[];
  exclude?: string[];
  yearFrom?: number;
  yearTo?: number;
  outcomes?: string[];
  paperTypes?: string[];
};

export const fetchAdvancedSearch = async (params: AdvancedSearchParams): Promise<DOIResults> => {
  const baseBody: Record<string, unknown> = {};
  if (params.mustHave?.length) baseBody.mustHave = params.mustHave;
  if (params.anyOf?.length) baseBody.anyOf = params.anyOf;
  if (params.exclude?.length) baseBody.exclude = params.exclude;
  if (params.yearFrom !== undefined) baseBody.yearFrom = params.yearFrom;
  if (params.yearTo !== undefined) baseBody.yearTo = params.yearTo;
  if (params.outcomes?.length) baseBody.outcomes = params.outcomes;
  if (params.paperTypes?.length) baseBody.paperTypes = params.paperTypes;

  const allResults: Record<string, OriginalPaper> = {};
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await backend.post<SearchResponse>('/search', { ...baseBody, limit: 1000, offset });
    const data = response.data;
    if (Object.keys(data.results ?? {}).length === 0) break;
    Object.assign(allResults, data.results ?? {});
    if (!data.hasMore) break;
    offset += 1000;
  }

  return { results: allResults, isEmpty: Object.keys(allResults).length === 0 };
};