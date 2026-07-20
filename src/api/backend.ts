import type { DOIResults, OriginalPaper } from "../@types";
import { createHttp } from "../utils/http";
import { replicationResponseHasNoData } from "./formatter";

type SearchResponse = {
  results: Record<string, OriginalPaper>;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

const backend = createHttp({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://5waa6mryb6.execute-api.eu-central-1.amazonaws.com/v1",
});

export const fetchDOIInfo = async (doi: string) => {
  const response = await backend.post<DOIResults>('/original-lookup', { dois: [doi] });

  return response.data;
};

const BATCH_SIZE = 100;

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
    batches.map((batch) => backend.post<DOIResults>('/original-lookup', { dois: batch }))
  );

  const merged: DOIResults = { results: {}, isEmpty: true };
  for (const res of responses) {
    Object.assign(merged.results, (res.data ?? {}).results ?? {});
  }
  merged.isEmpty = replicationResponseHasNoData(merged);
  return merged;
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