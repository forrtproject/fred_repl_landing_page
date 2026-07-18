import {
  createSignal,
  createEffect,
  For,
  Show,
  onCleanup,
  onMount,
} from "solid-js";
import {
  parseReferences,
  parseRisFile,
  parseBibFile,
  extractDoisDirect,
} from "../../utils/referenceParser";
import { fetchOsfDois } from "../../utils/osfFetch";
import { lookupAll, type LookupResult } from "../../utils/doiLookup";

type Tab = "paste" | "upload" | "osf";
type Stage = "input" | "processing" | "results";
type FileType = "txt" | "ris" | "bib" | "pdf";

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: (dois: string[]) => void;
};

const SourceBadge = (props: { source: LookupResult["source"] }) => {
  const map: Record<string, { label: string; cls: string }> = {
    direct: { label: "DOI", cls: "rim-badge-direct" },
    crossref: { label: "CrossRef", cls: "rim-badge-crossref" },
    openalex: { label: "OpenAlex", cls: "rim-badge-openalex" },
    none: { label: "Not found", cls: "rim-badge-none" },
  };
  const info = () => map[props.source] ?? map.none;
  return <span class={`rim-badge ${info().cls}`}>{info().label}</span>;
};

export const ReferenceImportModal = (props: Props) => {
  const [tab, setTab] = createSignal<Tab>("paste");
  const [stage, setStage] = createSignal<Stage>("input");
  const [text, setText] = createSignal("");
  const [fileContent, setFileContent] = createSignal("");
  const [fileName, setFileName] = createSignal<string | null>(null);
  const [fileType, setFileType] = createSignal<FileType | null>(null);
  const [osfUrl, setOsfUrl] = createSignal("");
  const [results, setResults] = createSignal<LookupResult[]>([]);
  const [progress, setProgress] = createSignal({ done: 0, total: 0 });
  const [progressMsg, setProgressMsg] = createSignal("Looking up DOIs…");
  const [error, setError] = createSignal<string | null>(null);
  const [dragOver, setDragOver] = createSignal(false);

  let abortController: AbortController | null = null;
  let fileInputRef: HTMLInputElement | undefined;

  const reset = () => {
    abortController?.abort();
    setTab("paste");
    setStage("input");
    setText("");
    setFileContent("");
    setFileName(null);
    setFileType(null);
    setOsfUrl("");
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setProgressMsg("Looking up DOIs…");
    setError(null);
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    props.onClose();
  };

  createEffect(() => {
    if (!props.open) reset();
  });

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.open) handleClose();
  };
  onMount(() => window.addEventListener("keydown", handleKey));
  onCleanup(() => {
    window.removeEventListener("keydown", handleKey);
    abortController?.abort();
  });

  const loadFile = (file: File) => {
    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    const isRis = name.endsWith(".ris");
    const isBib = name.endsWith(".bib");
    const isTxt = name.endsWith(".txt") || file.type === "text/plain";
    if (!isPdf && !isRis && !isBib && !isTxt) {
      setError("Only .txt, .ris, .bib, or .pdf files are supported.");
      return;
    }
    const ft: FileType = isPdf ? "pdf" : isRis ? "ris" : isBib ? "bib" : "txt";
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent((e.target?.result as string) ?? "");
      setFileName(file.name);
      setFileType(ft);
      setError(null);
    };
    // PDF: read as latin-1 so DOIs (ASCII) survive byte-for-byte
    reader.readAsText(file, isPdf ? "ISO-8859-1" : undefined);
  };

  const handleFileInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) loadFile(file);
    // Reset so re-selecting the same file still fires a change event
    input.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  };

  const runExtraction = async () => {
    setError(null);
    abortController?.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    let refs: ReturnType<typeof parseReferences>;

    if (tab() === "osf") {
      const url = osfUrl().trim();
      if (!url) {
        setError("Please enter an OSF URL.");
        return;
      }
      setStage("processing");
      setProgressMsg("Fetching from OSF…");
      setProgress({ done: 0, total: 1 });
      try {
        refs = await fetchOsfDois(url, signal);
      } catch (e) {
        if (!signal.aborted) {
          setStage("input");
          setError(
            e instanceof Error ? e.message : "Failed to fetch OSF content.",
          );
        }
        return;
      }
      if (signal.aborted) return;
      if (refs.length === 0) {
        setStage("input");
        setError("No DOIs found in the OSF content.");
        return;
      }
    } else {
      const raw = (tab() === "upload" ? fileContent() : text()).trim();
      if (!raw) {
        setError("Please enter or upload some text first.");
        return;
      }
      const ft = fileType();
      refs =
        ft === "ris"
          ? parseRisFile(raw)
          : ft === "bib"
            ? parseBibFile(raw)
            : ft === "pdf"
              ? extractDoisDirect(raw)
              : parseReferences(raw);
      if (refs.length === 0) {
        setError("No references detected in the text.");
        return;
      }
      setStage("processing");
    }

    setProgressMsg("Looking up DOIs…");
    setProgress({ done: 0, total: refs.length });
    const found = await lookupAll(
      refs,
      (done, total) => {
        if (!signal.aborted) setProgress({ done, total });
      },
      signal,
    );
    if (signal.aborted) return;
    setResults(found);
    setStage("results");
  };

  const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
  const [editingValue, setEditingValue] = createSignal("");
  // Set when Escape aborts an edit, so the ensuing blur skips committing
  let editCancelled = false;

  const startEdit = (index: number, currentDoi: string) => {
    editCancelled = false;
    setEditingIndex(index);
    setEditingValue(currentDoi);
  };

  const cancelEdit = () => {
    editCancelled = true;
    setEditingIndex(null);
  };

  const commitEdit = (index: number) => {
    if (editCancelled) {
      editCancelled = false;
      return;
    }
    const doi = editingValue().trim();
    setResults((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (!doi) return r;
        return {
          ...r,
          doi,
          status: "found" as const,
          source: "direct" as const,
          selected: true,
        };
      }),
    );
    setEditingIndex(null);
  };

  const toggleResult = (index: number) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index && r.status !== "not_found"
          ? { ...r, selected: !r.selected }
          : r,
      ),
    );
  };

  const selectedDois = () =>
    results()
      .filter((r) => r.selected && r.doi)
      .map((r) => r.doi!);

  const handleSearch = () => {
    const dois = selectedDois();
    if (dois.length === 0) return;
    props.onSearch(dois);
    handleClose();
  };

  const foundCount = () =>
    results().filter((r) => r.status !== "not_found").length;
  const notFoundCount = () =>
    results().filter((r) => r.status === "not_found").length;

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
  };

  const submitDisabled = () =>
    tab() === "osf"
      ? !osfUrl().trim()
      : tab() === "upload"
        ? !fileContent().trim()
        : !text().trim();

  return (
    <Show when={props.open}>
      <div class="rim-backdrop" onClick={handleClose} role="presentation">
        <div
          class="rim-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Import References"
        >
          {/* Header */}
          <div class="rim-header">
            <div>
              <h2 class="rim-title">Import References</h2>
              <p class="rim-subtitle">
                Extract DOIs from a reference list, PDF, or OSF link.
              </p>
            </div>
            <button class="rim-close" onClick={handleClose} aria-label="Close">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Input stage */}
          <Show when={stage() === "input"}>
            {/* Tab bar */}
            <div class="rim-tabs">
              <button
                class={`rim-tab ${tab() === "paste" ? "active" : ""}`}
                onClick={() => switchTab("paste")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 2h6l2 2v2H7V4z" />
                  <rect x="5" y="6" width="14" height="16" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                Paste text
              </button>
              <button
                class={`rim-tab ${tab() === "upload" ? "active" : ""}`}
                onClick={() => switchTab("upload")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload file
              </button>
              {false && (
                <button
                  class={`rim-tab ${tab() === "osf" ? "active" : ""}`}
                  onClick={() => switchTab("osf")}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                  </svg>
                  OSF link
                </button>
              )}
            </div>

            <div class="rim-body">
              <Show when={tab() === "paste"}>
                <textarea
                  class="rim-textarea"
                  placeholder={
                    "Paste your reference list here…\n\nExamples:\n  10.1037/a0012345\n  Smith, J. (2020). Title. Journal, 10(2). https://doi.org/10.1037/a0012345\n  [1] Jones A. Title here. J. 2019;5:1–10."
                  }
                  value={text()}
                  onInput={(e) => {
                    setText(e.currentTarget.value);
                    setError(null);
                  }}
                  spellcheck={false}
                />
              </Show>

              <Show when={tab() === "upload"}>
                <div
                  class={`rim-dropzone ${dragOver() ? "drag-over" : ""} ${fileName() ? "has-file" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.ris,.bib,.pdf,text/plain,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleFileInput}
                  />
                  <Show
                    when={fileName()}
                    fallback={
                      <>
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          class="rim-drop-icon"
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p class="rim-drop-label">
                          Drop a file here or{" "}
                          <span class="rim-drop-link">click to browse</span>
                        </p>
                        <p class="rim-drop-formats">
                          .txt · .ris · .bib · .pdf
                        </p>
                      </>
                    }
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      class="rim-drop-icon-ok"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p class="rim-drop-filename">{fileName()}</p>
                    <p class="rim-drop-change">Click to change file</p>
                  </Show>
                </div>

                {/* Preview — skip for PDF (binary content) */}
                <Show
                  when={fileContent() && fileName() && fileType() !== "pdf"}
                >
                  <p class="rim-file-preview-label">Preview</p>
                  <div class="rim-file-preview">
                    {fileContent().substring(0, 600)}
                    {fileContent().length > 600 ? "…" : ""}
                  </div>
                </Show>
                <Show when={fileType() === "pdf" && fileName()}>
                  <p class="rim-file-preview-label">Ready</p>
                  <div class="rim-pdf-ready">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    PDF loaded — DOIs will be extracted on submit.
                  </div>
                </Show>
                <Show when={fileType() === "pdf" && fileName()}>
                <div class="rim-upload-tip rim-upload-tip-warning">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    Note: Only DOIs are extracted from uploaded files. If the
                    references do not contain DOIs, copy-paste them directly
                    into the{" "}
                    <button
                      class="rim-tip-link"
                      onClick={() => switchTab("paste")}
                    >
                      text input
                    </button>
                    .
                  </span>
                </div>
                </Show>
              </Show>

              {false && (
                <Show when={tab() === "osf"}>
                  <div class="rim-osf-section">
                    <label class="rim-osf-label" for="rim-osf-input">
                      OSF project or file URL
                    </label>
                    <input
                      id="rim-osf-input"
                      class="rim-osf-input"
                      type="url"
                      placeholder="https://osf.io/abc12"
                      value={osfUrl()}
                      onInput={(e) => {
                        setOsfUrl(e.currentTarget.value);
                        setError(null);
                      }}
                      spellcheck={false}
                    />
                    <p class="rim-osf-hint">
                      Paste a public OSF file or project link. DOIs are
                      extracted directly from the document content.
                    </p>
                  </div>
                </Show>
              )}

              <Show when={error()}>
                <p class="rim-error">{error()}</p>
              </Show>
            </div>

            <div class="rim-footer">
              <button class="rim-btn-ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                class="rim-btn-primary"
                onClick={runExtraction}
                disabled={submitDisabled()}
              >
                Extract &amp; look up DOIs
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </Show>

          {/* Processing stage */}
          <Show when={stage() === "processing"}>
            <div class="rim-body rim-body-center">
              <div class="rim-progress-wrap">
                <div class="rim-spinner" />
                <p class="rim-progress-text">
                  {progressMsg()} {progress().done} / {progress().total}
                </p>
                <div class="rim-progress-bar-track">
                  <div
                    class="rim-progress-bar-fill"
                    style={{
                      width:
                        progress().total > 0
                          ? `${(progress().done / progress().total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <p class="rim-progress-sub">
                  Querying CrossRef and OpenAlex for unresolved references…
                </p>
              </div>
            </div>
            <div class="rim-footer">
              <button
                class="rim-btn-ghost"
                onClick={() => {
                  abortController?.abort();
                  setStage("input");
                }}
              >
                Cancel
              </button>
            </div>
          </Show>

          {/* Results stage */}
          <Show when={stage() === "results"}>
            <div class="rim-results-summary">
              <span class="rim-sum-item rim-sum-found">
                {foundCount()} resolved
              </span>
              <Show when={notFoundCount() > 0}>
                <span class="rim-sum-sep">·</span>
                <span class="rim-sum-item rim-sum-none">
                  {notFoundCount()} not found
                </span>
              </Show>
              <span class="rim-sum-sep">·</span>
              <span class="rim-sum-hint">
                Uncheck any DOIs you want to exclude
              </span>
            </div>

            <div class="rim-results-list">
              <For each={results()}>
                {(result, i) => (
                  <div
                    class={`rim-result-row ${result.status === "not_found" ? "rim-row-none" : ""} ${result.selected ? "rim-row-selected" : ""}`}
                    onClick={() => toggleResult(i())}
                  >
                    <div class="rim-row-check">
                      <Show
                        when={result.status !== "not_found"}
                        fallback={
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        }
                      >
                        <div
                          class={`rim-checkbox ${result.selected ? "checked" : ""}`}
                        >
                          <Show when={result.selected}>
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </Show>
                        </div>
                      </Show>
                    </div>

                    <div class="rim-row-body">
                      <div class="rim-row-top">
                        <SourceBadge source={result.source} />
                        <Show
                          when={editingIndex() === i()}
                          fallback={
                            <div class="rim-doi-display">
                              <Show when={result.doi}>
                                <code class="rim-row-doi">{result.doi}</code>
                              </Show>
                              <button
                                class="rim-doi-edit-btn"
                                type="button"
                                title="Edit DOI"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(i(), result.doi ?? "");
                                }}
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2.5"
                                >
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </div>
                          }
                        >
                          <input
                            class="rim-doi-input"
                            type="text"
                            value={editingValue()}
                            onInput={(e) =>
                              setEditingValue(e.currentTarget.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitEdit(i());
                              }
                              if (e.key === "Escape") cancelEdit();
                            }}
                            onBlur={() => commitEdit(i())}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => setTimeout(() => el?.focus(), 0)}
                          />
                        </Show>
                      </div>
                      <Show when={result.foundTitle}>
                        <p class="rim-row-title">{result.foundTitle}</p>
                      </Show>
                      <p class="rim-row-raw" title={result.ref.raw}>
                        {result.ref.raw.length > 120
                          ? result.ref.raw.substring(0, 120) + "…"
                          : result.ref.raw}
                      </p>
                      <Show when={result.status === "not_found"}>
                        <p class="rim-row-unresolved">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Couldn't find a DOI for this reference. Please look it
                          up manually (e.g. on{" "}
                          <a
                            href="https://search.crossref.org"
                            target="_blank"
                            rel="noopener"
                          >
                            CrossRef
                          </a>{" "}
                          or{" "}
                          <a
                            href="https://openalex.org"
                            target="_blank"
                            rel="noopener"
                          >
                            OpenAlex
                          </a>
                          ) and add it to the search directly.
                        </p>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <div class="rim-footer">
              <button class="rim-btn-ghost" onClick={() => setStage("input")}>
                ← Back
              </button>
              <button
                class="rim-btn-primary"
                onClick={handleSearch}
                disabled={selectedDois().length === 0}
              >
                Search {selectedDois().length} paper
                {selectedDois().length !== 1 ? "s" : ""}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </button>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
