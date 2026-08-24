import { ChevronRightIcon, SearchIcon } from "../icons";
import { createSignal, For } from "solid-js";
import { A } from "@solidjs/router";
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
export const REPLICATION_HUB_URL = "https://forrt.org/replication-hub/";
export const CONTRIBUTE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform";

export const paperCount = __PAPER_COUNT__;

export const exampleSearches = [
  { label: "power posing", query: "power posing" },
  { label: "marshmallow test", query: "marshmallow test" },
  { label: "ego depletion", query: "ego depletion" },
  { label: "growth mindset", query: "growth mindset" },
  { label: "10.1177/0956797610383437", query: "10.1177/0956797610383437" },
  { label: "10.1037/0022-3514.54.5.768", query: "10.1037/0022-3514.54.5.768" },
];

/* A real record, not a mock. Values mirror the atlas entry for
   10.1002/ejsp.2420170402; the preview links out to the live page, which stays
   authoritative if the database moves on. */
const exampleRecord = {
  doi: "10.1002/ejsp.2420170402",
  title:
    "Affective consequences of mere ownership: The name letter effect in twelve European languages",
  authors: "Nuttin, Jozef M.",
  year: 1987,
  journal: "European Journal of Social Psychology",
  replication: {
    title:
      "Impact of ownership on liking and value: Replications and extensions of three ownership effect experiments",
    authors: "Ziano, I.; Yao, J. D.; Gao, Y.; Feldman, G.",
    year: 2020,
    journal: "Journal of Experimental Social Psychology",
    outcome: "Success",
    quote:
      "We successfully replicated Nuttin's (1987) name-letter effect with participants rating a higher liking for letters of the alphabet included in their first names (vs. letters not included).",
  },
};

const recordFacets = [
  {
    term: "The original study",
    detail:
      "Title, authors, journal, and year, with a copyable APA reference and BibTeX entry.",
  },
  {
    term: "Every replication and reproduction on record",
    detail:
      "Each attempt carries its own citation and DOI, so you can go straight to the source.",
  },
  {
    term: "The sentence behind the outcome label",
    detail:
      "Where the atlas records an outcome, it also shows the quoted passage it was read from and where in the paper that passage appears.",
  },
  {
    term: "Routes out of the atlas",
    detail:
      "Publisher DOI links, open-access copies where they exist, and the PubPeer thread for post-publication discussion.",
  },
];

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
    <div class="landing">
      <section class="landing-hero">
        <div class="landing-hero-inner">
          <h1 class="landing-title">Has this study been replicated?</h1>
          <p class="landing-lede">
            Search by title, author, or DOI to see replication outcomes, related
            studies, and more.
          </p>

          <div class="welcome-search" onClick={() => inputRef?.focus()}>
            <SearchIcon size={15} aria-hidden="true" />
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
                        aria-label={`Remove ${tag}`}
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
                aria-label="Search the replication atlas"
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

          <div class="welcome-examples">
            <span class="welcome-examples-label">Try one of these</span>
            {exampleSearches.map((ex) => (
              <button
                type="button"
                class="welcome-doi"
                onClick={() => props.onExampleClick(ex.query)}
              >
                <span>{ex.label}</span>
                <ChevronRightIcon size={13} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="landing-section">
        <h2 class="landing-h2">Other ways in</h2>
        <div class="landing-bento">
          <a class="lb-cell lb-cell--feature" href={FLORA_EXPLORER_URL}>
            <span class="lb-figure">{paperCount.toLocaleString()}+</span>
            <span class="lb-title">Browse the whole database</span>
            <span class="lb-sub">
              Original findings paired with replication outcomes, filterable in
              the FLoRA Explorer.
            </span>
            <span class="lb-go">
              Open FLoRA Explorer
              <ChevronRightIcon size={14} aria-hidden="true" />
            </span>
          </a>

          {props.onAdvancedClick && (
            <button
              class="lb-cell"
              onClick={props.onAdvancedClick}
              type="button"
            >
              <span class="lb-title">Advanced search</span>
              <span class="lb-sub">
                Filter by keywords, year range, and replication outcome.
              </span>
              <span class="lb-go" aria-hidden="true">
                <ChevronRightIcon size={16} />
              </span>
            </button>
          )}

          {props.onImportClick && (
            <button
              class="lb-cell lb-cell--alt"
              onClick={props.onImportClick}
              type="button"
            >
              <span class="lb-title">Import a reference list</span>
              <span class="lb-sub">
                Paste a bibliography or upload a .txt or PDF file. DOIs are
                extracted and resolved for you.
              </span>
              <span class="lb-go" aria-hidden="true">
                <ChevronRightIcon size={16} />
              </span>
            </button>
          )}
        </div>
      </section>

      <section class="landing-section">
        <h2 class="landing-h2">What a record shows</h2>
        <div class="landing-record">
          <figure class="lr-figure">
            <div class="lr-card">
              <div class="lr-orig">
                <span class="lr-tag">Original</span>
                <p class="lr-title">{exampleRecord.title}</p>
                <p class="lr-meta">
                  {exampleRecord.authors} ({exampleRecord.year})
                </p>
                <p class="lr-journal">{exampleRecord.journal}</p>
                <span class="lr-doi">{exampleRecord.doi}</span>
              </div>
              <div class="lr-rep">
                <span class="lr-outcome">
                  {exampleRecord.replication.outcome}
                </span>
                <div class="lr-rep-body">
                  <p class="lr-title">{exampleRecord.replication.title}</p>
                  <p class="lr-meta">
                    {exampleRecord.replication.authors} (
                    {exampleRecord.replication.year}) ·{" "}
                    {exampleRecord.replication.journal}
                  </p>
                  <blockquote class="lr-quote">
                    {exampleRecord.replication.quote}
                  </blockquote>
                </div>
              </div>
            </div>
            <figcaption class="lr-caption">
              <A href={`/doi/${exampleRecord.doi}/`}>
                Open this record
                <ChevronRightIcon size={13} aria-hidden="true" />
              </A>
            </figcaption>
          </figure>

          <dl class="landing-defs">
            <For each={recordFacets}>
              {(facet) => (
                <div class="ld-row">
                  <dt>{facet.term}</dt>
                  <dd>{facet.detail}</dd>
                </div>
              )}
            </For>
          </dl>
        </div>
      </section>

      <section class="landing-section landing-about">
        <div class="landing-about-main">
          <h2 class="landing-h2">Where the data comes from</h2>
          <p>
            The Replication Atlas is a search layer over FLoRA, FORRT's Library
            of Reproduction and Replication Attempts, which grows out of the
            FORRT Replication Database (FReD). It currently covers{" "}
            {paperCount.toLocaleString()}+ original findings paired with
            replication and reproduction attempts across research disciplines.
          </p>
          <p>
            Coverage is not complete, and it is not meant to be read as a
            verdict on any single paper. If a replication is missing, or a
            record looks wrong, sending it in is the fastest way to get it
            fixed.
          </p>
        </div>
        <aside class="landing-about-aside">
          <a href={CONTRIBUTE_URL} target="_blank" rel="noreferrer">
            Add Missing Study
          </a>
          <a href={REPLICATION_HUB_URL} target="_blank" rel="noopener">
            FORRT Replication Hub
          </a>
        </aside>
      </section>

      <AlertDialog
        open={alertMessage() !== null}
        title="Can't split that paste"
        message={alertMessage() ?? ""}
        variant="warning"
        hint={
          <>
            Try separating DOIs with a comma, semicolon, or newline. For
            example:{" "}
            <code>10.1371/journal.pone.0335330, 10.1075/target.18159.ola</code>
          </>
        }
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};
