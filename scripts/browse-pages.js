/**
 * Static browse pages: the layer between the homepage and the DOI leaves.
 *
 * These are plain documents, not SPA routes. The client router has no /browse/*
 * route, so a hydrated shell would render blank there; GitHub Pages serves these
 * files directly and they need no JavaScript at all.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { SITE_URL, cleanTitle, outcomeCounts, shortAuthors, truncateWords } from "../src/seo/pageMeta.js";

const PER_PAGE = 100;
const MIN_JOURNAL_RECORDS = 3;
const MAX_JOURNALS = 300;

const OUTCOME_LABELS = {
  successful: "Successful replications",
  failed: "Failed replications",
  mixed: "Mixed replication outcomes",
  partial: "Partial replication outcomes",
  unrecorded: "Replications with no recorded outcome",
  none: "Studies with no replication on record",
};

const OUTCOME_BLURBS = {
  successful: "Findings whose every recorded replication or reproduction attempt was read as successful.",
  failed: "Findings whose every recorded replication or reproduction attempt was read as failed.",
  mixed: "Findings where recorded attempts disagree, or where an attempt was itself read as mixed.",
  partial: "Findings whose recorded attempts were read as partial.",
  unrecorded: "Findings with an attempt on record whose outcome was never labelled.",
  none: "Findings indexed in the atlas that no replication or reproduction has yet been paired with. An absent record is not evidence a finding failed to replicate.",
};

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** The single outcome bucket a study as a whole belongs in. */
function studyFacet(paper) {
  const counts = outcomeCounts(paper);
  if (counts.length === 0) return "none";
  const named = counts.filter(([b]) => b !== "unrecorded");
  if (named.length === 0) return "unrecorded";
  if (named.length > 1) return "mixed";
  return named[0][0];
}

