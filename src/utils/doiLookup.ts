import type { ParsedReference } from "./referenceParser";

const CROSSREF_EMAIL = import.meta.env.VITE_CROSSREF_EMAIL || "fred@forrt.org";

export type LookupStatus = "found" | "resolved" | "not_found";

export type LookupResult = {
  ref: ParsedReference;
  doi: string | null;
  foundTitle?: string;
  score?: number;
  source: "direct" | "crossref" | "openalex" | "none";
  status: LookupStatus;
  selected: boolean;
};

async function crossRefLookup(
  query: string,
): Promise<{ doi: string; title: string; score: number } | null> {
  try {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=1&select=DOI,title,score&mailto=${encodeURIComponent(CROSSREF_EMAIL)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.message?.items?.[0];
    if (!item || (item.score ?? 0) < 40) return null;
    return {
      doi: item.DOI as string,
      title: Array.isArray(item.title) ? item.title[0] : (item.title ?? ""),
      score: item.score as number,
    };
  } catch {
    return null;
  }
}

async function openAlexLookup(
  query: string,
): Promise<{ doi: string; title: string } | null> {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_doi:true&per-page=1&select=doi,title`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.results?.[0];
    if (!item?.doi) return null;
    return {
      doi: (item.doi as string).replace("https://doi.org/", ""),
      title: (item.title as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function lookupSingle(ref: ParsedReference): Promise<LookupResult> {
  if (ref.doi) {
    return { ref, doi: ref.doi, source: "direct", status: "found", selected: true };
  }

  const cr = await crossRefLookup(ref.queryText);
  if (cr) {
    return {
      ref,
      doi: cr.doi,
      foundTitle: cr.title,
      score: cr.score,
      source: "crossref",
      status: "resolved",
      selected: true,
    };
  }

  const oa = await openAlexLookup(ref.queryText);
  if (oa) {
    return {
      ref,
      doi: oa.doi,
      foundTitle: oa.title,
      source: "openalex",
      status: "resolved",
      selected: true,
    };
  }

  return { ref, doi: null, source: "none", status: "not_found", selected: false };
}

const CONCURRENCY = 3;
const BATCH_DELAY_MS = 250;

export async function lookupAll(
  refs: ParsedReference[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<LookupResult[]> {
  const results: LookupResult[] = [];

  for (let i = 0; i < refs.length; i += CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = refs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(lookupSingle));
    results.push(...batchResults);
    onProgress(results.length, refs.length);
    if (i + CONCURRENCY < refs.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}
