import {
  ChartIcon,
  CopyIcon as Copy,
  DownloadIcon as Download,
  ExternalLinkIcon as ExternalLink,
  FlagIcon as Flag,
  LinkIcon as Link,
} from "../icons";
import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import type { OriginalPaper, ReplicationItem } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { authorYearLine } from "../../utils/formatter";
import { ReplicationItemCard } from "./ReplicationItemCard";
import { fetchPdfUrl } from "../../api/unpaywall";
import { CitationImpactModal } from "./CitationImpactModal";

type DetailViewProps = {
  paper: OriginalPaper;
};

type TabId = "replications" | "reproductions" | "originals";

const ExternalLinkIcon = () => (
  <ExternalLink size={12} />
);

const DownloadIcon = () => (
  <Download size={12} />
);

const CopyIcon = () => (
  <Copy size={12} />
);

const LinkIcon = () => (
  <Link size={12} />
);

const FlagIcon = () => (
  <Flag size={12} />
);

export const DetailView = (props: DetailViewProps) => {
  const [activeTab, setActiveTab] = createSignal<TabId>("replications");
  const [toastMessage, setToastMessage] = createSignal<string | null>(null);
  const [pdfUrl, setPdfUrl] = createSignal<string | null>(null);
  const [showCitations, setShowCitations] = createSignal(false);
  let toastTimer: number | undefined;
  let wrapRef: HTMLDivElement | undefined;
  let pdfFetched = false;

  const rep = () => formatReplicationResponse(props.paper);

  const fetchPdfLazy = async () => {
    if (pdfFetched) return;
    pdfFetched = true;
    const doi = props.paper.doi;
    if (!doi) return;
    try {
      const result = await fetchPdfUrl(doi);
      if (result.pdfUrl) setPdfUrl(result.pdfUrl);
    } catch {
      // No PDF available
    }
  };

  // Lazy-load PDF URL only when this detail view scrolls into the viewport
  createEffect(() => {
    if (!wrapRef) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchPdfLazy();
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(wrapRef);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    const r = rep();
    const hasRepOrRepro =
      (r.replications?.length || 0) > 0 || (r.reproductions?.length || 0) > 0;
    const hasOriginals = (r.originals?.length || 0) > 0;
    if (hasOriginals) {
      setActiveTab("originals");
    } else if (hasRepOrRepro) {
      const hasReplications = (r.replications?.length || 0) > 0;
      setActiveTab(hasReplications ? "replications" : "reproductions");
    }
  });

  onCleanup(() => {
    if (toastTimer) window.clearTimeout(toastTimer);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToastMessage(null), 2000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    }
  };

  const handleCopyApa = () => {
    if (rep().apaRef) copyToClipboard(rep().apaRef!, "APA reference");
  };

  const handleCopyBibtex = () => {
    if (rep().bibtexRef) copyToClipboard(rep().bibtexRef!, "BibTeX citation");
  };

  const handleShareLink = () => {
    const base = import.meta.env.BASE_URL || "/";
    // Trailing slash matches the canonical (prerendered) URL and avoids a 301
    const url = `${window.location.origin}${base}doi/${props.paper.doi}/`;
    copyToClipboard(url, "Share link");
  };

  const currentItems = (): ReplicationItem[] => {
    const r = rep();
    switch (activeTab()) {
      case "replications":
        return r.replications || [];
      case "reproductions":
        return r.reproductions || [];
      case "originals":
        return r.originals || [];
      default:
        return [];
    }
  };

  const outcomes = () => rep().outcomes;
  // Denominator is the categorized total; `outcomes.total` includes replications
  // with a null/other outcome that belong to no segment and must not be shown.
  const categorizedTotal = () => {
    const o = outcomes();
    if (!o) return 0;
    return (o.success || 0) + (o.mixed || 0) + (o.partial || 0) + (o.failed || 0);
  };
  // Unrounded so the three segment widths always sum to exactly 100%
  // (independent rounding could yield 99% or 101%); CSS renders fractional %.
  const successPct = () =>
    categorizedTotal() > 0
      ? ((outcomes()?.success || 0) / categorizedTotal()) * 100
      : 0;
  const mixedPct = () =>
    categorizedTotal() > 0
      ? (((outcomes()?.mixed || 0) + (outcomes()?.partial || 0)) /
          categorizedTotal()) *
        100
      : 0;
  const failedPct = () =>
    categorizedTotal() > 0
      ? ((outcomes()?.failed || 0) / categorizedTotal()) * 100
      : 0;
  const outcomeVariations = () => {
    const o = outcomes();
    if (!o) return 0;
    return [
      (o.success || 0) > 0,
      (o.mixed || 0) + (o.partial || 0) > 0,
      (o.failed || 0) > 0,
    ].filter(Boolean).length;
  };

  return (
    <div class="detail-wrap" ref={wrapRef}>
      <div class="detail-card">
        {/* Header */}
        <div class="dh">
          {/* Mobile: tags + share above title */}
          <div class="dh-top dh-top-mobile">
            <div class="dh-tags">
              <For each={props.paper.types || []}>
                {(type) => (
                  <span class={`dh-tag ${type.toLowerCase()}`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                )}
              </For>
            </div>
            <button
              class="dh-share-btn"
              onClick={handleShareLink}
              title="Copy share link"
            >
              <LinkIcon />
            </button>
          </div>
          {/* Desktop: title with tags + share inline */}
          <div class="dh-title-row">
            <h1 class="dh-title">{rep().title}</h1>
            <div class="dh-title-actions">
              <For each={props.paper.types || []}>
                {(type) => (
                  <span class={`dh-tag ${type.toLowerCase()}`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                )}
              </For>
              <button
                class="dh-share-btn"
                onClick={handleShareLink}
                title="Copy share link"
              >
                <LinkIcon />
              </button>
            </div>
          </div>
          <Show when={authorYearLine(rep().authors, rep().year)}>
            <div class="dh-authors">
              {authorYearLine(rep().authors, rep().year)}
            </div>
          </Show>
          <Show when={rep().data?.journal}>
            <div class="dh-journal">
              {rep().data!.journal}
              {rep().data!.volume ? ` ${rep().data!.volume}` : ""}
              {rep().data!.issue ? `(${rep().data!.issue})` : ""}
            </div>
          </Show>
          <Show when={rep().doi}>
            <a
              class="dh-doi-link"
              href={`https://doi.org/${rep().doi}`}
              target="_blank"
              rel="noreferrer"
            >
              {rep().doi}
            </a>
          </Show>
        </div>

        {/* Action bar */}
        <div class="action-bar">
          <div class="ab-group">
            <Show when={rep().doi}>
              <a
                class="ab-btn accent"
                href={`https://doi.org/${rep().doi}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLinkIcon /> View Paper
              </a>
            </Show>
            <Show when={pdfUrl()}>
              <a
                class="ab-btn"
                href={pdfUrl()!}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadIcon /> PDF
              </a>
            </Show>
          </div>
          <div class="ab-sep" />
          <div class="ab-group">
            <Show when={rep().apaRef}>
              <button
                class="ab-btn"
                onClick={handleCopyApa}
                title="Copy APA reference"
              >
                <CopyIcon /> Copy APA
              </button>
            </Show>
            <Show when={rep().bibtexRef}>
              <button
                class="ab-btn"
                onClick={handleCopyBibtex}
                title="Copy BibTeX citation"
              >
                <CopyIcon /> Copy BibTeX
              </button>
            </Show>
            <a
              class="ab-btn"
              href={`https://pubpeer.com/search?q=${rep().doi}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLinkIcon /> PubPeer
            </a>
            <button
              class="ab-btn"
              onClick={() => setShowCitations(true)}
              title="View citation timeline"
            >
              <ChartIcon size={12} />
              Citations
            </button>
          </div>
          <div class="ab-sep" />
          <div class="ab-group">
            <a
              class="ab-btn"
              href={`mailto:lukas.roeseler@uni-muenster.de?subject=[Replication Flag] ${rep().doi}&body=I would like to flag a potential issue in the replication record for:%0AOriginal DOI: ${rep().doi}%0AIssue details: [your comment here]`}
              title="Flag an error in this record"
            >
              <FlagIcon /> Flag Error
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <Show when={outcomeVariations() > 1}>
          <div class="progress-section">
            <div class="progress-row">
              <div class="progress-track">
                <div
                  class="progress-seg success"
                  style={{ width: `${successPct()}%` }}
                />
                <div
                  class="progress-seg mixed"
                  style={{ width: `${mixedPct()}%` }}
                />
                <div
                  class="progress-seg failed"
                  style={{ width: `${failedPct()}%` }}
                />
              </div>
            </div>
          </div>
        </Show>

        {/* Tabs */}
        <Show
          when={
            (rep().replications?.length || 0) > 0 ||
            (rep().reproductions?.length || 0) > 0 ||
            (rep().originals?.length || 0) > 0
          }
        >
          <div class="tabs-bar">
            <Show when={(rep().originals?.length || 0) > 0}>
              <button
                class={`tab-btn ${activeTab() === "originals" ? "active" : ""}`}
                onClick={() => setActiveTab("originals")}
              >
                Target Studies{" "}
                <span class="tab-badge">{rep().originals?.length || 0}</span>
              </button>
            </Show>
            <Show
              when={
                (rep().replications?.length || 0) > 0 ||
                (rep().reproductions?.length || 0) > 0
              }
            >
              <button
                class={`tab-btn ${activeTab() === "replications" ? "active" : ""}`}
                onClick={() => setActiveTab("replications")}
              >
                Replications{" "}
                <span class="tab-badge">{rep().replications?.length || 0}</span>
              </button>
              <button
                class={`tab-btn ${activeTab() === "reproductions" ? "active" : ""}`}
                onClick={() => setActiveTab("reproductions")}
              >
                Reproductions{" "}
                <span class="tab-badge">
                  {rep().reproductions?.length || 0}
                </span>
              </button>
            </Show>
          </div>
        </Show>

        {/* Items list */}
        <Show
          when={
            (rep().replications?.length || 0) > 0 ||
            (rep().reproductions?.length || 0) > 0 ||
            (rep().originals?.length || 0) > 0
          }
        >
          <div class="rep-list">
            <Show
              when={currentItems().length > 0}
              fallback={
                <div class="lp-empty" style={{ padding: "2rem" }}>
                  <p>No {activeTab()} found for this study.</p>
                </div>
              }
            >
              <For each={currentItems()}>
                {(item) => (
                  <ReplicationItemCard
                    item={item}
                    hideNa={activeTab() === "originals"}
                    onCopyApa={(text) => copyToClipboard(text, "APA reference")}
                    onCopyBibtex={(text) =>
                      copyToClipboard(text, "BibTeX citation")
                    }
                  />
                )}
              </For>
            </Show>
          </div>
        </Show>
      </div>

      {/* Toast */}
      <Show when={toastMessage()}>
        <div class="toast-msg">{toastMessage()}</div>
      </Show>

      {/* Citation Impact Modal */}
      <Show when={showCitations()}>
        <CitationImpactModal
          paper={props.paper}
          onClose={() => setShowCitations(false)}
        />
      </Show>
    </div>
  );
};
