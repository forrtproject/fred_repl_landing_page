import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import type { OriginalPaper, FormattedDOIResult } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { formatAuthors } from "../../utils/formatter";
import { smoothScrollIntoView } from "../../utils/smoothScroll";

type TypeFilter = "original" | "replication";

type StudyListPanelProps = {
  results: Record<string, OriginalPaper>;
  selectedDoi: string | null;
  onSelect: (doi: string) => void;
  isLoading: boolean;
  hasSearched: boolean;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
};

type OutcomeStatus = "failed" | "mixed" | "partial" | "successful" | "blank";

const resolveOverallStatus = (rep: FormattedDOIResult): OutcomeStatus => {
  if (!rep.outcomes?.total) return "blank";
  const vals = [
    {
      outcome: "successful" as OutcomeStatus,
      count: rep.outcomes.success || 0,
    },
    { outcome: "failed" as OutcomeStatus, count: rep.outcomes.failed || 0 },
    {
      outcome: "mixed" as OutcomeStatus,
      count: (rep.outcomes.mixed || 0) + (rep.outcomes.partial || 0),
    },
  ].filter((v) => v.count > 0);

  if (vals.length === 1) return vals[0].outcome;
  return "mixed";
};

const PrintIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const StudyListPanel = (props: StudyListPanelProps) => {
  const [selectedDois, setSelectedDois] = createSignal<Set<string>>(new Set());

  let listRef: HTMLDivElement | undefined;
  const itemRefs: Record<string, HTMLDivElement> = {};

  // Keep the highlighted item visible whenever the selection changes (e.g. as
  // the right panel is scrolled). A single panel-level effect avoids waking one
  // effect per list item on every selection change. Reading the rendered list
  // also re-fires the scroll after the list re-renders (type-filter toggle,
  // deep-link results arriving), once the selected item has mounted.
  createEffect(() => {
    entries();
    const doi = props.selectedDoi;
    if (!doi || !listRef) return;
    const el = itemRefs[doi];
    if (el) smoothScrollIntoView(listRef, el, { block: "nearest", residualViewports: 2 });
  });

  // The checkbox selection persists across searches, so the header would keep
  // counting DOIs no longer in the list. Reset it whenever a new result set
  // arrives (defer so the initial mount doesn't clear a pre-seeded selection).
  createEffect(
    on(() => props.results, () => setSelectedDois(new Set<string>()), { defer: true }),
  );

  const toggleSelect = (doi: string, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedDois((prev) => {
      const next = new Set<string>(prev);
      if (next.has(doi)) next.delete(doi);
      else next.add(doi);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDois(new Set(entries().map((e) => e.doi)));
  };

  const clearSelection = () => setSelectedDois(new Set<string>());

  const allEntries = createMemo(() =>
    Object.entries(props.results)
      .map(([doi, paper]) => {
        const rep = formatReplicationResponse(paper);
        const status = resolveOverallStatus(rep);
        const hasData = !!(rep.title && paper.record);
        const isOriginal =
          (rep.replications?.length || 0) > 0 ||
          (rep.reproductions?.length || 0) > 0;
        const isReplication =
          (rep.originals?.length || 0) > 0 ||
          (paper.types?.includes("reproduction") ?? false);
        return { doi, paper, rep, status, hasData, isOriginal, isReplication };
      })
      .sort((a, b) => {
        if (a.hasData === b.hasData) return 0;
        return a.hasData ? -1 : 1;
      }),
  );

  const entries = createMemo(() => {
    const filter = props.typeFilter;
    if (filter === "original") return allEntries().filter((e) => e.isOriginal);
    return allEntries().filter((e) => e.isReplication);
  });

  const totalCount = () => Object.keys(props.results).length;
  const originalCount = () => allEntries().filter((e) => e.isOriginal).length;
  const replicationCount = () =>
    allEntries().filter((e) => e.isReplication).length;

  type EntryItem = ReturnType<typeof allEntries>[number];

  const handleExportPdf = (entriesToExport?: EntryItem[]) => {
    const visible = entriesToExport ?? entries();
    if (visible.length === 0) return;

    const filterLabel =
      props.typeFilter === "original"
        ? "Original Studies"
        : "Replication Studies";
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const outcomeClass = (o: string | undefined) => {
      if (!o) return "";
      if (o === "successful") return "successful";
      if (o === "failed") return "failed";
      return "mixed";
    };

    const cards = visible
      .map((entry) => {
        const originalApa = entry.paper.apa_ref || entry.rep.title || entry.doi;
        const reps = entry.rep.replications || [];
        const origs = entry.rep.originals || [];

        const repRows = reps
          .map(
            (r) =>
              `<div class="rep-row rep-row--${outcomeClass(r.outcome)}">
                <span class="rep-apa">${esc(r.apa_ref || r.title || r.doi || "")}</span>
              </div>`,
          )
          .join("");

        const origRows = origs
          .map(
            (r) =>
              `<div class="rep-row">
                <span class="rep-apa">${esc(r.apa_ref || r.title || r.doi || "")}</span>
              </div>`,
          )
          .join("");

        const repSection = reps.length > 0
          ? `<div class="rep-section orig-section">${repRows}</div>`
          : "";
        const origSection = origs.length > 0
          ? `<div class="rep-section orig-section">${origRows}</div>`
          : "";

        return `<div class="card">
          <div class="original-apa">${esc(originalApa)}</div>
          ${repSection}${origSection}
        </div>`;
      })
      .join("");

    const totOrig = visible.filter((e) => e.isOriginal).length;
    const totRepl = visible.filter((e) => e.isReplication).length;
    const summaryParts: string[] = [];
    summaryParts.push(`${visible.length} ${visible.length === 1 ? "study" : "studies"}`);
    if (totOrig > 0) summaryParts.push(`${totOrig} original`);
    if (totRepl > 0) summaryParts.push(`${totRepl} replication`);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FLoRA Replication Atlas Export — ${esc(filterLabel)}</title>
<style>
@page { margin: 1.5cm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Georgia, "Times New Roman", serif;
  color: #222; line-height: 1.6; max-width: 780px; margin: 0 auto; padding: 2rem 1.5rem;
}

header { margin-bottom: 1.8rem; }
header h1 { font-size: 22px; font-weight: 700; color: #853953; letter-spacing: -0.3px; }
header .sub { font-size: 12px; color: #777; margin-top: 0.2rem; font-family: -apple-system, "Segoe UI", sans-serif; }
header .sub span { color: #999; }

.card { border-bottom: 1px solid #e5e7eb; padding: 1rem 0; page-break-inside: avoid; }
.card:last-child { border-bottom: none; }

.original-apa { font-size: 13.5px; color: #111; line-height: 1.5; }

.rep-section { margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.35rem; }
.orig-section { padding-left: 1rem; }

.rep-row { display: flex; align-items: baseline; gap: 0.6rem; font-size: 12.5px; color: #444; line-height: 1.5; padding-left: 0.6rem; border-left: 2px solid #e5e7eb; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.rep-row--successful { border-left-color: #16a34a; }
.rep-row--failed { border-left-color: #b42318; }
.rep-row--mixed { border-left-color: #b8860b; }

.rep-apa { flex: 1; }

.legend { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; padding: 0.6rem 0.8rem; background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 4px; font-family: -apple-system, "Segoe UI", sans-serif; font-size: 11px; color: #555; flex-wrap: wrap; }
.legend-title { font-weight: 700; color: #333; margin-right: 0.2rem; }
.legend-item { display: flex; align-items: center; gap: 0.4rem; }
.legend-bar { display: inline-block; width: 3px; height: 14px; border-radius: 2px; flex-shrink: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.legend-bar--successful { background: #16a34a; }
.legend-bar--failed { background: #b42318; }
.legend-bar--mixed { background: #b8860b; }
.legend-bar--none { background: #e5e7eb; }

footer { margin-top: 2rem; padding-top: 0.6rem; border-top: 1px solid #ddd; font-family: -apple-system, "Segoe UI", sans-serif; font-size: 10px; color: #bbb; text-align: center; }

@media print {
  body { padding: 0; }
  footer { position: fixed; bottom: 0; left: 0; right: 0; }
}
</style></head>
<body>
  <header>
    <h1>FLoRA Replication Atlas &mdash; ${esc(filterLabel)}</h1>
    <div class="sub">${summaryParts.join(" <span>&middot;</span> ")} <span>&middot;</span> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </header>
  <div class="legend">
    <span class="legend-title">Replication outcome:</span>
    <span class="legend-item"><span class="legend-bar legend-bar--successful"></span> Successful</span>
    <span class="legend-item"><span class="legend-bar legend-bar--failed"></span> Failed</span>
    <span class="legend-item"><span class="legend-bar legend-bar--mixed"></span> Mixed / Partial</span>
    <span class="legend-item"><span class="legend-bar legend-bar--none"></span> Original / Target study</span>
  </div>
  ${cards}
  <footer>FLoRA Library &middot; <a href="https://forrt.org/flora-replication-atlas/" style="color:#bbb;">forrt.org/flora-replication-atlas/</a></footer>
</body></html>`;

    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => printWin.print();
  };

  return (
    <div class="left-panel">
      <div class="lp-header">
        <h3>Search Results</h3>
        <div class="lp-header-actions">
          <Show when={selectedDois().size > 0}>
            <span class="lp-select-count">{selectedDois().size} selected</span>
            <button
              class="lp-export-btn lp-export-btn--selected"
              onClick={() => {
                const sel = selectedDois();
                handleExportPdf(entries().filter((e) => sel.has(e.doi)));
              }}
              title="Export selected to PDF"
            >
              <PrintIcon /> Export
            </button>
          </Show>
          <Show when={selectedDois().size === 0 && totalCount() > 0}>
            <span class="lp-count">
              {totalCount()} {totalCount() === 1 ? "study" : "studies"}
            </span>
            <button
              class="lp-export-btn"
              onClick={() => handleExportPdf()}
              title={`Export ${props.typeFilter === "original" ? "originals" : "replications"} to PDF`}
            >
              <PrintIcon /> Export
            </button>
          </Show>
        </div>
      </div>

      <Show
        when={
          !props.isLoading &&
          totalCount() > 0 &&
          (originalCount() > 0 || replicationCount() > 0)
        }
      >
        <div class="sli-filter-bar">
          <Show when={originalCount() > 0}>
            <button
              class={`sli-filter-btn original ${props.typeFilter === "original" ? "active" : ""}`}
              onClick={() => props.onTypeFilterChange("original")}
            >
              Original <span class="sli-filter-count">{originalCount()}</span>
            </button>
          </Show>
          <Show when={replicationCount() > 0}>
            <button
              class={`sli-filter-btn replication ${props.typeFilter === "replication" ? "active" : ""}`}
              onClick={() => props.onTypeFilterChange("replication")}
            >
              Replication{" "}
              <span class="sli-filter-count">{replicationCount()}</span>
            </button>
          </Show>
          <Show when={entries().length > 1}>
            <button
              class="sli-select-all-btn"
              classList={{ "sli-select-all-btn--active": selectedDois().size > 0 }}
              onClick={() =>
                selectedDois().size > 0
                  ? clearSelection()
                  : selectAll()
              }
            >
              {selectedDois().size > 0
                ? "Deselect all"
                : "Select all"}
            </button>
          </Show>
        </div>
      </Show>

      <div class="study-list" ref={listRef}>
        <Show when={props.isLoading}>
          <div class="loading-panel">
            <div class="loading-spinner" />
            <span>Searching…</span>
          </div>
        </Show>

        <Show
          when={!props.isLoading && props.hasSearched && totalCount() === 0}
        >
          <div class="sli-empty">No results found</div>
        </Show>

        <Show when={!props.isLoading && entries().length > 0}>
          <For each={entries()}>
            {(entry) => (
              <div
                classList={{
                  sli: true,
                  active: props.selectedDoi === entry.doi,
                  "sli--checked": selectedDois().has(entry.doi),
                  "sli--selecting": selectedDois().size > 0,
                }}
                ref={(el) => {
                  itemRefs[entry.doi] = el;
                }}
                onClick={() => props.onSelect(entry.doi)}
              >
                <div
                  class={`sli-dot-check ${entry.status}`}
                  classList={{ "sli-dot-check--checked": selectedDois().has(entry.doi) }}
                  role="checkbox"
                  aria-checked={selectedDois().has(entry.doi)}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(entry.doi, e); }}
                  title="Select entry"
                />
                <div class="sli-body">
                  <div class="sli-title">{entry.rep.title || entry.doi}</div>
                  <Show when={[formatAuthors(entry.rep.authors), entry.rep.year].filter(Boolean).join(" · ")}>
                    {(meta) => <div class="sli-meta">{meta()}</div>}
                  </Show>
                  <div class="sli-pills">
                    <For each={entry.paper.types || []}>
                      {(type) => (
                        <span
                          class={`sli-pill sli-type-tag ${type.toLowerCase()}`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                      )}
                    </For>
                    <Show
                      when={
                        (entry.paper.types?.length || 0) > 0 &&
                        (entry.rep.outcomes?.total || 0) > 0
                      }
                    >
                      <span class="sli-pills-sep" />
                    </Show>
                    <Show when={(entry.rep.outcomes?.success || 0) > 0}>
                      <span class="sli-pill s">
                        {entry.rep.outcomes!.success} successful
                      </span>
                    </Show>
                    <Show
                      when={
                        (entry.rep.outcomes?.mixed || 0) +
                          (entry.rep.outcomes?.partial || 0) >
                        0
                      }
                    >
                      <span class="sli-pill m">
                        {(entry.rep.outcomes!.mixed || 0) +
                          (entry.rep.outcomes!.partial || 0)}{" "}
                        mixed
                      </span>
                    </Show>
                    <Show when={(entry.rep.outcomes?.failed || 0) > 0}>
                      <span class="sli-pill f">
                        {entry.rep.outcomes!.failed} failed
                      </span>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};
