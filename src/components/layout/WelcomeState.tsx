import { createSignal, For } from "solid-js";
import type { SearchMode } from "./TopBar";
import { parseDoiPaste } from "../../utils/doi";
import { AlertDialog } from "./AlertDialog";

const DOI_DELIMITER_KEYS = new Set([",", ";", " ", "Tab"]);

type WelcomeStateProps = {
  tags: string[];
  inputValue: string;
  searchMode: SearchMode;
  onInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onAddTags?: (tags: string[]) => void;
  onRemoveTag: (index: number) => void;
  onSearchSubmit: () => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onExampleClick: (query: string) => void;
  onImportClick?: () => void;
  onAdvancedClick?: () => void;
};

export const FLORA_EXPLORER_URL = "https://forrt.org/flora-explorer/";

export const paperCount = __PAPER_COUNT__;

export const exampleSearches = [
  { label: "power posing", query: "power posing" },
  { label: "marshmallow test", query: "marshmallow test" },
  { label: "ego depletion", query: "ego depletion" },
  { label: "growth mindset", query: "growth mindset" },
  { label: "10.1177/0956797610383437", query: "10.1177/0956797610383437" },
  { label: "10.1037/0022-3514.54.5.768", query: "10.1037/0022-3514.54.5.768" },
];

const ChevronRight = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    aria-hidden="true"
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

/** Real hrefs, not buttons: a DOI goes to its atlas page, a phrase to search. */
export const ExampleSearchLinks = (props: {
  label: string;
  onExampleClick: (query: string) => void;
  centered?: boolean;
}) => {
  const base = import.meta.env.BASE_URL || "/";
  return (
    <div
      class="welcome-examples"
      style={
        props.centered
          ? "margin-top: 1.5rem; justify-content: center"
          : undefined
      }
    >
      <div class="welcome-examples-label">{props.label}</div>
      <For each={exampleSearches}>
        {(ex) => {
          const isDoi = ex.query.startsWith("10.");
          const href = isDoi
            ? `${base}doi/${ex.query}/`
            : `${base}?q=${encodeURIComponent(ex.query)}`;
          return (
            <a
              class="welcome-doi"
              href={href}
              onClick={(e) => {
                // Modified and middle clicks fall through to the href.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                  return;
                e.preventDefault();
                props.onExampleClick(ex.query);
              }}
            >
              <span>{ex.label}</span>
              <ChevronRight />
            </a>
          );
        }}
      </For>
    </div>
  );
};

