import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import type { DOIResults, OriginalPaper } from "../../@types";
import { fetchMultipleDOIInfo } from "../../api/backend";
import { appName } from "../../configs";
import { TopBar, type SearchMode } from "../layout/TopBar";
import { DetailView } from "../layout/DetailView";
import { NoDataState } from "../layout/NoDataState";
import { Footer } from "../Footer";

export const DoiPage = () => {
  const params = useParams<{ doi: string }>();
  const navigate = useNavigate();

  const doi = () => decodeURIComponent(params.doi);
  const [paper, setPaper] = createSignal<OriginalPaper | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasData, setHasData] = createSignal(false);

  // SEO: update document title and meta tags
  const updateMeta = (paper: OriginalPaper | null) => {
    if (paper?.title) {
      document.title = `${paper.title} — ${appName}`;

      const setMetaTag = (name: string, content: string, attr = "name") => {
        let el = document.querySelector(
          `meta[${attr}="${name}"]`,
        ) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.content = content;
      };

      const authors =
        paper.authors?.map((a) => `${a.family}, ${a.given}`).join("; ") || "";
      const authorLastNames =
        paper.authors?.map((a) => a.family).filter(Boolean) || [];

      const stats = paper.record?.stats;
      const replications = paper.record?.replications || [];
      const reproductions = paper.record?.reproductions || [];
      const allOutcomes = [
        ...replications.map((r) => r.outcome),
        ...reproductions.map((r) => r.outcome),
      ].filter(Boolean);
      const uniqueOutcomes = [...new Set(allOutcomes)] as string[];
      const nReplications = stats?.n_replications_total ?? 0;
      const nReproductions = stats?.n_reproductions_total ?? 0;

      const formatAuthors = (a: (typeof replications)[0]["authors"]) => {
        if (!a?.length) return "unknown authors";
        if (a.length === 1) return a[0].family;
        if (a.length === 2) return `${a[0].family} & ${a[1].family}`;
        return `${a[0].family} et al.`;
      };

      const replicationSentences = replications.map((r) => {
        const by = formatAuthors(r.authors);
        const outcome = r.outcome
          ? `described as ${r.outcome}`
          : "outcome not recorded";
        return `"${paper.title}" has been replicated by ${by} (${r.year}), ${outcome}.`;
      });

      const reproductionSentences = reproductions.map((r) => {
        const by = formatAuthors(r.authors);
        const outcome = r.outcome
          ? `described as ${r.outcome}`
          : "outcome not recorded";
        return `"${paper.title}" has been reproduced by ${by} (${r.year}), ${outcome}.`;
      });

      const replicationSummary =
        replicationSentences.length > 0 || reproductionSentences.length > 0
          ? [...replicationSentences, ...reproductionSentences].join(" ")
          : "No replications or reproductions recorded yet.";

      const description =
        `"${paper.title}" by ${authors} (${paper.year}${paper.journal ? `, ${paper.journal}` : ""}). ` +
        `${replicationSummary} Indexed in the FLoRA Replication Atlas (FORRT FLoRA database). DOI: ${paper.doi}`;

      // Keywords: author names + title terms + journal + outcomes + standard SEO terms
      const titleKeywords =
        paper.title
          ?.split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 6)
          .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
          .filter(Boolean) || [];
      const keywords = [
        ...authorLastNames,
        paper.journal,
        String(paper.year),
        ...uniqueOutcomes.map((o) => `${o} replication`),
        ...titleKeywords,
        "replication",
        "reproducibility",
        "open science",
        "FLoRA",
        "FReD",
        "FORRT",
        "replication crisis",
        "has this study been replicated",
      ]
        .filter(Boolean)
        .join(", ");

      setMetaTag("description", description);
      setMetaTag("keywords", keywords);
      setMetaTag("og:title", paper.title, "property");
      setMetaTag("og:description", description, "property");
      setMetaTag("og:type", "article", "property");

      // Always point at the trailing-slash URL: that is what GitHub Pages serves
      // (the slash-less form 301s to it), so it must be the declared canonical.
      const base = import.meta.env.BASE_URL || "/";
      const canonicalUrl = `${window.location.origin}${base}doi/${doi()}/`;
      setMetaTag("og:url", canonicalUrl, "property");

      let canonicalLink = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonicalUrl;

      // Per-author OG tags for LLM and social parsers
      const existingAuthorMetas = document.querySelectorAll(
        'meta[property="article:author"]',
      );
      existingAuthorMetas.forEach((el) => el.remove());
      paper.authors?.forEach((a) => {
        const el = document.createElement("meta");
        el.setAttribute("property", "article:author");
        el.content = `${a.given} ${a.family}`;
        document.head.appendChild(el);
      });

      // Schema.org structured data for search engines and LLMs
      let script = document.getElementById(
        "doi-jsonld",
      ) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "doi-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        name: paper.title,
        author: paper.authors?.map((a) => ({
          "@type": "Person",
          givenName: a.given,
          familyName: a.family,
        })),
        datePublished: String(paper.year),
        isPartOf: paper.journal
          ? { "@type": "Periodical", name: paper.journal }
          : undefined,
        identifier: {
          "@type": "PropertyValue",
          propertyID: "DOI",
          value: paper.doi,
        },
        url: `https://doi.org/${paper.doi}`,
        description,
        keywords: keywords,
        subjectOf:
          nReplications > 0 || nReproductions > 0
            ? [
                ...replications.map((r) => ({
                  "@type": "ScholarlyArticle",
                  name: r.title,
                  additionalType: "ReplicationStudy",
                  ...(r.outcome && { description: `Outcome: ${r.outcome}` }),
                  ...(r.doi && {
                    identifier: {
                      "@type": "PropertyValue",
                      propertyID: "DOI",
                      value: r.doi,
                    },
                  }),
                })),
                ...reproductions.map((r) => ({
                  "@type": "ScholarlyArticle",
                  name: r.title,
                  additionalType: "ReproductionStudy",
                  ...(r.outcome && { description: `Outcome: ${r.outcome}` }),
                  ...(r.doi && {
                    identifier: {
                      "@type": "PropertyValue",
                      propertyID: "DOI",
                      value: r.doi,
                    },
                  }),
                })),
              ]
            : undefined,
      });
    } else {
      document.title = `${doi()} — ${appName}`;
    }
  };

  onCleanup(() => {
    document.title = appName;
    document.getElementById("doi-jsonld")?.remove();
    document
      .querySelectorAll('meta[property="article:author"]')
      .forEach((el) => el.remove());
  });

  onMount(() => {
    const doiValue = doi();
    if (!doiValue) return;

    fetchMultipleDOIInfo([doiValue])
      .then((res: DOIResults) => {
        const result = res.results?.[doiValue] || null;
        setPaper(result);
        setHasData(!!result?.record);
        updateMeta(result);
        setIsLoading(false);
      })
      .catch(() => {
        setPaper(null);
        setHasData(false);
        setIsLoading(false);
      });
  });

  const [searchMode, setSearchMode] = createSignal<SearchMode>("doi");
  const [tags, setTags] = createSignal<string[]>([doi()]);
  const [inputValue, setInputValue] = createSignal("");

  const handleSearch = (allTags: string[]) => {
    if (searchMode() === "fuzzy") {
      const query = allTags[0] || inputValue().trim();
      if (query) {
        navigate(`/?q=${encodeURIComponent(query)}`);
      }
    } else if (allTags.length === 1) {
      navigate(`/doi/${allTags[0]}/`);
    } else if (allTags.length > 1) {
      navigate(`/?dois=${allTags.join(",")}`);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags().includes(trimmed)) {
      setTags([...tags(), trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (index: number) => {
    debugger;
    const newTags = tags().filter((_, i) => i !== index);
    if (newTags.length === 0) {
      navigate("/");
    } else {
      setTags(newTags);
    }
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setInputValue("");
    if (mode === "fuzzy") {
      setTags([]);
    } else {
      setTags([doi()]);
    }
  };

  return (
    <>
      <TopBar
        tags={tags()}
        inputValue={inputValue()}
        searchMode={searchMode()}
        onInputChange={(v) => setInputValue(v)}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onSearchSubmit={() => handleSearch(tags())}
        onSearchModeChange={handleSearchModeChange}
        onNavigateSearch={handleSearch}
      />

      <div class="doi-page-layout">
        <Show
          when={!isLoading()}
          fallback={
            <div class="welcome-state">
              <div class="welcome-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#853953"
                  stroke-width="1.5"
                  class="spin"
                >
                  <path d="M12 2a10 10 0 1 0 10 10" />
                </svg>
              </div>
              <h2>Loading replication data...</h2>
              <p>{doi()}</p>
            </div>
          }
        >
          <Show
            when={hasData() && paper()}
            fallback={<NoDataState doi={doi()} />}
          >
            <DetailView paper={paper()!} />
          </Show>
        </Show>
      </div>

      <Footer />
    </>
  );
};
