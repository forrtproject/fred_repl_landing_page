import { ChevronRightIcon, NoResultsIcon } from "./components/icons";
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

// Shared original/replication classification, kept in sync with StudyListPanel.
const classifyPaper = (paper: OriginalPaper) => {
  const rep = formatReplicationResponse(paper);
  const isOriginal =
    (rep.replications?.length || 0) > 0 || (rep.reproductions?.length || 0) > 0;
  const isReplication =
    (rep.originals?.length || 0) > 0 ||
    (paper.types?.includes("reproduction") ?? false);
  return { isOriginal, isReplication };
};

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
      const { isOriginal, isReplication } = classifyPaper(paper);
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
        const { isOriginal, isReplication } = classifyPaper(paper);
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
      const { isOriginal, isReplication } = classifyPaper(p);
      return filter === "original" ? isOriginal : isReplication;
    }).length;
  });

  /* DOI mode knows how many records were asked for, so the placeholder stack can
     match it and the layout does not jump when results land. Fuzzy and advanced
     searches have no count until the response, so they get a short stack. */
  const skeletonCount = () => {
    const n = tags().length;
    return searchMode() === "doi" && n > 0 ? Math.min(n, 4) : 3;
  };

  const paperRefs: Record<string, HTMLDivElement> = {};
  let rightPanelRef: HTMLDivElement | undefined;
  let topbarInputRef: HTMLInputElement | undefined;
  let isScrollingFromClick = false;
  let clickScrollInterrupted = false;
  let scrollClickTimer: number | undefined;
  let observer: IntersectionObserver | undefined;
  let disposed = false;
  let ignoreNextReset = false;
  let skipFuzzyEffect = false;
  let skipDoiEffect = false;
  let skipAdvancedEffect = false;
  // Monotonic search id; a resolving response is ignored if a newer search started.
  let searchGeneration = 0;

  // Abandon any in-flight search so its (possibly slow) response can't repopulate
  // state the user has since cleared. Bumping the generation makes both the
  // success and error handlers of the outstanding request bail.
  const invalidateSearches = () => {
    ++searchGeneration;
    debouncedFuzzySearch.cancel();
    debouncedDoiSearch.cancel();
    setIsLoading(false);
  };

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
      // still hold detached elements; prune them and only observe live ones.
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
      // The microtask can outlive the component; don't recreate the observer.
      if (disposed) return;
      setupObserver();
    });
  };

  // While a click-driven scroll is in flight, suppress the observer until the
  // panel goes quiet. Each scroll event resets a short quiet timer; when no
  // scroll fires for the quiet period the animation has settled. This spans the
  // instant-jump/smooth-residual gap in smoothScrollIntoView (a stray
  // `scrollend` mid-gap would otherwise release suppression too early), needs no
  // `scrollend` support, and has no hard deadline. A no-op when not suppressing.
  const SCROLL_QUIET_MS = 250;
  const armScrollQuietTimer = () => {
    if (scrollClickTimer) window.clearTimeout(scrollClickTimer);
    scrollClickTimer = window.setTimeout(() => {
      isScrollingFromClick = false;
      // If the user hijacked the click-scroll (wheel/touch), the observer's
      // visibilityMap moved on while pickActive() was suppressed, so reconcile
      // the selection now. For an uninterrupted click-scroll we must NOT, or a
      // target clamped near the list end (never reaching the panel top) would
      // wrongly override the clicked selection.
      if (clickScrollInterrupted) {
        clickScrollInterrupted = false;
        pickActive();
      }
    }, SCROLL_QUIET_MS);
  };
  const handlePanelScroll = () => {
    if (!isScrollingFromClick) return;
    armScrollQuietTimer();
  };
  const handleClickScrollInterrupt = () => {
    if (isScrollingFromClick) clickScrollInterrupted = true;
  };

  onCleanup(() => {
    disposed = true;
    if (observer) observer.disconnect();
    if (scrollClickTimer) window.clearTimeout(scrollClickTimer);
    rightPanelRef?.removeEventListener("scroll", handlePanelScroll);
    rightPanelRef?.removeEventListener("wheel", handleClickScrollInterrupt);
    rightPanelRef?.removeEventListener("touchmove", handleClickScrollInterrupt);
  });

  const scrollToPaper = (doi: string) => {
    setSelectedDoi(doi);
    isScrollingFromClick = true;
    clickScrollInterrupted = false;
    // Arm immediately so suppression clears even when no scrolling is needed.
    armScrollQuietTimer();
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
      invalidateSearches();
      setResults({});
      setSelectedDoi(null);
      setHasSearched(false);
      ignoreNextReset = true;
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
    const hasOriginals = papers.some((p) => classifyPaper(p).isOriginal);
    const hasReplications = papers.some((p) => classifyPaper(p).isReplication);
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
    invalidateSearches();
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
      paperTypes: undefined,
    });
  };

  const doDoiSearch = (dois: string[]) => {
    if (dois.length === 0) return;
    const gen = ++searchGeneration;
    setIsLoading(true);
    setHasSearched(true);
    setHasEverSearched(true);
    setResults({});
    setSelectedDoi(null);
    fetchMultipleDOIInfo(dois)
      .then((res) => {
        if (gen !== searchGeneration) return;
        handleResults(res);
      })
      .catch((error) => {
        if (gen !== searchGeneration) return;
        setIsLoading(false);
        setResults({});
        const [t, m, r] = toastDetails(error);
        showToast(t, m, "error", r);
      });
  };

  const doFuzzySearch = (query: string) => {
    if (!query) return;
    const gen = ++searchGeneration;
    skipFuzzyEffect = true;
    setIsLoading(true);
    setHasSearched(true);
    setHasEverSearched(true);
    setResults({});
    setSelectedDoi(null);
    setSearchParams({ q: query, dois: undefined });
    fetchFuzzySearch(query)
      .then((res) => {
        if (gen !== searchGeneration) return;
        handleResults(res);
      })
      .catch((error) => {
        if (gen !== searchGeneration) return;
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
    const yearFrom = advYearFrom();
    const yearTo = advYearTo();
    const outcomes = advOutcomes();
    const yearNarrowed =
      yearFrom !== 1950 || yearTo !== new Date().getFullYear();
    if (
      !mustAll.length &&
      !mustAny.length &&
      !mustNone.length &&
      !paperTypes.length &&
      !outcomes.length &&
      !yearNarrowed
    )
      return;

    const gen = ++searchGeneration;
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
      .then((res) => {
        if (gen !== searchGeneration) return;
        handleResults(res);
      })
      .catch((error) => {
        if (gen !== searchGeneration) return;
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
    const advOutcomesParam = String(searchParams.outcomes || "");
    const advPaperTypesParam = String(searchParams.paperTypes || "");
    const advYearFromParam = String(searchParams.yearFrom || "");
    const advYearToParam = String(searchParams.yearTo || "");
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
    } else if (
      advMustAllParam ||
      advMustAnyParam ||
      advMustNoneParam ||
      advOutcomesParam ||
      advPaperTypesParam ||
      advYearFromParam ||
      advYearToParam
    ) {
      if (skipAdvancedEffect) {
        skipAdvancedEffect = false;
      } else {
        const mustAll = advMustAllParam ? advMustAllParam.split("|") : [];
        const mustAny = advMustAnyParam ? advMustAnyParam.split("|") : [];
        const mustNone = advMustNoneParam ? advMustNoneParam.split("|") : [];
        const yearFrom = advYearFromParam ? parseInt(advYearFromParam) : 1950;
        const yearTo = advYearToParam
          ? parseInt(advYearToParam)
          : new Date().getFullYear();
        const outcomes = advOutcomesParam ? advOutcomesParam.split("|") : [];
        const paperTypes = advPaperTypesParam
          ? advPaperTypesParam.split("|")
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
        const gen = ++searchGeneration;
        fetchAdvancedSearch({
          mustHave: mustAll.length ? mustAll : undefined,
          anyOf: mustAny.length ? mustAny : undefined,
          exclude: mustNone.length ? mustNone : undefined,
          yearFrom,
          yearTo,
          outcomes: outcomes.length ? outcomes : undefined,
          paperTypes: paperTypes.length ? paperTypes : undefined,
        })
          .then((res) => {
            if (gen !== searchGeneration) return;
            handleResults(res);
          })
          .catch((error) => {
            if (gen !== searchGeneration) return;
            setIsLoading(false);
            setResults({});
            const [t, m] = toastDetails(error);
            showToast(t, m);
          });
      }
    } else {
      // URL has no search params, so reset to the welcome state
      if (ignoreNextReset) {
        ignoreNextReset = false;
      } else {
        invalidateSearches();
        setTags([]);
        setInputValue("");
        setResults({});
        setSelectedDoi(null);
        setHasSearched(false);
        // Reached only by real navigation to a param-less URL (back button,
        // brand logo). In-app clears set ignoreNextReset and keep the topbar
        // search; this path should land on the full welcome screen instead.
        setHasEverSearched(false);
      }
    }
  });

  createEffect(() => {
    hasSearched();
    const t = setTimeout(() => {
      // Don't steal focus from another interactive element the user is using.
      const active = document.activeElement;
      if (active && active !== document.body && active !== topbarInputRef)
        return;
      topbarInputRef?.focus();
    }, 0);
    onCleanup(() => clearTimeout(t));
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
                invalidateSearches();
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
            el.addEventListener("scroll", handlePanelScroll, { passive: true });
            el.addEventListener("wheel", handleClickScrollInterrupt, { passive: true });
            el.addEventListener("touchmove", handleClickScrollInterrupt, { passive: true });
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
                          <div class="no-results-title">
                            Search the atlas
                          </div>
                          <div class="no-results-sub">
                            Enter a title, author, or DOI in the bar above.
                          </div>
                          <div
                            class="welcome-examples"
                            style="margin-top: 1.5rem; justify-content: center"
                          >
                            <div class="welcome-examples-label">
                              Example searches
                            </div>
                            {exampleSearches.map((ex) => (
                              <div
                                class="welcome-doi"
                                onClick={() => handleExampleClick(ex.query)}
                              >
                                <span>{ex.label}</span>
                                <ChevronRightIcon size={14} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </Show>
                    }
                  >
                    <div class="no-results-pane">
                      <div class="no-results-icon">
                        <NoResultsIcon size={32} />
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
                            <ChevronRightIcon size={14} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Show>
                }
              >
                <div aria-busy="true" aria-label="Searching">
                  <For each={Array.from({ length: skeletonCount() })}>
                    {(_, card) => (
                      <div class="dv-skel">
                        <div class="dv-skel-rail">
                          <div class="dv-skel-tag" />
                          <div class="dv-skel-head" style={{ width: "88%" }} />
                          <div
                            class="dv-skel-head"
                            style={{ width: `${52 + (card() % 3) * 12}%` }}
                          />
                          <div class="sli-skel-line" style={{ width: "72%" }} />
                          <div class="sli-skel-line" style={{ width: "58%" }} />
                          <div class="sli-skel-line" style={{ width: "64%" }} />
                          <div class="dv-skel-btn" />
                          <div class="dv-skel-utils">
                            <For each={[0, 1, 2, 3]}>
                              {(i) => (
                                <div
                                  class="dv-skel-pill"
                                  style={{ width: `${2.6 + (i % 3) * 0.9}rem` }}
                                />
                              )}
                            </For>
                          </div>
                        </div>
                        <div class="dv-skel-main">
                          <div
                            class="dv-skel-verdict"
                            style={{ width: `${44 + (card() % 3) * 9}%` }}
                          />
                          <div class="dv-skel-tabs">
                            <div class="dv-skel-pill" style={{ width: "6rem" }} />
                            <div class="dv-skel-pill" style={{ width: "7rem" }} />
                          </div>
                          <For each={[0, 1]}>
                            {(row) => (
                              <div class="dv-skel-item">
                                <div class="dv-skel-pill" style={{ width: "3.6rem" }} />
                                <div class="dv-skel-item-body">
                                  <div
                                    class="sli-skel-line"
                                    style={{ width: `${86 - row * 14}%` }}
                                  />
                                  <div class="sli-skel-line" style={{ width: "62%" }} />
                                  <div class="sli-skel-line" style={{ width: "40%" }} />
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            }
          >
            <>
              {/* With a single paper the card's own verdict line already says
                  this, so the aggregate only earns its place across several. */}
              <Show when={aggregateOutcomes().total > 0 && paperCount() > 1}>
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