export const WelcomeState = (props: WelcomeStateProps) => {
  let inputRef: HTMLInputElement | undefined;
  const [alertMessage, setAlertMessage] = createSignal<string | null>(null);

  const fireSearch = (extraTag?: string) => {
    const allTags = extraTag ? [...props.tags, extraTag] : [...props.tags];
    if (props.searchMode === "fuzzy") {
      const query = allTags[0] || props.inputValue.trim();
      if (query) props.onSearchSubmit();
    } else if (allTags.length > 0) {
      if (extraTag) props.onAddTag(extraTag);
      setTimeout(() => props.onSearchSubmit(), 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const value = props.inputValue.trim();

    if (
      props.searchMode === "doi" &&
      value &&
      DOI_DELIMITER_KEYS.has(e.key)
    ) {
      e.preventDefault();
      props.onAddTag(value);
      return;
    }

    if (e.key === "Enter") {
      fireSearch(value || undefined);
      return;
    }

    if (
      e.key === "Backspace" &&
      props.inputValue === "" &&
      props.tags.length > 0
    ) {
      props.onRemoveTag(props.tags.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (props.searchMode !== "doi") return;
    const pasted = e.clipboardData?.getData("text") || "";
    const result = parseDoiPaste(pasted);
    if (result.kind === "none") return;
    e.preventDefault();
    if (result.kind === "reject") {
      setAlertMessage(result.reason);
      return;
    }
    const toAdd = result.kind === "single" ? [result.doi] : result.dois;
    if (props.onAddTags) {
      props.onAddTags(toAdd);
    } else {
      for (const part of toAdd) {
        props.onAddTag(part);
      }
    }
  };

  return (
    <div class="welcome-state">
      <div class="welcome-icon">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#853953"
          stroke-width="1.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <h1>Has this study been replicated?</h1>
      <p>
        Search by title, author, or DOI to see replication outcomes, related
        studies, and more.
      </p>

      <div class="welcome-search" onClick={() => inputRef?.focus()}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <div class="search-mode-toggle">
          <button
            classList={{ active: props.searchMode === "doi" }}
            onClick={(e) => {
              inputRef?.focus();
              e.stopPropagation();
              props.onSearchModeChange("doi");
            }}
          >
            DOI
          </button>
          <button
            classList={{ active: props.searchMode === "fuzzy" }}
            onClick={(e) => {
              inputRef?.focus();
              e.stopPropagation();
              props.onSearchModeChange("fuzzy");
            }}
          >
            Author / Title / Year
          </button>
        </div>
        <div class="tag-input-wrap">
          {props.searchMode === "doi" && (
            <For each={props.tags}>
              {(tag, i) => (
                <span class="search-tag">
                  {tag}
                  <button
                    class="search-tag-remove"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onRemoveTag(i());
                    }}
                  >
                    &times;
                  </button>
                </span>
              )}
            </For>
          )}
          <input
            ref={(el) => {
              inputRef = el;
              el.focus();
            }}
            type="text"
            placeholder={
              props.searchMode === "doi"
                ? props.tags.length === 0
                  ? "Search by DOI…"
                  : "Add another DOI…"
                : "Search by title, author, or year…"
            }
            value={props.inputValue}
            onInput={(e) => props.onInputChange(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            on:paste={handlePaste}
          />
        </div>
        <button
          class="welcome-search-btn"
          onClick={() => {
            const value = props.inputValue.trim();
            fireSearch(value || undefined);
          }}
        >
          Search
        </button>
      </div>

      <div class="welcome-import-or-divider">
        <span>or</span>
      </div>
      <div class="welcome-action-cards">
        {props.onAdvancedClick && (
          <button class="welcome-import-card" onClick={props.onAdvancedClick} type="button">
            <div class="welcome-import-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/>
                <line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/>
                <line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/>
                <line x1="16" y1="18" x2="16" y2="22"/>
              </svg>
            </div>
            <div class="welcome-import-card-body">
              <span class="welcome-import-card-title">Advanced search</span>
              <span class="welcome-import-card-sub">Filter by keywords, year range, and replication outcome</span>
            </div>
            <svg class="welcome-import-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {props.onAdvancedClick && props.onImportClick && (
          <div class="welcome-cards-or">
            <span>or</span>
          </div>
        )}
        {props.onImportClick && (
          <button class="welcome-import-card" onClick={props.onImportClick} type="button">
            <div class="welcome-import-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
            </div>
            <div class="welcome-import-card-body">
              <span class="welcome-import-card-title">Import a reference list</span>
              <span class="welcome-import-card-sub">Paste or upload a .txt file — DOIs extracted &amp; resolved automatically</span>
            </div>
            <svg class="welcome-import-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {(props.onAdvancedClick || props.onImportClick) && (
          <div class="welcome-cards-or">
            <span>or</span>
          </div>
        )}
        <a
          class="welcome-import-card"
          href={FLORA_EXPLORER_URL}
          target="_blank"
          rel="noopener"
        >
          <div class="welcome-import-card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div class="welcome-import-card-body">
            <span class="welcome-import-card-title">Browse the whole database</span>
            <span class="welcome-import-card-sub">
              Explore all {paperCount.toLocaleString()}+ findings in the FLoRA Explorer
            </span>
          </div>
          <svg class="welcome-import-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>

      <ExampleSearchLinks
        label="Example searches"
        onExampleClick={props.onExampleClick}
      />
      <p class="welcome-footnote">
        Powered by FORRT's Library of Reproduction and Replication Attempts
        (FLoRA), the Replication Atlas covers {paperCount.toLocaleString()}+
        original findings paired with replication outcomes across research
        disciplines.
      </p>

      <AlertDialog
        open={alertMessage() !== null}
        title="Can't split that paste"
        message={alertMessage() ?? ""}
        variant="warning"
        hint={
          <>
            Try separating DOIs with a comma, semicolon, or newline — e.g.
            {" "}
            <code>10.1371/journal.pone.0335330, 10.1075/target.18159.ola</code>
          </>
        }
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};
