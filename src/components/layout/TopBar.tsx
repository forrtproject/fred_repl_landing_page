import { CloseIcon, FileIcon, FilterIcon, MenuIcon, SearchIcon } from "../icons";
import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import forrt from "../../assets/FORRT.svg";
import { parseDoiPaste } from "../../utils/doi";
import { AlertDialog } from "./AlertDialog";
import type { AdvancedSearchState } from "./AdvancedSearchPanel";

export type SearchMode = "doi" | "fuzzy" | "advanced";

type TopBarProps = {
  tags: string[];
  inputValue: string;
  searchMode: SearchMode;
  showSearch?: boolean;
  advancedState?: AdvancedSearchState;
  onInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onAddTags?: (tags: string[]) => void;
  onRemoveTag: (index: number) => void;
  onSearchSubmit: () => void;
  onNavigateSearch?: (tags: string[]) => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onInputRef?: (el: HTMLInputElement) => void;
  onImportClick?: () => void;
  onAdvancedClick?: () => void;
};

const DOI_DELIMITER_KEYS = new Set([",", ";", " ", "Tab"]);

export const TopBar = (props: TopBarProps) => {
  let inputRef: HTMLInputElement | undefined;
  let mobileInputRef: HTMLInputElement | undefined;
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [alertMessage, setAlertMessage] = createSignal<string | null>(null);

  const fireSearch = (extraTag?: string) => {
    const allTags = extraTag ? [...props.tags, extraTag] : [...props.tags];
    if (props.onNavigateSearch) {
      props.onNavigateSearch(allTags);
    } else {
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

    // Backspace on empty input removes the last tag
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

  const MIN_YEAR = 1950;
  const MAX_YEAR = new Date().getFullYear();

  const advancedBar = () => {
    const state = props.advancedState;
    if (!state) return null;
    const yearChanged = state.yearFrom !== MIN_YEAR || state.yearTo !== MAX_YEAR;
    return (
      <>
        <FilterIcon size={14} />
        <span class="topbar-adv-badge">Advanced</span>
        <div class="topbar-adv-chips">
          <For each={state.mustAll}>
            {(t) => (
              <span class="topbar-adv-chip topbar-adv-chip--green">
                <span class="topbar-adv-chip-pre">all</span>{t}
              </span>
            )}
          </For>
          <For each={state.mustAny}>
            {(t) => (
              <span class="topbar-adv-chip topbar-adv-chip--amber">
                <span class="topbar-adv-chip-pre">any</span>{t}
              </span>
            )}
          </For>
          <For each={state.mustNone}>
            {(t) => (
              <span class="topbar-adv-chip topbar-adv-chip--red">
                <span class="topbar-adv-chip-pre">not</span>{t}
              </span>
            )}
          </For>
          <Show when={yearChanged}>
            <span class="topbar-adv-chip topbar-adv-chip--gray">
              {state.yearFrom}-{state.yearTo}
            </span>
          </Show>
          <For each={state.outcomes}>
            {(o) => <span class="topbar-adv-chip topbar-adv-chip--primary">{o}</span>}
          </For>
          <For each={state.paperTypes}>
            {(t) => <span class="topbar-adv-chip topbar-adv-chip--gray">{t}</span>}
          </For>
        </div>
        <button
          class="topbar-adv-clear"
          type="button"
          title="Clear advanced search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); props.onSearchModeChange("fuzzy"); }}
        >
          <CloseIcon size={12} />
        </button>
      </>
    );
  };

  const searchBar = (ref: (el: HTMLInputElement) => void) => (
    <>
      <SearchIcon size={15} />
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
          ref={ref}
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
        class="topbar-search-btn"
        onClick={() => {
          const value = props.inputValue.trim();
          fireSearch(value || undefined);
        }}
      >
        Search
      </button>
    </>
  );

  return (
    <div class="topbar-wrapper">
      <nav class="topbar">
        <div class="topbar-left">
          <A class="topbar-brand" href="/">
            <div class="topbar-icon">
              <img
                src={forrt}
                alt="F"
                style={{ width: "20px", height: "20px" }}
              />
            </div>
            <div class="topbar-name">
              <strong>FLoRA</strong>
              <span>Replication Atlas</span>
            </div>
          </A>
        </div>
        <Show when={props.showSearch !== false}>
          <div class="topbar-search-group topbar-search-desktop">
            <div
              class="topbar-search"
              classList={{ "topbar-search--advanced": props.searchMode === "advanced" }}
              onClick={() => props.searchMode === "advanced" ? props.onAdvancedClick?.() : inputRef?.focus()}
            >
              {props.searchMode === "advanced"
                ? advancedBar()
                : searchBar((el) => {
                    inputRef = el;
                    props.onInputRef?.(el);
                  })}
            </div>
            <Show when={!!props.onAdvancedClick}>
              <span class="topbar-import-sep" aria-hidden="true" />
              <button
                class="topbar-adv-btn"
                classList={{ "topbar-adv-btn--active": props.searchMode === "advanced" }}
                onClick={() => props.onAdvancedClick!()}
                title={props.searchMode === "advanced" ? "Edit filters" : "Advanced search"}
                type="button"
              >
                <FilterIcon size={14} />
                {props.searchMode === "advanced" ? "Edit filters" : "Advanced search"}
              </button>
            </Show>
            <Show when={!!props.onImportClick}>
              <span class="topbar-import-sep" aria-hidden="true" />
              <button
                class="topbar-import-btn"
                onClick={() => props.onImportClick!()}
                title="Import references from text or file"
                type="button"
              >
                <FileIcon size={13} />
                Import refs
              </button>
            </Show>
          </div>
        </Show>
        <div class="topbar-right topbar-right-desktop">
          <a
            class="topbar-link"
            href="https://forrt.org/replication-hub/"
            target="_blank"
            rel="noopener"
          >
            About
          </a>
          <a
            class="topbar-link"
            href="https://forrt.org/flora-explorer/"
            target="_blank"
            rel="noopener"
          >
            FLoRA Explorer
          </a>
          <a
            class="topbar-cta"
            href="https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform"
            target="_blank"
            rel="noreferrer"
          >
            Add Missing Study
          </a>
        </div>
        <button
          class="topbar-hamburger"
          onClick={() => setMenuOpen(!menuOpen())}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen()}
        >
          {menuOpen() ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </nav>

      {/* Mobile search row: always visible on small screens */}
      <Show when={props.showSearch !== false}>
        <div class="topbar-mobile-search">
          <Show
            when={props.searchMode !== "advanced"}
            fallback={
              <div class="mob-adv-active-row">
                <FilterIcon size={13} />
                <div class="mob-adv-active-chips">
                  <For each={props.advancedState?.mustAll ?? []}>
                    {(t) => <span class="topbar-adv-chip topbar-adv-chip--green"><span class="topbar-adv-chip-pre">all</span>{t}</span>}
                  </For>
                  <For each={props.advancedState?.mustAny ?? []}>
                    {(t) => <span class="topbar-adv-chip topbar-adv-chip--amber"><span class="topbar-adv-chip-pre">any</span>{t}</span>}
                  </For>
                  <For each={props.advancedState?.mustNone ?? []}>
                    {(t) => <span class="topbar-adv-chip topbar-adv-chip--red"><span class="topbar-adv-chip-pre">not</span>{t}</span>}
                  </For>
                  <Show when={props.advancedState && (props.advancedState.yearFrom !== MIN_YEAR || props.advancedState.yearTo !== MAX_YEAR)}>
                    <span class="topbar-adv-chip topbar-adv-chip--gray">{props.advancedState!.yearFrom}-{props.advancedState!.yearTo}</span>
                  </Show>
                  <For each={props.advancedState?.outcomes ?? []}>
                    {(o) => <span class="topbar-adv-chip topbar-adv-chip--primary">{o}</span>}
                  </For>
                  <For each={props.advancedState?.paperTypes ?? []}>
                    {(t) => <span class="topbar-adv-chip topbar-adv-chip--gray">{t}</span>}
                  </For>
                </div>
                <button class="mob-adv-edit-btn" type="button" onClick={() => props.onAdvancedClick?.()}>Edit</button>
                <button class="mob-adv-active-clear" type="button" title="Clear" onClick={() => props.onSearchModeChange("fuzzy")}>
                  <CloseIcon size={12} />
                </button>
              </div>
            }
          >
            <div class="mob-search-modes">
              <button
                classList={{ active: props.searchMode === "doi" }}
                onClick={() => props.onSearchModeChange("doi")}
              >
                DOI
              </button>
              <button
                classList={{ active: props.searchMode === "fuzzy" }}
                onClick={() => props.onSearchModeChange("fuzzy")}
              >
                Author / Title / Year
              </button>
            </div>
            <div class="mob-search-row" onClick={() => mobileInputRef?.focus()}>
              <SearchIcon size={16} class="mob-search-icon" />
              <div class="mob-search-input-wrap">
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
                  ref={(el) => (mobileInputRef = el)}
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
                class="mob-search-btn"
                onClick={() => {
                  const value = props.inputValue.trim();
                  fireSearch(value || undefined);
                }}
              >
                <SearchIcon size={16} />
              </button>
              <Show when={!!props.onAdvancedClick}>
                <button
                  class="mob-adv-btn"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); props.onAdvancedClick!(); }}
                  title="Advanced search"
                >
                  <FilterIcon size={15} />
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Mobile nav menu */}
      {menuOpen() && (
        <div class="topbar-mobile-menu">
          <a
            class="topbar-mobile-link"
            href="https://forrt.org/replication-hub/"
            target="_blank"
            rel="noopener"
          >
            About
          </a>
          <a
            class="topbar-mobile-link"
            href="https://forrt.org/flora-explorer/"
            target="_blank"
            rel="noopener"
          >
            FLoRA Explorer
          </a>
          <a
            class="topbar-mobile-cta"
            href="https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform"
            target="_blank"
            rel="noreferrer"
          >
            Add Missing Study
          </a>
        </div>
      )}

      <AlertDialog
        open={alertMessage() !== null}
        title="Can't split that paste"
        message={alertMessage() ?? ""}
        variant="warning"
        hint={
          <>
            Try separating DOIs with a comma, semicolon, or newline. For example:
            {" "}
            <code>10.1371/journal.pone.0335330, 10.1075/target.18159.ola</code>
          </>
        }
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};
