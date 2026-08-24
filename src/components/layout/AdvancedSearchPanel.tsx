import { CheckIcon, CloseIcon } from "../icons";
import { createSignal, For, Show, createMemo, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { createFocusTrap } from "../../utils/modalA11y";

// ── Bucket tag input ─────────────────────────────────────────────────────────

const DELIMITER_KEYS = new Set(["Enter", ",", ";"]);

type BucketColor = "green" | "amber" | "red";

type BucketInputProps = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onInputChange?: (val: string) => void;
  placeholder: string;
  color: BucketColor;
  label: string;
  subLabel: string;
  icon: JSX.Element;
};

const BucketInput = (props: BucketInputProps) => {
  const [input, setInput] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  const addTag = (val: string) => {
    const trimmed = val.replace(/[,;]+$/, "").trim();
    if (trimmed && !props.tags.includes(trimmed)) {
      props.onTagsChange([...props.tags, trimmed]);
    }
    setInput("");
    props.onInputChange?.("");
  };

  const removeTag = (index: number) => {
    props.onTagsChange(props.tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const val = input();
    if (DELIMITER_KEYS.has(e.key) && val.trim()) {
      e.preventDefault();
      addTag(val);
      return;
    }
    if (e.key === "Backspace" && val === "" && props.tags.length > 0) {
      removeTag(props.tags.length - 1);
    }
  };

  const handleBlur = () => {
    if (input().trim()) addTag(input());
  };

  return (
    <div class={`adv-bucket adv-bucket--${props.color}`}>
      <div class="adv-bucket-hdr">
        <span class={`adv-bucket-icon adv-bucket-icon--${props.color}`}>
          {props.icon}
        </span>
        <span class="adv-bucket-label">{props.label}</span>
        <span class="adv-bucket-sub">{props.subLabel}</span>
      </div>
      <div class="adv-bucket-body" onClick={() => inputRef?.focus()}>
        <For each={props.tags}>
          {(tag, i) => (
            <span class={`adv-tag adv-tag--${props.color}`}>
              {tag}
              <button
                class="adv-tag-remove"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); removeTag(i()); }}
              >
                ×
              </button>
            </span>
          )}
        </For>
        <input
          ref={(el) => (inputRef = el)}
          type="text"
          class="adv-bucket-input"
          value={input()}
          onInput={(e) => { setInput(e.currentTarget.value); props.onInputChange?.(e.currentTarget.value); }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={props.tags.length === 0 ? props.placeholder : ""}
        />
      </div>
    </div>
  );
};

// ── Dual year range slider ───────────────────────────────────────────────────

const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear();

type YearSliderProps = {
  from: number;
  to: number;
  onFromChange: (v: number) => void;
  onToChange: (v: number) => void;
};