function decadeOf(paper) {
  const year = Number(paper?.year);
  if (!Number.isFinite(year) || year < 1800 || year > 2100) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

/** Group papers into { key -> { label, blurb, path, papers[] } } per facet. */
function buildFacets(papers) {
  const outcome = new Map();
  const decade = new Map();
  const journal = new Map();

  for (const paper of papers) {
    const facet = studyFacet(paper);
    if (!outcome.has(facet))
      outcome.set(facet, {
        label: OUTCOME_LABELS[facet],
        blurb: OUTCOME_BLURBS[facet],
        path: `browse/outcome/${facet}`,
        papers: [],
      });
    outcome.get(facet).papers.push(paper);

    const dec = decadeOf(paper);
    if (dec) {
      if (!decade.has(dec))
        decade.set(dec, {
          label: `Studies published in the ${dec}`,
          blurb: `Original findings first published between ${dec.slice(0, 4)} and ${Number(dec.slice(0, 4)) + 9}, with every replication and reproduction attempt the atlas holds for them.`,
          path: `browse/year/${dec}`,
          papers: [],
          sort: Number(dec.slice(0, 4)),
        });
      decade.get(dec).papers.push(paper);
    }

    const name = (paper?.journal || "").trim();
    const slug = slugify(name);
    if (name && slug) {
      if (!journal.has(slug))
        journal.set(slug, {
          label: name,
          blurb: `Findings first published in ${name}, paired with the replication and reproduction attempts on record.`,
          path: `browse/journal/${slug}`,
          papers: [],
        });
      journal.get(slug).papers.push(paper);
    }
  }

  // A journal with one or two records is a page of chrome; drop it.
  const journals = [...journal.entries()]
    .filter(([, g]) => g.papers.length >= MIN_JOURNAL_RECORDS)
    .sort((a, b) => b[1].papers.length - a[1].papers.length)
    .slice(0, MAX_JOURNALS);

  const outcomeOrder = ["successful", "failed", "mixed", "partial", "unrecorded", "none"];
  return {
    outcome: outcomeOrder.filter((k) => outcome.has(k)).map((k) => outcome.get(k)),
    decade: [...decade.values()].sort((a, b) => b.sort - a.sort),
    journal: journals.map(([, g]) => g),
  };
}

function studyLine(paper) {
  const title = cleanTitle(paper.title) || paper.doi;
  const byline = [shortAuthors(paper.authors), paper.year].filter(Boolean).join(", ");
  const counts = outcomeCounts(paper);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  const outcome =
    total === 0
      ? "no replication on record"
      : counts.map(([b, n]) => `${n} ${b === "unrecorded" ? "unlabelled" : b}`).join(", ");
  return `<li>
        <a href="${SITE_URL}/doi/${esc(paper.doi)}/">${esc(truncateWords(title, 130))}</a>
        <span class="bp-meta">${esc(byline)}${byline ? " — " : ""}${esc(outcome)}</span>
      </li>`;
}

const STYLE = `
    :root{--ink:#2c2c2c;--muted:#5f5f5f;--brand:#853953;--brand-dark:#612d53;--rule:#e6e0e2}
    *{box-sizing:border-box}
    body{margin:0;background:#fff;color:var(--ink);font:16px/1.6 "Source Sans 3",system-ui,-apple-system,sans-serif}
    .bp{max-width:52rem;margin:0 auto;padding:2rem 1.25rem 4rem}
    h1,h2{font-family:Domine,Georgia,serif;color:var(--brand-dark);line-height:1.25}
    h1{font-size:1.85rem;margin:.5rem 0}
    h2{font-size:1.2rem;margin:2rem 0 .5rem}
    a{color:var(--brand)}
    nav.bp-crumbs{font-size:.9rem;color:var(--muted);margin-bottom:1rem}
    p.bp-lede{color:var(--muted);margin:.25rem 0 1.5rem}
    ul.bp-list{list-style:none;padding:0;margin:0}
    ul.bp-list li{padding:.6rem 0;border-bottom:1px solid var(--rule)}
    .bp-meta{display:block;color:var(--muted);font-size:.88rem}
    .bp-cols{columns:2 16rem;column-gap:2rem}
    .bp-cols li{break-inside:avoid;margin-bottom:.35rem}
    .bp-pager{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem;font-size:.95rem}
    footer.bp-foot{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--rule);font-size:.9rem;color:var(--muted)}
`;

function document_({ title, description, canonical, crumbs, body, prev, next }) {
  const links = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    prev ? `<link rel="prev" href="${esc(prev)}" />` : "",
    next ? `<link rel="next" href="${esc(next)}" />` : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#853953" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    ${links.join("\n    ")}
    <link rel="icon" type="image/png" href="${SITE_URL}/icon_hub.webp" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${SITE_URL}/og-banner.png" />
    <style>${STYLE}</style>
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": canonical,
      name: title,
      description,
      url: canonical,
      isPartOf: { "@id": `${SITE_URL}/#dataset` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.url,
        })),
      },
    })}
    </script>
  </head>
  <body>
    <div class="bp">
      <nav class="bp-crumbs">${crumbs
        .map((c, i) =>
          i === crumbs.length - 1
            ? esc(c.name)
            : `<a href="${esc(c.url)}">${esc(c.name)}</a>`,
        )
        .join(" &rsaquo; ")}</nav>
      ${body}
      <footer class="bp-foot">
        <a href="${SITE_URL}/">Search the FLoRA Replication Atlas</a> &middot;
        <a href="${SITE_URL}/browse/">Browse all</a> &middot;
        <a href="https://forrt.org/replication-hub/">FORRT Replication Hub</a>
      </footer>
    </div>
  </body>
