import {
  createSignal,
  createEffect,
  createMemo,
  Show,
  For,
  onCleanup,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import type { DOIResults, OriginalPaper } from "./@types";
import {
  fetchMultipleDOIInfo,
  fetchFuzzySearch,
  fetchAdvancedSearch,
} from "./api/backend";
import { formatReplicationResponse } from "./api/formatter";
import { SearchOutcomesBanner } from "./components/replication/SearchOutcomesBanner";
import { TopBar, type SearchMode } from "./components/layout/TopBar";
import { StudyListPanel } from "./components/layout/StudyListPanel";
import {
  WelcomeState,
  exampleSearches,
} from "./components/layout/WelcomeState";
import { AdvancedSearchPanel } from "./components/layout/AdvancedSearchPanel";
import { DetailView } from "./components/layout/DetailView";
import { NoDataState } from "./components/layout/NoDataState";
import { Footer } from "./components/Footer";
import { ReferenceImportModal } from "./components/layout/ReferenceImportModal";
import { createToastState, type Toast } from "./components/layout/Toast";
import { BugReportModal } from "./components/layout/BugReportModal";
import { HttpError } from "./utils/http";
import { smoothScrollIntoView } from "./utils/smoothScroll";

const isDoi = (s: string) => /^10\.\d{4,}\//.test(s.trim());

const debounce = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const call = (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  call.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return call;
};

const toastDetails = (error: unknown): [string, string, boolean?] => {
  if (error instanceof HttpError) {
    if (error.status === 408)
      return [
        "Search timed out",
        "The server took too long to respond. Please try again.",
      ];
    if (error.status === 0)
      return ["Network error", "Check your connection and try again."];
    if (error.status >= 500)
      return [
        "Server error",
        "Something went wrong on our end. Please try again later.",
      ];
    if (error.status >= 400)
      return [
        "Search failed",
        `The request was rejected (${error.status}). Try a different query.`,
      ];
  }
  return [
    "Something went wrong",
    "An unexpected error occurred. Please try again.",
    true,
  ];
};

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportingError, setReportingError] = createSignal<Toast | null>(null);
  const { show: showToast, ToastStack } = createToastState((toast) => setReportingError(toast));

  const [tags, setTags] = createSignal<string[]>([]);
  const [inputValue, setInputValue] = createSignal("");
  const [searchMode, setSearchMode] = createSignal<SearchMode>("doi");
  const [results, setResults] = createSignal<Record<string, OriginalPaper>>({});
  const [selectedDoi, setSelectedDoi] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [hasSearched, setHasSearched] = createSignal(false);
  const [hasEverSearched, setHasEverSearched] = createSignal(false);
  const [typeFilter, setTypeFilter] = createSignal<"original" | "replication">(
    "original",
  );
  const [showImportModal, setShowImportModal] = createSignal(false);

  const [showAdvancedModal, setShowAdvancedModal] = createSignal(false);

  // Advanced search state
  const [advMustAll, setAdvMustAll] = createSignal<string[]>([]);
  const [advMustAny, setAdvMustAny] = createSignal<string[]>([]);
  const [advMustNone, setAdvMustNone] = createSignal<string[]>([]);
  const [advYearFrom, setAdvYearFrom] = createSignal(1950);
  const [advYearTo, setAdvYearTo] = createSignal(new Date().getFullYear());
  const [advOutcomes, setAdvOutcomes] = createSignal<string[]>([]);
  const [advPaperTypes, setAdvPaperTypes] = createSignal<string[]>([]);

  const filteredResults = createMemo(() => {
    const filter = typeFilter();
    return Object.entries(results()).filter(([, paper]) => {
      const rep = formatReplicationResponse(paper);
      const isOriginal =
        (rep.replications?.length || 0) > 0 ||
        (rep.reproductions?.length || 0) > 0;
      const isReplication =
        (rep.originals?.length || 0) > 0 ||
        (paper.types?.includes("reproduction") ?? false);
      if (filter === "original") return isOriginal;
      return isReplication;
    });
  });

  const aggregateOutcomes = createMemo(() => {
    const res = results();
    const filter = typeFilter();
    const counts = Object.values(res).reduce(
      (acc, paper) => {
        const rep = formatReplicationResponse(paper);
        const isOriginal =
          (rep.replications?.length || 0) > 0 ||
          (rep.reproductions?.length || 0) > 0;
        const isReplication =
          (rep.originals?.length || 0) > 0 ||
          (paper.types?.includes("reproduction") ?? false);
        if (filter === "original" && !isOriginal) return acc;
        if (filter === "replication" && !isReplication) return acc;
        acc.success += rep.outcomes?.success ?? 0;
        acc.failed += rep.outcomes?.failed ?? 0;
        acc.mixed += rep.outcomes?.mixed ?? 0;
        acc.partial += rep.outcomes?.partial ?? 0;
        acc.total += rep.outcomes?.total ?? 0;
        return acc;
      },
      { success: 0, failed: 0, mixed: 0, partial: 0, total: 0 },
    );
    return {
      ...counts,
      categorizedTotal:
        counts.success + counts.failed + counts.mixed + counts.partial,
    };
  });

  const paperCount = createMemo(() => {
    const filter = typeFilter();
    return Object.values(results()).filter((p) => {
      if (!p.record) return false;
      const rep = formatReplicationResponse(p);
      const isOriginal = (rep.replications?.length || 0) > 0;
      const isReplication = (rep.originals?.length || 0) > 0;
      if (filter === "original") return isOriginal;
      if (filter === "replication") return isReplication;
      return true;
    }).length;
  });

  const paperRefs: Record<string, HTMLDivElement> = {};
  let rightPanelRef: HTMLDivElement | undefined;
  let topbarInputRef: HTMLInputElement | undefined;
  let isScrollingFromClick = false;
  let scrollClickTimer: number | undefined;
  let observer: IntersectionObserver | undefined;
  let ignoreNextReset = false;
  let skipFuzzyEffect = false;
  let skipDoiEffect = false;
  let skipAdvancedEffect = false;

  const visibilityMap = new Map<string, number>();

  const pickActive = () => {
    if (isScrollingFromClick) return;
    if (!rightPanelRef) return;

    const panelTop = rightPanelRef.getBoundingClientRect().top;
    let best: { doi: string; distance: number } | null = null;

    for (const [doi, ratio] of visibilityMap) {
      if (ratio <= 0) continue;
      const el = paperRefs[doi];
      if (!el) continue;
      const dist = Math.abs(el.getBoundingClientRect().top - panelTop);
      if (!best || dist < best.distance) {
        best = { doi, distance: dist };
      }
    }
    if (best) setSelectedDoi(best.doi);
  };

  const setupObserver = () => {
    if (observer) observer.disconnect();
    visibilityMap.clear();
    if (!rightPanelRef) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const doi = entry.target.getAttribute("data-doi");
          if (doi) visibilityMap.set(doi, entry.intersectionRatio);
        }
        pickActive();
      },
      { root: rightPanelRef, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    for (const [doi, el] of Object.entries(paperRefs)) {
      // Ref callbacks fire before <For> removes old nodes, so paperRefs can
      // still hold detached elements — prune them and only observe live ones.
      if (!el || !el.isConnected) {
        delete paperRefs[doi];
        continue;
      }
      observer.observe(el);
    }
  };

  // Every row's ref callback requests a rebuild; coalesce them into one rebuild
  // per render batch instead of tearing down/reconnecting the observer per row.
  let observerRebuildPending = false;
  const scheduleObserverSetup = () => {
    if (observerRebuildPending) return;
    observerRebuildPending = true;
    queueMicrotask(() => {
      observerRebuildPending = false;
      setupObserver();
    });
  };

  // A long smooth scroll can outlast a fixed timer, so keep suppressing the
  // observer until the panel actually stops scrolling. The timer is a fallback
  // for Safari, which does not fire `scrollend`.
  const handleScrollEnd = () => {
    if (!isScrollingFromClick) return;
    isScrollingFromClick = false;
    if (scrollClickTimer) window.clearTimeout(scrollClickTimer);
  };

  onCleanup(() => {
    if (observer) observer.disconnect();
    if (scrollClickTimer) window.clearTimeout(scrollClickTimer);
    rightPanelRef?.removeEventListener("scrollend", handleScrollEnd);
  });

  const scrollToPaper = (doi: string) => {
    setSelectedDoi(doi);
    isScrollingFromClick = true;
    if (scrollClickTimer) window.clearTimeout(scrollClickTimer);
    scrollClickTimer = window.setTimeout(() => {
      isScrollingFromClick = false;
    }, 1500);
    const el = paperRefs[doi];
    if (el && rightPanelRef) {
      smoothScrollIntoView(rightPanelRef, el, { block: "start", residualViewports: 3.5 });
    }
  };

  const syncUrl = (newTags: string[]) => {
    skipDoiEffect = true;
    setSearchParams({
      doi: undefined,
      dois: newTags.length > 0 ? newTags.join(",") : undefined,
      q: undefined,
    });
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags().includes(trimmed)) {
      const newTags = [...tags(), trimmed];
      setTags(newTags);
      syncUrl(newTags);
    }
    setInputValue("");
  };

  const addTags = (incoming: string[]) => {
    const existing = new Set(tags());
    const deduped = incoming
      .map((t) => t.trim())
      .filter((t) => t && !existing.has(t));
    if (deduped.length === 0) return;
    const newTags = [...tags(), ...deduped];
    setTags(newTags);
    syncUrl(newTags);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    const newTags = tags().filter((_, i) => i !== index);
    setTags(newTags);
    syncUrl(newTags);
    if (newTags.length === 0) {
      debouncedDoiSearch.cancel();
      setResults({});
      setSelectedDoi(null);
      setHasSearched(false);
    } else {
      debouncedDoiSearch(newTags);
    }
  };

  const handleResults = (res: DOIResults) => {
    const data = Object.fromEntries(
      Object.entries(res.results || {}).filter(([, v]) => v != null),
    ) as Record<string, OriginalPaper>;
    setResults(data);

    // Auto-switch filter if the current one has no matches
    const papers = Object.values(data);
    const hasOriginals = papers.some((p) => {
      const rep = formatReplicationResponse(p);
      return (
        (rep.replications?.length || 0) > 0 ||
        (rep.reproductions?.length || 0) > 0
      );
    });
    const hasReplications = papers.some((p) => {
      const rep = formatReplicationResponse(p);
      return (
        (rep.originals?.length || 0) > 0 ||
        (p.types?.includes("reproduction") ?? false)
      );
    });
    if (typeFilter() === "original" && !hasOriginals && hasReplications) {
      setTypeFilter("replication");
    } else if (
      typeFilter() === "replication" &&
      !hasReplications &&
      hasOriginals
    ) {
      setTypeFilter("original");
    }

    const keys = Object.keys(data);
    if (keys.length > 0) {
      setSelectedDoi(keys[0]);
    }
    setIsLoading(false);
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    const currentMode = searchMode();
    const currentInput = inputValue();
    const looksLikeDoi =
      /10\.\d{4,}/.test(currentInput) || currentInput.includes("doi.org/");
    setSearchMode(mode);
    if (currentMode === "doi" && looksLikeDoi) {
      setInputValue("");
    }
    if (currentMode === "advanced") {
      clearAdvancedSearch();
    }
    setTags([]);
    setResults({});
    setSelectedDoi(null);
    setHasSearched(false);
    ignoreNextReset = true;
    setSearchParams({
      q: undefined,
      dois: undefined,
      mustAll: undefined,
      mustAny: undefined,
      mustNone: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      outcomes: undefined,
    });
  };

  const doDoiSearch = (dois: string[]) => {
    if (dois.length === 0) return;
    setIsLoading(true);
    setHasSearched(true);
    setHasEverSearched(true);
    setResults({});
    setSelectedDoi(null);
    fetchMultipleDOIInfo(dois)
      .then(handleResults)
      .catch((error) => {
        setIsLoading(false);
        setResults({});
        const [t, m, r] = toastDetails(error);
        showToast(t, m, "error", r);
      });
  };

  const doFuzzySearch = (query: string) => {
    if (!query) return;
    skipFuzzyEffect = true;
    setIsLoading(true);
    setHasSearched(true);
    setHasEverSearched(true);
    setResults({});
    setSelectedDoi(null);
    setSearchParams({ q: query, dois: undefined });
    fetchFuzzySearch(query)
      .then(handleResults)
      .catch((error) => {
        setIsLoading(false);
        setResults({});
        const [t, m, r] = toastDetails(error);
        showToast(t, m, "error", r);
      });
  };

  const doAdvancedSearch = () => {
    const mustAll = advMustAll();
    const mustAny = advMustAny();
    const mustNone = advMustNone();
    const paperTypes = advPaperTypes();
    if (!mustAll.length && !mustAny.length && !mustNone.length && !paperTypes.length) return;

    const yearFrom = advYearFrom();
    const yearTo = advYearTo();
    const outcomes = advOutcomes();

    setShowAdvancedModal(false);
    setSearchMode("advanced");
    skipAdvancedEffect = true;
    setSearchParams(
      {
        doi: undefined,
        dois: undefined,
        q: undefined,
        mustAll: mustAll.length ? mustAll.join("|") : undefined,
        mustAny: mustAny.length ? mustAny.join("|") : undefined,
        mustNone: mustNone.length ? mustNone.join("|") : undefined,
        yearFrom: yearFrom !== 1950 ? String(yearFrom) : undefined,
        yearTo:
          yearTo !== new Date().getFullYear() ? String(yearTo) : undefined,
        outcomes: outcomes.length ? outcomes.join("|") : undefined,
        paperTypes: paperTypes.length ? paperTypes.join("|") : undefined,
      },
      { replace: true },
    );
    setIsLoading(true);
    setHasSearched(true);
    setHasEverSearched(true);
    setResults({});
    setSelectedDoi(null);

    fetchAdvancedSearch({
      mustHave: mustAll.length ? mustAll : undefined,
      anyOf: mustAny.length ? mustAny : undefined,
      exclude: mustNone.length ? mustNone : undefined,
      yearFrom,
      yearTo,
      outcomes: outcomes.length ? outcomes : undefined,
      paperTypes: paperTypes.length ? paperTypes : undefined,
    })
      .then(handleResults)
      .catch((error) => {
        setIsLoading(false);
        setResults({});
        const [t, m, r] = toastDetails(error);
        showToast(t, m, "error", r);
      });
  };

  const clearAdvancedSearch = () => {
    setAdvMustAll([]);
    setAdvMustAny([]);
    setAdvMustNone([]);
    setAdvYearFrom(1950);
    setAdvYearTo(new Date().getFullYear());
    setAdvOutcomes([]);
    setAdvPaperTypes([]);
  };

  const debouncedFuzzySearch = debounce(
    (query: string) => doFuzzySearch(query),
    1000,
  );
  const debouncedDoiSearch = debounce(
    (dois: string[]) => doDoiSearch(dois),
    1000,
  );

  const doSearch = () => {
    if (searchMode() === "fuzzy") {
      doFuzzySearch(inputValue().trim());
    } else {
      doDoiSearch(tags());
    }
  };

  const handleExampleClick = (query: string) => {
    if (isDoi(query)) {
      setSearchMode("doi");
      setInputValue("");
      const newTags = [query.trim()];
      setTags(newTags);
      syncUrl(newTags);
      doDoiSearch(newTags);
    } else {
      setSearchMode("fuzzy");
      setTags([]);
      setInputValue(query);
      doFuzzySearch(query);
    }
  };

  // React to URL changes (e.g. browser back/forward)
  createEffect(() => {
    const doi = String(searchParams.doi || searchParams.dois || "");
    const q = String(searchParams.q || "");
    const advMustAllParam = String(searchParams.mustAll || "");
    const advMustAnyParam = String(searchParams.mustAny || "");
    const advMustNoneParam = String(searchParams.mustNone || "");
    const currentTags = doi
      ? doi
          .split(",")
          .map((d: string) => d.trim())
          .filter((d: string) => d !== "")
      : [];

    if (currentTags.length > 0) {
      if (skipDoiEffect) {
        skipDoiEffect = false;
      } else {
        setTags(currentTags);
        setInputValue("");
        setSearchMode("doi");
        doDoiSearch(currentTags);
      }
    } else if (q) {
      if (skipFuzzyEffect) {
        skipFuzzyEffect = false;
      } else {
        setTags([]);
        setInputValue(q);
        setSearchMode("fuzzy");
        doFuzzySearch(q);
      }
    } else if (advMustAllParam || advMustAnyParam || advMustNoneParam) {
      if (skipAdvancedEffect) {
        skipAdvancedEffect = false;
      } else {
        const mustAll = advMustAllParam ? advMustAllParam.split("|") : [];
        const mustAny = advMustAnyParam ? advMustAnyParam.split("|") : [];
        const mustNone = advMustNoneParam ? advMustNoneParam.split("|") : [];
        const yearFrom = searchParams.yearFrom
          ? parseInt(String(searchParams.yearFrom))
          : 1950;
        const yearTo = searchParams.yearTo
          ? parseInt(String(searchParams.yearTo))
          : new Date().getFullYear();
        const outcomes = searchParams.outcomes
          ? String(searchParams.outcomes).split("|")
          : [];
        const paperTypes = searchParams.paperTypes
          ? String(searchParams.paperTypes).split("|")
          : [];
        setAdvMustAll(mustAll);
        setAdvMustAny(mustAny);
        setAdvMustNone(mustNone);
        setAdvYearFrom(yearFrom);
        setAdvYearTo(yearTo);
        setAdvOutcomes(outcomes);
        setAdvPaperTypes(paperTypes);
        setTags([]);
        setInputValue("");
        setSearchMode("advanced");
        setIsLoading(true);
        setHasSearched(true);
        setHasEverSearched(true);
        setResults({});
        setSelectedDoi(null);
        fetchAdvancedSearch({
          mustHave: mustAll.length ? mustAll : undefined,
          anyOf: mustAny.length ? mustAny : undefined,
          exclude: mustNone.length ? mustNone : undefined,
          yearFrom,
          yearTo,
          outcomes: outcomes.length ? outcomes : undefined,
          paperTypes: paperTypes.length ? paperTypes : undefined,
        })
          .then(handleResults)
          .catch((error) => {
            setIsLoading(false);
            setResults({});
            const [t, m] = toastDetails(error);
            showToast(t, m);
          });
      }
    } else {
      // URL has no search params — reset to welcome state
      if (ignoreNextReset) {
        ignoreNextReset = false;
      } else {
        setTags([]);
        setInputValue("");
        setResults({});
        setSelectedDoi(null);
        setHasSearched(false);
      }
    }
  });

  createEffect(() => {
    hasSearched();
    setTimeout(() => topbarInputRef?.focus(), 0);
  });

  return (
    <>
      <TopBar
        tags={tags()}
        inputValue={inputValue()}
        searchMode={searchMode()}
        showSearch={hasEverSearched()}
        advancedState={{
          mustAll: advMustAll(),
          mustAny: advMustAny(),
          mustNone: advMustNone(),
          yearFrom: advYearFrom(),
          yearTo: advYearTo(),
          outcomes: advOutcomes(),
          paperTypes: advPaperTypes(),
        }}
        onInputRef={(el) => (topbarInputRef = el)}
        onInputChange={(v) => {
          setInputValue(v);
          const q = v.trim();
          if (isDoi(q)) {
            debouncedFuzzySearch.cancel();
            setSearchMode("doi");
            return;
          }
          if (searchMode() === "fuzzy") {
            if (q === "") {
              debouncedFuzzySearch.cancel();
              if (tags().length === 0) {
                setResults({});
                setSelectedDoi(null);
                setHasSearched(false);
                ignoreNextReset = true;
                setSearchParams({ q: undefined, dois: undefined });
              }
            } else {
              debouncedFuzzySearch(q);
            }
          }
        }}
        onAddTag={addTag}
        onAddTags={addTags}
        onRemoveTag={removeTag}
        onSearchSubmit={doSearch}
        onSearchModeChange={handleSearchModeChange}
        onNavigateSearch={(allTags) => {
          const query = allTags[0] || inputValue().trim();
          if (searchMode() === "doi" || isDoi(query)) {
            if (allTags.length > 0) {
              setTags(allTags);
              setInputValue("");
              syncUrl(allTags);
              doDoiSearch(allTags);
            }
          } else if (searchMode() === "fuzzy") {
            if (query) {
              setTags([]);
              setInputValue(query);
              doFuzzySearch(query);
            }
          }
        }}
        onImportClick={() => setShowImportModal(true)}
        onAdvancedClick={() => setShowAdvancedModal(true)}
      />

      <div
        classList={{
          "main-layout": true,
          "no-sidebar":
            !isLoading() &&
            !hasSearched() &&
            Object.keys(results()).length === 0,
        }}
      >
        <Show when={isLoading() || hasSearched()}>
          <StudyListPanel
            results={results()}
            selectedDoi={selectedDoi()}
            onSelect={(doi) => scrollToPaper(doi)}
            isLoading={isLoading()}
            hasSearched={hasSearched()}
            typeFilter={typeFilter()}
            onTypeFilterChange={setTypeFilter}
          />
        </Show>

        <div
          class="right-panel"
          classList={{
            "right-panel--scrollable": Object.keys(results()).length > 0,
          }}
          ref={(el) => {
            rightPanelRef = el;
            el.addEventListener("scrollend", handleScrollEnd);
          }}
        >
          <Show
            when={Object.keys(results()).length > 0}
            fallback={
              <Show
                when={isLoading()}
                fallback={
                  <Show
                    when={hasSearched()}
                    fallback={
                      <Show
                        when={hasEverSearched()}
                        fallback={
                          <WelcomeState
                            tags={tags()}
                            inputValue={inputValue()}
                            searchMode={searchMode()}
                            onInputChange={(v) => {
                              setInputValue(v);
                              if (searchMode() === "fuzzy") {
                                const q = v.trim();
                                if (q === "") debouncedFuzzySearch.cancel();
                                else debouncedFuzzySearch(q);
                              }
                            }}
                            onAddTag={addTag}
                            onAddTags={addTags}
                            onRemoveTag={removeTag}
                            onSearchSubmit={doSearch}
                            onSearchModeChange={handleSearchModeChange}
                            onExampleClick={handleExampleClick}
                            onImportClick={() => setShowImportModal(true)}
                            onAdvancedClick={() => setShowAdvancedModal(true)}
                          />
                        }
                      >
                        <div class="no-results-pane">
                          <div class="welcome-examples">
                            <div class="welcome-examples-label">
                              Example searches
                            </div>
                            {exampleSearches.map((ex) => (
                              <div
                                class="welcome-doi"
                                onClick={() => handleExampleClick(ex.query)}
                              >
                                <span>{ex.label}</span>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <polyline points="9,18 15,12 9,6" />
                                </svg>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Show>
                    }
                  >
                    <div class="no-results-pane">
                      <div class="no-results-icon">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                      <div class="no-results-title">No results found</div>
                      <div class="no-results-sub">
                        Try a different search term or DOI
                      </div>
                      <div class="welcome-examples" style="margin-top: 1.5rem">
                        <div class="welcome-examples-label">Try an example</div>
                        {exampleSearches.map((ex) => (
                          <div
                            class="welcome-doi"
                            onClick={() => handleExampleClick(ex.query)}
                          >
                            <span>{ex.label}</span>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <polyline points="9,18 15,12 9,6" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Show>
                }
              >
                <div class="loading-pane">
                  <div class="loading-spinner loading-spinner--lg" />
                  <span class="loading-pane-text">Searching…</span>
                </div>
              </Show>
            }
          >
            <>
              <Show when={aggregateOutcomes().total > 0}>
                <SearchOutcomesBanner
                  outcomes={aggregateOutcomes()}
                  paperCount={paperCount()}
                />
              </Show>
              <For each={filteredResults()}>
                {([doi, paper]) => (
                  <div
                    data-doi={doi}
                    ref={(el) => {
                      paperRefs[doi] = el;
                      scheduleObserverSetup();
                    }}
                    class={`scroll-paper-section ${selectedDoi() === doi ? "highlighted" : ""}`}
                  >
                    <Show
                      when={paper?.record}
                      fallback={<NoDataState doi={doi} />}
                    >
                      <DetailView paper={paper!} />
                    </Show>
                  </div>
                )}
              </For>
            </>
          </Show>
        </div>
      </div>

      <ReferenceImportModal
        open={showImportModal()}
        onClose={() => setShowImportModal(false)}
        onSearch={(dois) => {
          setSearchMode("doi");
          setTags(dois);
          setInputValue("");
          syncUrl(dois);
          doDoiSearch(dois);
        }}
      />

      <AdvancedSearchPanel
        open={showAdvancedModal()}
        state={{
          mustAll: advMustAll(),
          mustAny: advMustAny(),
          mustNone: advMustNone(),
          yearFrom: advYearFrom(),
          yearTo: advYearTo(),
          outcomes: advOutcomes(),
          paperTypes: advPaperTypes(),
        }}
        onMustAllChange={setAdvMustAll}
        onMustAnyChange={setAdvMustAny}
        onMustNoneChange={setAdvMustNone}
        onYearFromChange={setAdvYearFrom}
        onYearToChange={setAdvYearTo}
        onOutcomesChange={setAdvOutcomes}
        onPaperTypesChange={setAdvPaperTypes}
        onSearch={doAdvancedSearch}
        onClear={clearAdvancedSearch}
        onClose={() => setShowAdvancedModal(false)}
      />

      <Footer />
      <ToastStack />
      <Show when={reportingError()}>
        {(toast) => (
          <BugReportModal
            errorTitle={toast().title}
            errorMessage={toast().message}
            onClose={() => setReportingError(null)}
          />
        )}
      </Show>
    </>
  );
}

export default App;
