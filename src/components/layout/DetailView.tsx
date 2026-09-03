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
  let railRef: HTMLDivElement | undefined;
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

  // A rail taller than the scroll viewport would pin with its lower half off
  // screen and no way to scroll to it. Offsetting the sticky top by the overflow
  // lets it travel up with the list until its end is reached, then pin.
  createEffect(() => {
    const el = railRef;
    if (!el) return;
    // Sticky offsets are anchored inside the scroller's padding, so that padding
    // is not usable height and has to come off the measurement.
    const viewportHeight = () => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/auto|scroll/.test(cs.overflowY)) {
          return (
            p.clientHeight -
            parseFloat(cs.paddingTop) -
            parseFloat(cs.paddingBottom)
          );
        }
      }
      return window.innerHeight;
    };
    // A results page mounts one of these per card, so skip writes that change
    // nothing rather than dirtying layout for every rail that already fits.
    let applied = "0px";
    let available = viewportHeight();
    const sync = () => {
      const overflow = el.offsetHeight - available;
      const next = overflow > 0 ? `${-overflow}px` : "0px";
      if (next === applied) return;
      applied = next;
      el.style.setProperty("--rail-top", next);
    };
    const onResize = () => {
      available = viewportHeight();
      sync();
    };
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    });
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

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  /* The line earns its place only when it summarises several attempts. Against a
     single one it just restates the badge directly below it. The empty case
     still shows, because nothing else in the column says "nothing on record". */
  const showVerdict = () => {
    const attempts =
      (outcomes()?.total || 0) +
      (rep().reproductions?.length || 0) +
      (rep().originals?.length || 0);
    return attempts === 0 || attempts > 1;
  };

  /* Describes the record, never the paper: the atlas reports what was logged,
     it does not rule on whether a finding holds. */
  const verdict = (): { tone: string; text: string } => {
    const o = outcomes();
    const n = o?.total || 0;
    const repro = rep().reproductions?.length || 0;
    const orig = rep().originals?.length || 0;

    if (n === 0) {
      if (repro > 0)
        return {
          tone: "neutral",
          text: `No replication on record. ${plural(repro, "reproduction")} logged.`,
        };
      if (orig > 0)
        return {
          tone: "neutral",
          text: `This paper is itself a replication attempt, targeting ${plural(orig, "study")}.`,
        };
      return { tone: "none", text: "No replication attempt on record yet." };
    }

    const counts = [
      { n: o?.failed || 0, label: "failed" },
      { n: o?.success || 0, label: "successful" },
      { n: o?.mixed || 0, label: "mixed" },
      { n: o?.partial || 0, label: "partial" },
    ].filter((c) => c.n > 0);
    const uncategorized = n - categorizedTotal();

    const dominant = counts.reduce(
      (a, b) => (b.n > a.n ? b : a),
      counts[0] ?? { n: 0, label: "" },
    );
    const tone =
      counts.length > 1
        ? "mixed"
        : dominant.label === "successful"
          ? "success"
          : dominant.label === "failed"
            ? "failed"
            : "mixed";

    const breakdown = counts.map((c) => `${c.n} ${c.label}`);
    if (uncategorized > 0)
      breakdown.push(`${uncategorized} with no outcome recorded`);

    const head = plural(n, "replication");
    const text =
      counts.length === 1 && uncategorized === 0 && n === 1
        ? `1 replication on record, recorded as ${dominant.label}.`
        : `${head} on record: ${breakdown.join(", ")}.`;

    return { tone, text: repro > 0 ? `${text} ${plural(repro, "reproduction")} logged.` : text };
  };

  return (
    <div class="detail-wrap" ref={wrapRef}>
      <div class="detail-card">
       <div class="dc">
        {/* Identity rail: what the paper is */}
        <div class="dc-rail">
         <div class="dc-rail-inner" ref={railRef}>
          <div class="dc-tags">
            <For each={props.paper.types || []}>
              {(type) => (
                <span class={`dh-tag ${type.toLowerCase()}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              )}
            </For>
          </div>
          <h1 class="dc-title">{rep().title}</h1>
          <Show when={authorYearLine(rep().authors, rep().year)}>
            <p class="dc-authors">{authorYearLine(rep().authors, rep().year)}</p>
          </Show>
          <Show when={rep().data?.journal}>
            <p class="dc-journal">
              {rep().data!.journal}
              {rep().data!.volume ? ` ${rep().data!.volume}` : ""}
              {rep().data!.issue ? `(${rep().data!.issue})` : ""}
            </p>
          </Show>
          <Show when={rep().doi}>
            <a
              class="dc-doi"
              href={`https://doi.org/${rep().doi}`}
              target="_blank"
              rel="noreferrer"
            >
              {rep().doi}
            </a>
          </Show>

          <div class="dc-actions">
            <Show when={rep().doi}>
              <a
                class="dc-primary"
                href={`https://doi.org/${rep().doi}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLinkIcon /> View paper
              </a>
            </Show>
            <Show when={pdfUrl()}>
              <a
                class="dc-secondary"
                href={pdfUrl()!}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadIcon /> PDF
              </a>
            </Show>
          </div>

          <div class="dc-utils">
            <Show when={rep().apaRef}>
              <button class="dc-util" onClick={handleCopyApa} title="Copy APA reference" aria-label="Copy APA reference">
                <CopyIcon /> <span>APA</span>
              </button>
            </Show>
            <Show when={rep().bibtexRef}>
              <button class="dc-util" onClick={handleCopyBibtex} title="Copy BibTeX citation" aria-label="Copy BibTeX citation">
                <CopyIcon /> <span>BibTeX</span>
              </button>
            </Show>
            <button class="dc-util" onClick={handleShareLink} title="Copy share link" aria-label="Copy share link">
              <LinkIcon /> <span>Share</span>
            </button>
            <button
              class="dc-util"
              onClick={() => setShowCitations(true)}
              title="View citation timeline"
              aria-label="View citation timeline"
            >
              <ChartIcon size={12} /> <span>Citations</span>
            </button>
            <a
              class="dc-util"
              href={`https://pubpeer.com/search?q=${rep().doi}`}
              target="_blank"
              rel="noreferrer"
              title="Open the PubPeer thread"
              aria-label="Open the PubPeer thread"
            >
              <ExternalLinkIcon /> <span>PubPeer</span>
            </a>
          </div>

          <a
            class="dc-flag"
            href={`mailto:lukas.roeseler@uni-muenster.de?subject=[Replication Flag] ${rep().doi}&body=I would like to flag a potential issue in the replication record for:%0AOriginal DOI: ${rep().doi}%0AIssue details: [your comment here]`}
            title="Flag an error in this record"
          >
            <FlagIcon /> Flag an error in this record
          </a>
         </div>
        </div>

        {/* Evidence column: what the record says happened */}
        <div class="dc-main">
          <Show when={showVerdict()}>
            <div class={`dc-verdict dc-verdict--${verdict().tone}`}>
              <p class="dc-verdict-text">{verdict().text}</p>
              <Show when={outcomeVariations() > 1}>
                <div
                  class="dc-spine"
                  role="img"
                  aria-label={`Outcome split: ${verdict().text}`}
                >
                  <div class="dc-spine-seg success" style={{ width: `${successPct()}%` }} />
                  <div class="dc-spine-seg mixed" style={{ width: `${mixedPct()}%` }} />
                  <div class="dc-spine-seg failed" style={{ width: `${failedPct()}%` }} />
                </div>
              </Show>
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
       </div>
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
