import { createSignal, For } from "solid-js";
import type { ReplicationItem } from "../../@types";
import { authorYearLine } from "../../utils/formatter";

type ReplicationItemCardProps = {
  item: ReplicationItem;
  hideNa?: boolean;
  onCopyApa: (text: string) => void;
  onCopyBibtex: (text: string) => void;
};

type BadgeConfig = { label: string; cls: string };

function parseOutcomeBadges(outcome: string): BadgeConfig[] {
  const compMap: Record<string, BadgeConfig> = {
    "computationally successful": { label: "Comp. Success", cls: "comp-success" },
    "computational issues": { label: "Comp. Issues", cls: "comp-issues" },
    "computation not checked": { label: "Comp. Not Checked", cls: "comp-unchecked" },
  };
  const robMap: Record<string, BadgeConfig> = {
    "robust": { label: "Robust", cls: "robust" },
    "robustness challenges": { label: "Rob. Challenges", cls: "rob-challenges" },
    "robustness not checked": { label: "Not Checked", cls: "rob-unchecked" },
  };

  // Normalize (trim, lowercase, collapse internal whitespace) so trailing spaces
  // or irregular spacing don't cause a valid outcome to fall through to "N/A".
  const normalized = (outcome ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  for (const [compKey, compBadge] of Object.entries(compMap)) {
    for (const [robKey, robBadge] of Object.entries(robMap)) {
      if (normalized === `${compKey}, ${robKey}`) return [compBadge, robBadge];
    }
  }

  // Fallback for standard outcomes
  const simple: Record<string, BadgeConfig> = {
    successful: { label: "Success", cls: "successful" },
    failed: { label: "Failed", cls: "failed" },
    mixed: { label: "Mixed", cls: "mixed" },
    partial: { label: "Partial", cls: "partial" },
  };
  if (simple[normalized]) return [simple[normalized]];
  // A non-empty but unrecognized outcome gets the "other" class so it survives the
  // hideNa filter; only a truly-empty outcome stays as the class-less "N/A" badge.
  const trimmed = (outcome ?? "").trim();
  return [trimmed ? { label: trimmed, cls: "other" } : { label: "N/A", cls: "" }];
}

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const ReplicationItemCard = (props: ReplicationItemCardProps) => {
  const [expanded, setExpanded] = createSignal(false);
  const badges = () => parseOutcomeBadges(props.item.outcome);
  const meta = () =>
    [authorYearLine(props.item.authors, props.item.year), props.item.journal]
      .filter(Boolean)
      .join(" · ");

  return (
    <div class="rep-item">
      <div class="rep-item-main">
        <div class="ri-badge-group">
          <For each={badges().filter((b) => !(props.hideNa && !b.cls))}>
            {(b) => <span class={`ri-badge ${b.cls}`}>{b.label}</span>}
          </For>
        </div>
        <div class="ri-body">
          {props.item.title ? <div class="ri-title">{props.item.title}</div> : null}
          {meta() ? <div class="ri-meta">{meta()}</div> : null}
          {props.item.doi ? (
            <a
              class="ri-doi"
              href={`https://doi.org/${props.item.doi}`}
              target="_blank"
              rel="noreferrer"
            >
              {props.item.doi}
            </a>
          ) : props.item.url ? (
            <a
              class="ri-doi"
              href={props.item.url}
              target="_blank"
              rel="noreferrer"
            >
              {props.item.url}
            </a>
          ) : null}
        </div>
        <div class="ri-actions">
          {props.item.apa_ref && (
            <button
              class="ri-action"
              title="Copy APA reference"
              onClick={() => props.onCopyApa(props.item.apa_ref)}
            >
              <CopyIcon /> APA
            </button>
          )}
          {props.item.bibtex_ref && (
            <button
              class="ri-action"
              title="Copy BibTeX citation"
              onClick={() => props.onCopyBibtex(props.item.bibtex_ref)}
            >
              <CopyIcon /> BibTeX
            </button>
          )}
          {(props.item.doi || props.item.url) && (
            <a
              class="ri-action"
              href={props.item.doi ? `https://doi.org/${props.item.doi}` : props.item.url!}
              target="_blank"
              rel="noreferrer"
              title="View paper"
            >
              <ExternalLinkIcon /> View
            </a>
          )}
        </div>
      </div>

      {props.item.outcome_quote && (
        <div class="ri-expand">
          <button
            class={`ri-expand-toggle ${expanded() ? "expanded" : ""}`}
            onClick={() => setExpanded(!expanded())}
          >
            <span class="arrow">&#9654;</span> Outcome quote
          </button>
          {expanded() && (
            <div class="ri-quote">
              <div class="ri-quote-text">"{props.item.outcome_quote}"</div>
              {props.item.outcome_quote_source && (
                <div class="ri-quote-source">
                  Source: {props.item.outcome_quote_source}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