const YearSlider = (props: YearSliderProps) => {
  const pct = (v: number) => ((v - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  const fillStyle = () =>
    `left:${pct(props.from)}%;right:${100 - pct(props.to)}%`;

  return (
    <div class="yr-slider">
      <div class="yr-labels">
        <span class="yr-label">{props.from}</span>
        <span class="yr-label">{props.to}</span>
      </div>
      <div class="yr-track-wrap">
        <div class="yr-track-bg" />
        <div class="yr-track-fill" style={fillStyle()} />
        <input
          type="range"
          class="yr-input yr-input--from"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={props.from}
          onInput={(e) => {
            const v = parseInt(e.currentTarget.value);
            if (v <= props.to) props.onFromChange(v);
          }}
        />
        <input
          type="range"
          class="yr-input yr-input--to"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={props.to}
          onInput={(e) => {
            const v = parseInt(e.currentTarget.value);
            if (v >= props.from) props.onToChange(v);
          }}
        />
      </div>
    </div>
  );
};

// ── Outcome pills ────────────────────────────────────────────────────────────

const OUTCOMES = [
  { value: "successful", label: "Successful", dot: "#16a34a" },
  { value: "failed",     label: "Failed",     dot: "#b42318" },
  { value: "mixed",      label: "Mixed",      dot: "#b8860b" },
] as const;

type OutcomePillsProps = {
  selected: string[];
  onChange: (v: string[]) => void;
};

const OutcomePills = (props: OutcomePillsProps) => {
  const toggle = (val: string) => {
    const cur = props.selected;
    props.onChange(
      cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
    );
  };

  return (
    <div class="adv-outcome-pills">
      {OUTCOMES.map((o) => (
        <button
          type="button"
          class="adv-outcome-pill"
          classList={{ "adv-outcome-pill--active": props.selected.includes(o.value) }}
          onClick={() => toggle(o.value)}
        >
          <span class="adv-outcome-dot" style={`background:${o.dot}`} />
          {o.label}
        </button>
      ))}
    </div>
  );
};

// ── Paper type pills ─────────────────────────────────────────────────────────

const PAPER_TYPES = [
  { value: "original",     label: "Original" },
  { value: "replication",  label: "Replication" },
  { value: "reproduction", label: "Reproduction" },
] as const;

type PaperTypePillsProps = {
  selected: string[];
  onChange: (v: string[]) => void;
};

const PaperTypePills = (props: PaperTypePillsProps) => {
  const toggle = (val: string) => {
    const cur = props.selected;
    props.onChange(
      cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
    );
  };

  return (
    <div class="adv-outcome-pills">
      {PAPER_TYPES.map((t) => (
        <button
          type="button"
          class="adv-outcome-pill"
          classList={{ "adv-outcome-pill--active": props.selected.includes(t.value) }}
          onClick={() => toggle(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

// ── Natural language query summary ───────────────────────────────────────────

const QuerySummary = (props: {
  mustAll: string[];
  mustAny: string[];
  mustNone: string[];
  yearFrom: number;
  yearTo: number;
  outcomes: string[];
  paperTypes: string[];
}) => {
  const desc = createMemo(() => {
    const parts: JSX.Element[] = [];

    if (props.mustAll.length > 0) {
      parts.push(
        <>
          with <strong>all of</strong>{" "}
          {props.mustAll.map((t, i) => (
            <>
              {i > 0 && " and "}
              <strong class="adv-qs-term">{t}</strong>
            </>
          ))}
        </>,
      );
    }

    if (props.mustAny.length > 0) {
      parts.push(
        <>
          {parts.length > 0 ? ", " : ""}with <strong>any of</strong>{" "}
          {props.mustAny.map((t, i) => (
            <>
              {i > 0 && " or "}
              <strong class="adv-qs-term">{t}</strong>
            </>
          ))}
        </>,
      );
    }

    if (props.mustNone.length > 0) {
      parts.push(
        <>
          {parts.length > 0 ? ", " : ""}excluding{" "}
          {props.mustNone.map((t, i) => (
            <>
              {i > 0 && ", "}
              <strong class="adv-qs-term">{t}</strong>
            </>
          ))}
        </>,
      );
    }

    const yearChanged =
      props.yearFrom !== MIN_YEAR || props.yearTo !== MAX_YEAR;
    if (yearChanged) {
      parts.push(
        <>
          {parts.length > 0 ? ", " : ""}published{" "}
          <strong>
            {props.yearFrom}-{props.yearTo}
          </strong>
        </>,
      );
    }

    if (props.outcomes.length > 0) {
      parts.push(
        <>
          {parts.length > 0 ? ", " : ""}outcome{" "}
          <strong>{props.outcomes.join(" or ")}</strong>
        </>,
      );
    }

    if (props.paperTypes.length > 0) {
      parts.push(
        <>
          {parts.length > 0 ? ", " : ""}type{" "}
          <strong>{props.paperTypes.join(" or ")}</strong>
        </>,
      );
    }

    if (parts.length === 0) return <span class="adv-qs-empty">All studies</span>;

    return <>studies {parts}</>;
  });

  return (
    <div class="adv-qs">
      <div class="adv-qs-label">YOU'RE SEARCHING FOR</div>
      <div class="adv-qs-text">{desc()}</div>
    </div>
  );
};

// ── Main modal ───────────────────────────────────────────────────────────────

export type AdvancedSearchState = {
  mustAll: string[];
  mustAny: string[];
  mustNone: string[];
  yearFrom: number;
  yearTo: number;
  outcomes: string[];
  paperTypes: string[];
};

type Props = {
  open: boolean;
  state: AdvancedSearchState;
  onMustAllChange: (v: string[]) => void;
  onMustAnyChange: (v: string[]) => void;
  onMustNoneChange: (v: string[]) => void;
  onYearFromChange: (v: number) => void;
  onYearToChange: (v: number) => void;
  onOutcomesChange: (v: string[]) => void;
  onPaperTypesChange: (v: string[]) => void;
  onSearch: () => void;
  onClear: () => void;
  onClose: () => void;
};

export const AdvancedSearchPanel = (props: Props) => {
  let modalRef: HTMLDivElement | undefined;
  const [pendingAll, setPendingAll] = createSignal("");
  const [pendingAny, setPendingAny] = createSignal("");
  const [pendingNone, setPendingNone] = createSignal("");
  const [showHelp, setShowHelp] = createSignal(false);

  const canSearch = () =>
    props.state.mustAll.length > 0 || props.state.mustAny.length > 0 || props.state.mustNone.length > 0 ||
    props.state.paperTypes.length > 0 || props.state.outcomes.length > 0 ||
    props.state.yearFrom !== MIN_YEAR || props.state.yearTo !== MAX_YEAR ||
    pendingAll().trim().length > 0 || pendingAny().trim().length > 0 || pendingNone().trim().length > 0;

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.open) props.onClose();
  };

  onMount(() => document.addEventListener("keydown", handleKey));
  onCleanup(() => document.removeEventListener("keydown", handleKey));

  createFocusTrap(() => modalRef, () => props.open);

  return (
    <Show when={props.open}>
      <div
        class="adv-backdrop"
        onClick={props.onClose}
        role="presentation"
      >
        <div
          ref={modalRef}
          class="adv-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Advanced search"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="adv-modal-header">
            <div class="adv-modal-title-row">
              <h2 class="adv-modal-title">Advanced search</h2>
              <button
                class="adv-modal-help"
                type="button"
                title="How search works"
                classList={{ "adv-modal-help--active": showHelp() }}
                onClick={() => setShowHelp((v) => !v)}
              >
                ?
              </button>
            </div>
            <button
              class="adv-modal-close"
              type="button"
              onClick={props.onClose}
              title="Close"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {/* Body */}
          <div class="adv-modal-body">
            <Show when={showHelp()}>
              <div class="adv-help-panel">
                <div class="adv-help-cols">
                  <div class="adv-help-col">
                    <div class="adv-help-col-label">Keyword modes</div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--green">all</span>
                      <span>Every word must appear</span>
                    </div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--amber">any</span>
                      <span>At least one must appear</span>
                    </div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--red">not</span>
                      <span>Exclude matching studies</span>
                    </div>
                  </div>
                  <div class="adv-help-col">
                    <div class="adv-help-col-label">Filters</div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--gray">year</span>
                      <span>Publication year range</span>
                    </div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--gray">outcome</span>
                      <span>Replication result</span>
                    </div>
                    <div class="adv-help-item">
                      <span class="adv-help-chip adv-help-chip--gray">type</span>
                      <span>Study type</span>
                    </div>
                  </div>
                </div>
                <div class="adv-help-wildcards">
                  <div class="adv-help-wildcards-title">Pattern matching</div>
                  <div class="adv-help-wildcards-grid">
                    <code>experiment</code>
                    <span>Exact word: <em>experiment</em> only</span>
                    <code>experiment?</code>
                    <span>One extra letter: <em>experiment</em> or <em>experiments</em></span>
                    <code>experiment*</code>
                    <span>Starts with: <em>experimental</em>, <em>experimenting</em>…</span>
                    <code>*experiment*</code>
                    <span>Contains: <em>quasi-experimental</em>, <em>non-experimental</em>…</span>
                  </div>
                </div>
                <p class="adv-help-hint">Press <kbd>Enter</kbd> or <kbd>,</kbd> to add a keyword.</p>
              </div>
            </Show>
            {/* Keywords section */}
            <div class="adv-section-label">KEYWORDS</div>
            <div class="adv-buckets-row">
              <BucketInput
                tags={props.state.mustAll}
                onTagsChange={props.onMustAllChange}
                onInputChange={setPendingAll}
                placeholder="type a word…"
                color="green"
                label="Has all of these"
                subLabel="every word"
                icon={
                  <CheckIcon size={11} />
                }
              />
              <BucketInput
                tags={props.state.mustAny}
                onTagsChange={props.onMustAnyChange}
                onInputChange={setPendingAny}
                placeholder="type a word…"
                color="amber"
                label="Has any of these"
                subLabel="at least one"
                icon={<span style="font-size:12px;font-weight:700;line-height:1">±</span>}
              />
              <BucketInput
                tags={props.state.mustNone}
                onTagsChange={props.onMustNoneChange}
                onInputChange={setPendingNone}
                placeholder="type a word…"
                color="red"
                label="Excludes these"
                subLabel="none of"
                icon={
                  <CloseIcon size={11} />
                }
              />
            </div>

            {/* Filters */}
            <div class="adv-filter-year">
              <div class="adv-section-label">PUBLICATION YEAR</div>
              <YearSlider
                from={props.state.yearFrom}
                to={props.state.yearTo}
                onFromChange={props.onYearFromChange}
                onToChange={props.onYearToChange}
              />
            </div>
            <div class="adv-filters-row">
              <div class="adv-filter-col">
                <div class="adv-section-label">REPLICATION OUTCOME</div>
                <OutcomePills
                  selected={props.state.outcomes}
                  onChange={props.onOutcomesChange}
                />
              </div>
              <div class="adv-filter-col">
                <div class="adv-section-label">STUDY TYPE</div>
                <PaperTypePills
                  selected={props.state.paperTypes}
                  onChange={props.onPaperTypesChange}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="adv-modal-footer">
            <QuerySummary
              mustAll={props.state.mustAll}
              mustAny={props.state.mustAny}
              mustNone={props.state.mustNone}
              yearFrom={props.state.yearFrom}
              yearTo={props.state.yearTo}
              outcomes={props.state.outcomes}
              paperTypes={props.state.paperTypes}
            />
            <div class="adv-footer-actions">
              <button class="adv-clear-btn" type="button" onClick={props.onClear}>
                Clear
              </button>
              <button
                class="adv-search-btn"
                type="button"
                disabled={!canSearch()}
                onClick={props.onSearch}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