</html>
`;
}

function pageUrl(path, page) {
  return page === 1 ? `${SITE_URL}/${path}/` : `${SITE_URL}/${path}/page/${page}/`;
}

function pager(path, page, pageCount) {
  if (pageCount <= 1) return "";
  const parts = [];
  if (page > 1) parts.push(`<a href="${pageUrl(path, page - 1)}">&larr; Previous</a>`);
  parts.push(`<span>Page ${page} of ${pageCount}</span>`);
  if (page < pageCount) parts.push(`<a href="${pageUrl(path, page + 1)}">Next &rarr;</a>`);
  return `<div class="bp-pager">${parts.join("")}</div>`;
}

async function writePage(distDir, path, html) {
  const outDir = join(distDir, path);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), html, "utf-8");
}

async function writeFacetGroup(distDir, group, parentCrumbs, urls) {
  const sorted = [...group.papers].sort(
    (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

  for (let page = 1; page <= pageCount; page++) {
    const slice = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const canonical = pageUrl(group.path, page);
    const suffix = page > 1 ? ` (page ${page} of ${pageCount})` : "";
    const title = `${group.label}${suffix} — FLoRA Replication Atlas`;
    const description = truncateWords(
      `${sorted.length} studies. ${group.blurb}`,
      158,
    );

    const body = `<h1>${esc(group.label)}</h1>
      <p class="bp-lede">${esc(group.blurb)} ${sorted.length} ${sorted.length === 1 ? "study" : "studies"} in the atlas.</p>
      <ul class="bp-list">
        ${slice.map(studyLine).join("\n        ")}
      </ul>
      ${pager(group.path, page, pageCount)}`;

    await writePage(
      distDir,
      page === 1 ? group.path : `${group.path}/page/${page}`,
      document_({
        title,
        description,
        canonical,
        crumbs: [...parentCrumbs, { name: group.label, url: pageUrl(group.path, 1) }],
        body,
        prev: page > 1 ? pageUrl(group.path, page - 1) : null,
        next: page < pageCount ? pageUrl(group.path, page + 1) : null,
      }),
    );
    urls.push(canonical);
  }
}

async function writeIndex(distDir, { path, label, blurb, groups, crumbs }, urls) {
  const canonical = `${SITE_URL}/${path}/`;
  const body = `<h1>${esc(label)}</h1>
      <p class="bp-lede">${esc(blurb)}</p>
      <ul class="bp-list bp-cols">
        ${groups
          .map(
            (g) =>
              `<li><a href="${SITE_URL}/${g.path}/">${esc(g.label)}</a> <span class="bp-meta">${g.papers.length} ${g.papers.length === 1 ? "study" : "studies"}</span></li>`,
          )
          .join("\n        ")}
      </ul>`;
  await writePage(
    distDir,
    path,
    document_({
      title: `${label} — FLoRA Replication Atlas`,
      description: truncateWords(blurb, 158),
      canonical,
      crumbs: [...crumbs, { name: label, url: canonical }],
      body,
    }),
  );
  urls.push(canonical);
}

/**
 * Writes /browse/ and every facet page under it.
 * @returns {Promise<string[]>} every canonical URL written, for the sitemap.
 */
export async function generateBrowsePages(distDir, papers) {
  const facets = buildFacets(papers);
  const urls = [];
  const root = { name: "FLoRA Replication Atlas", url: `${SITE_URL}/` };
  const hub = { name: "Browse", url: `${SITE_URL}/browse/` };

  const sections = [
    {
      path: "browse/outcome",
      label: "Browse by replication outcome",
      blurb:
        "Every study in the atlas, grouped by what its recorded replication and reproduction attempts found.",
      groups: facets.outcome,
    },
    {
      path: "browse/year",
      label: "Browse by decade of publication",
      blurb:
        "Every study in the atlas, grouped by the decade the original finding was published in.",
      groups: facets.decade,
    },
    {
      path: "browse/journal",
      label: "Browse by journal",
      blurb: `Journals with at least ${MIN_JOURNAL_RECORDS} findings in the atlas, most-covered first.`,
      groups: facets.journal,
    },
  ];

  for (const section of sections) {
    await writeIndex(distDir, { ...section, crumbs: [root, hub] }, urls);
    for (const group of section.groups) {
      await writeFacetGroup(
        distDir,
        group,
        [root, hub, { name: section.label, url: `${SITE_URL}/${section.path}/` }],
        urls,
      );
    }
  }

  const hubBody = `<h1>Browse the FLoRA Replication Atlas</h1>
      <p class="bp-lede">${papers.length.toLocaleString("en-US")} original findings, each paired with the replication and reproduction attempts on record for it.</p>
      ${sections
        .map(
          (s) => `<h2><a href="${SITE_URL}/${s.path}/">${esc(s.label)}</a></h2>
      <p class="bp-lede">${esc(s.blurb)}</p>
      <ul class="bp-list bp-cols">
        ${s.groups
          .slice(0, 24)
          .map(
            (g) =>
              `<li><a href="${SITE_URL}/${g.path}/">${esc(g.label)}</a> <span class="bp-meta">${g.papers.length}</span></li>`,
          )
          .join("\n        ")}
      </ul>`,
        )
        .join("\n      ")}`;

  await writePage(
    distDir,
    "browse",
    document_({
      title: "Browse replication outcomes — FLoRA Replication Atlas",
      description:
        "Browse every study in the FLoRA Replication Atlas by replication outcome, decade of publication, or journal.",
      canonical: `${SITE_URL}/browse/`,
      crumbs: [root, hub],
      body: hubBody,
    }),
  );
  urls.push(`${SITE_URL}/browse/`);

  return urls;
}
