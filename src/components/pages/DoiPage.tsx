import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import type { DOIResults, OriginalPaper, ReplicationItem } from "../../@types";
import {
  SITE_URL,
  atlasPath,
  buildDescription,
  buildTitle,
  cleanAuthorName,
  cleanTitle,
} from "../../seo/pageMeta.js";
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

  // SEO: keep a soft navigation's head identical to what the prerenderer wrote.
  const updateMeta = (paper: OriginalPaper | null) => {
    if (!paper?.title) {
      document.title = `${doi()} — ${appName}`;
      return;
    }

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

    const replications = paper.record?.replications || [];
    const reproductions = paper.record?.reproductions || [];
    const title = cleanTitle(paper.title) || paper.doi;
    const description = buildDescription(paper);

    document.title = buildTitle(paper);
    setMetaTag("description", description);
    setMetaTag("og:title", document.title, "property");
    setMetaTag("og:description", description, "property");
    setMetaTag("og:type", "article", "property");

    // Always point at the trailing-slash URL: that is what GitHub Pages serves
    // (the slash-less form 301s to it), so it must be the declared canonical.
    const base = import.meta.env.BASE_URL || "/";
    const canonicalUrl = `${window.location.origin}${base}doi/${doi()}/`;
    setMetaTag("og:url", canonicalUrl, "property");
    setMetaTag("og:image", `${canonicalUrl}og.png`, "property");
    setMetaTag("twitter:image", `${canonicalUrl}og.png`);

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
    document
      .querySelectorAll('meta[property="article:author"]')
      .forEach((el) => el.remove());
    paper.authors?.forEach((a) => {
      const el = document.createElement("meta");
      el.setAttribute("property", "article:author");
      el.content = cleanAuthorName(`${a.given} ${a.family}`);
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

    const attempt = (r: ReplicationItem, kind: string) => ({
      "@type": "ScholarlyArticle",
      name: cleanTitle(r.title) || r.doi,
      additionalType: `${SITE_URL}/#${kind}`,
      ...(r.doi && {
        url: atlasPath(r.doi),
        mainEntityOfPage: atlasPath(r.doi),
        identifier: {
          "@type": "PropertyValue",
          propertyID: "DOI",
          value: r.doi,
        },
        sameAs: `https://doi.org/${r.doi}`,
      }),
      ...(r.outcome && { description: `Outcome: ${r.outcome}` }),
      ...(r.year && { datePublished: String(r.year) }),
    });

    const subjectOf = [
      ...replications.map((r) => attempt(r, "ReplicationStudy")),
      ...reproductions.map((r) => attempt(r, "ReproductionStudy")),
    ];

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ScholarlyArticle",
          "@id": `${canonicalUrl}#article`,
          mainEntityOfPage: canonicalUrl,
          name: title,
          headline: title,
          author: paper.authors
            ?.map((a) => ({
              "@type": "Person",
              givenName: cleanAuthorName(a.given) || undefined,
              familyName: cleanAuthorName(a.family) || undefined,
              name: cleanAuthorName([a.given, a.family].filter(Boolean).join(" ")),
            }))
            .filter((a) => a.name),
          datePublished: String(paper.year),
          isPartOf: paper.journal
            ? { "@type": "Periodical", name: paper.journal }
            : undefined,
          identifier: {
            "@type": "PropertyValue",
            propertyID: "DOI",
            value: paper.doi,
          },
          url: canonicalUrl,
          sameAs: `https://doi.org/${paper.doi}`,
          description,
          isBasedOn: { "@id": `${SITE_URL}/#dataset` },
          subjectOf: subjectOf.length > 0 ? subjectOf : undefined,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: appName,
              item: `${SITE_URL}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Studies",
              item: `${SITE_URL}/browse/`,
            },
            { "@type": "ListItem", position: 3, name: title, item: canonicalUrl },
          ],
        },
      ],
    });
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
