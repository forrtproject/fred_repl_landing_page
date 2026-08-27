import { writeFile, readFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";
import {
  SITE_URL,
  buildDescription,
  buildTitle,
  cleanAuthorName,
  cleanTitle,
  outcomeCounts,
} from "../src/seo/pageMeta.js";
import { generateBrowsePages } from "./browse-pages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "../dist");
const API_BASE = "https://rep-api.forrt.org/v1";
const BATCH_SIZE = 100;
const CONCURRENT_BATCHES = 5;

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function fetchAllDois() {
  const res = await fetch(`${API_BASE}/dois`);
  if (!res.ok) throw new Error(`/dois returned ${res.status}`);
  const data = await res.json();
  const dois = Array.isArray(data) ? data : data.dois;
  if (!Array.isArray(dois)) throw new Error("Unexpected /dois response format");
  return dois;
}

async function fetchBatch(dois) {
  const res = await fetch(`${API_BASE}/original-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dois }),
  });
  if (!res.ok) throw new Error(`/original-lookup returned ${res.status}`);
  const data = await res.json();
  return data.results || {};
}

async function fetchAllPapers(dois) {
  const batches = [];
  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    batches.push(dois.slice(i, i + BATCH_SIZE));
  }

  const results = {};
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const chunk = batches.slice(i, i + CONCURRENT_BATCHES);
    const chunkResults = await Promise.all(chunk.map(fetchBatch));
    for (const r of chunkResults) Object.assign(results, r);
    const fetched = Math.min(
      (i + CONCURRENT_BATCHES) * BATCH_SIZE,
      dois.length,
    );
    console.log(`  Fetched ${fetched}/${dois.length} papers...`);
  }
  return results;
}

function formatAuthors(authors) {
  const names = (Array.isArray(authors) ? authors : [])
    .map((a) => cleanAuthorName(a?.family))
    .filter(Boolean);
  if (!names.length) return "unknown authors";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

/** Sibling atlas page for a linked study, or null when it has none. */
function atlasHref(doi, atlasDois) {
  if (!doi || !atlasDois.has(doi)) return null;
  return `${SITE_URL}/doi/${doi}/`;
}

function buildPageMeta(paper, atlasDois) {
  const doi = paper.doi;
  const title = cleanTitle(paper.title) || doi;
  const authors = Array.isArray(paper.authors) ? paper.authors : [];

  const replications = paper.record?.replications || [];
  const reproductions = paper.record?.reproductions || [];

  const pageTitle = buildTitle(paper);
  const description = buildDescription(paper);

  const uniqueOutcomes = [
    ...new Set(
      [...replications, ...reproductions].map((r) => r.outcome).filter(Boolean),
    ),
  ];

  // JSON-LD only; the `keywords` meta tag is gone.
  const keywords = [
    ...authors.map((a) => cleanAuthorName(a.family)).filter(Boolean),
    paper.journal,
    String(paper.year),
    ...uniqueOutcomes.map((o) => `${o} replication`),
    "replication",
    "reproducibility",
    "open science",
  ].filter(Boolean);

  // Trailing slash is required: pages are written as doi/<doi>/index.html, and
  // GitHub Pages 301-redirects the slash-less URL to this one. Declaring the
  // slash-less form as canonical makes Google override it with the redirect target.
  const pageUrl = `${SITE_URL}/doi/${doi}/`;

  const attempt = (r, kind) => {
    const href = atlasHref(r.doi, atlasDois);
    return {
      "@type": "ScholarlyArticle",
      name: cleanTitle(r.title) || r.doi,
      // A bare string here is not a type; schema.org wants a resolvable URI.
      additionalType: `https://forrt.org/flora-replication-atlas/#${kind}`,
      ...(href && { url: href, mainEntityOfPage: href }),
      ...(r.outcome && { description: `Outcome: ${r.outcome}` }),
      ...(r.year && { datePublished: String(r.year) }),
      ...(r.doi && {
        identifier: {
          "@type": "PropertyValue",
          propertyID: "DOI",
          value: r.doi,
        },
        sameAs: `https://doi.org/${r.doi}`,
      }),
    };
  };

  const subjectOf = [
    ...replications.map((r) => attempt(r, "ReplicationStudy")),
    ...reproductions.map((r) => attempt(r, "ReproductionStudy")),
  ];

  const article = {
    "@type": "ScholarlyArticle",
    "@id": `${pageUrl}#article`,
    mainEntityOfPage: pageUrl,
    name: title,
    headline: title,
    author: authors
      .map((a) => ({
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
    identifier: { "@type": "PropertyValue", propertyID: "DOI", value: doi },
    url: pageUrl,
    sameAs: `https://doi.org/${doi}`,
    description,
    keywords,
    isBasedOn: { "@id": `${SITE_URL}/#dataset` },
    subjectOf: subjectOf.length > 0 ? subjectOf : undefined,
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "FLoRA Replication Atlas",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Studies",
        item: `${SITE_URL}/browse/`,
      },
      { "@type": "ListItem", position: 3, name: title, item: pageUrl },
    ],
  };

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [article, breadcrumb],
  });

  return {
    title: pageTitle,
    description,
    pageUrl,
    jsonLd,
    authors,
    ogImageUrl: `${SITE_URL}/doi/${doi}/og.png`,
  };
}

function attemptLine(entry, atlasDois) {
  const href = atlasHref(entry.doi, atlasDois);
  const name = escHtml(cleanTitle(entry.title) || entry.doi || "Untitled attempt");
  const label = href ? `<a href="${href}">${name}</a>` : name;
  const by = escHtml(formatAuthors(entry.authors));
  const year = entry.year ? ` (${escHtml(entry.year)})` : "";
  const outcome = entry.outcome
    ? ` Outcome recorded: ${escHtml(entry.outcome)}.`
    : " No outcome recorded.";
  const quote = entry.outcome_quote
    ? ` <q>${escHtml(String(entry.outcome_quote).split("||")[0].trim().slice(0, 300))}</q>`
    : "";
  const paper = entry.doi
    ? ` <a href="https://doi.org/${escHtml(entry.doi)}">View paper</a>`
    : "";
  return `<li><strong>${label}</strong>, ${by}${year}.${outcome}${quote}${paper}</li>`;
}

// Links each page on to the next few, so they form a crawlable ring.
const RELATED_COUNT = 6;
function relatedLinks(dois, index, papers) {
  const out = [];
  for (let k = 1; k <= RELATED_COUNT && k < dois.length; k++) {
    const other = dois[(index + k) % dois.length];
    const label = cleanTitle(papers[other]?.title) || other;
    out.push(
      `<li><a href="${SITE_URL}/doi/${escHtml(other)}/">${escHtml(label.length > 90 ? label.slice(0, 89) + "\u2026" : label)}</a></li>`,
    );
  }
  return out.join("\n        ");
}

/** The crawlable copy of the record, for crawlers that never run the app. */
function renderBody(paper, dois, index, papers, atlasDois) {
  const doi = paper.doi;
  const title = cleanTitle(paper.title) || doi;
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  const authorNames = authors
    .map((a) => cleanAuthorName([a.given, a.family].filter(Boolean).join(" ")))
    .filter(Boolean)
    .join(", ");
  const replications = paper.record?.replications || [];
  const reproductions = paper.record?.reproductions || [];

  const venue = [paper.journal, paper.year]
    .filter(Boolean)
    .map((x) => escHtml(String(x)))
    .join(", ");

  const parts = [];
  if (replications.length > 0)
    parts.push(
      `${replications.length} ${replications.length === 1 ? "replication" : "replications"}`,
    );
  if (reproductions.length > 0)
    parts.push(
      `${reproductions.length} ${reproductions.length === 1 ? "reproduction" : "reproductions"}`,
    );

  const counts = outcomeCounts(paper);
  const outcomeSentence =
    counts.length > 0
      ? ` Recorded outcomes: ${counts
          .map(([b, n]) => `${n} ${b === "unrecorded" ? "with no outcome recorded" : b}`)
          .join(", ")}.`
      : "";
  const summary =
    parts.length > 0
      ? `The atlas records ${parts.join(" and ")} of this study.${outcomeSentence}`
      : "The atlas has no replication or reproduction of this study on record yet.";

  const section = (heading, items) =>
    items.length > 0
      ? `<h3>${heading}</h3>
        <ul>
        ${items.map((r) => attemptLine(r, atlasDois)).join("\n        ")}
        </ul>`
      : "";

  const noneNote =
    parts.length === 0
      ? `<p>An absent record is not evidence that the finding failed to replicate. It means no attempt has been indexed here yet. <a href="${SITE_URL}/">Search the atlas</a> for related work, or send in a replication we have missed.</p>`
      : "";

  return `<main class="ssg">
        <p class="ssg-meta"><a href="${SITE_URL}/">FLoRA Replication Atlas</a> &rsaquo; <a href="${SITE_URL}/browse/">Browse</a></p>
        <h1>${escHtml(title)}</h1>
        ${authorNames ? `<p class="ssg-meta">${escHtml(authorNames)}</p>` : ""}
        <p class="ssg-meta">${venue}${venue ? ". " : ""}DOI <a href="https://doi.org/${escHtml(doi)}">${escHtml(doi)}</a></p>

        <h2>Has this study been replicated?</h2>
        <p>${summary}</p>
        ${section("Replications", replications)}
        ${section("Reproductions", reproductions)}
        ${noneNote}

        <h2>Other studies in the atlas</h2>
        <ul class="ssg-related">
        ${relatedLinks(dois, index, papers)}
        </ul>
        <p><a href="${SITE_URL}/browse/outcome/failed/">Failed replications</a> &middot;
        <a href="${SITE_URL}/browse/outcome/successful/">Successful replications</a> &middot;
        <a href="${SITE_URL}/browse/">All browse pages</a></p>
      </main>`;
}

function escSvg(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current =
        word.length > maxChars ? word.slice(0, maxChars - 1) + "…" : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildOgSvg(paper, forrtLogoBase64) {
  const title = paper.title || paper.doi;
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  const authorStr = formatAuthors(authors);
  const journal = paper.journal || "";
  const year = paper.year || "";
  const replications = paper.record?.replications || [];

  const counts = { successful: 0, failed: 0, mixed: 0 };
  for (const r of replications) {
    if (r.outcome === "successful") counts.successful++;
    else if (r.outcome === "failed") counts.failed++;
    else counts.mixed++;
  }
  const totalReps = replications.length;

  const outcomeItems = [];
  if (counts.successful > 0)
    outcomeItems.push({
      color: "#15803d",
      bg: "#dcfce7",
      border: "#86efac",
      text: `${counts.successful} Successful`,
    });
  if (counts.failed > 0)
    outcomeItems.push({
      color: "#991b1b",
      bg: "#fee2e2",
      border: "#fca5a5",
      text: `${counts.failed} Failed`,
    });
  if (counts.mixed > 0)
    outcomeItems.push({
      color: "#92400e",
      bg: "#fef3c7",
      border: "#fcd34d",
      text: `${counts.mixed} Mixed`,
    });

  const W = 1200,
    H = 630;
  const padX = 80,
    padTop = 36;

  const tLen = title.length;
  const titleFontSize  = tLen <= 25 ? 78 : tLen <= 55 ? 58 : tLen <= 90 ? 50 : 44;
  const titleLineH     = tLen <= 25 ? 98 : tLen <= 55 ? 74 : tLen <= 90 ? 64 : 58;
  const titleMaxChars  = tLen <= 25 ? 22 : tLen <= 55 ? 36 : tLen <= 90 ? 44 : 43;
  const titleMaxLines  = tLen <= 25 ? 2  : 3;
  const titleY         = tLen <= 25 ? 240 : 210;

  const titleLines = wrapText(title, titleMaxChars).slice(0, titleMaxLines);
  if (wrapText(title, titleMaxChars).length > titleMaxLines)
    titleLines[titleMaxLines - 1] = titleLines[titleMaxLines - 1].replace(/\.*$/, "") + "…";

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${padX}" y="${titleY + i * titleLineH}" font-family="Georgia,'Times New Roman',serif" font-size="${titleFontSize}" font-weight="bold" fill="#0f172a">${escSvg(line)}</text>`,
    )
    .join("\n  ");

  const metaY = titleY + titleLines.length * titleLineH + 24;
  const metaStr = [authorStr, journal, String(year)]
    .filter(Boolean)
    .join("  ·  ");
  const metaTrunc = metaStr.length > 85 ? metaStr.slice(0, 85) + "…" : metaStr;
  const metaSvg = `<text x="${padX}" y="${metaY}" font-family="Georgia,'Times New Roman',serif" font-size="22" fill="#64748b">${escSvg(metaTrunc)}</text>`;

  const countY = metaY + 52;
  const repWord = totalReps === 1 ? "replication" : "replications";
  const countSentence =
    totalReps > 0
      ? `This study has ${totalReps} ${repWord}:`
      : "No replications recorded yet.";
  const countSvg = `<text x="${padX}" y="${countY}" font-family="Georgia,'Times New Roman',serif" font-size="22" fill="#334155">${escSvg(countSentence)}</text>`;

  const pillY = countY + 44;
  const pillH = 36;
  const pillPadX = 16;
  const pillCharW = 10;
  let pillX = padX;
  const pillSvg = outcomeItems
    .map((item) => {
      const approxW = item.text.length * pillCharW + pillPadX * 2;
      const svg = `
    <rect x="${pillX}" y="${pillY - 26}" width="${approxW}" height="${pillH}" rx="8" fill="${item.bg}" stroke="${item.border}" stroke-width="1.5"/>
    <text x="${pillX + pillPadX}" y="${pillY - 2}" font-family="Georgia,'Times New Roman',serif" font-size="19" font-weight="bold" fill="${item.color}">${escSvg(item.text)}</text>`;
      pillX += approxW + 14;
      return svg;
    })
    .join("");

  const logoW = 140,
    logoH = 44;
  const logoSvg = forrtLogoBase64
    ? `<image href="data:image/png;base64,${forrtLogoBase64}" x="${padX}" y="${padTop}" width="${logoW}" height="${logoH}"/>`
    : `<text x="${padX}" y="${padTop + 30}" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="#853953">FORRT</text>`;

  const brandLabel = `<text x="${W - padX}" y="${padTop + logoH - 8}" text-anchor="end" font-family="Georgia,'Times New Roman',serif" font-size="26" font-weight="bold" fill="#853953" letter-spacing="0.5">FLoRA REPLICATION ATLAS</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect width="${W}" height="6" fill="#853953"/>
  <rect y="${H - 68}" width="${W}" height="68" fill="#f8f5f6"/>
  <line x1="0" y1="${H - 68}" x2="${W}" y2="${H - 68}" stroke="#e8dde0" stroke-width="1"/>

  ${logoSvg}
  ${brandLabel}
  <line x1="${padX}" y1="${padTop + logoH + 12}" x2="${W - padX}" y2="${padTop + logoH + 12}" stroke="#f1e8eb" stroke-width="1.5"/>

  ${titleSvg}
  ${metaSvg}
  ${countSvg}
  ${outcomeItems.length > 0 ? pillSvg : ""}

  <text x="${padX}" y="${H - 24}" font-family="Georgia,'Times New Roman',serif" font-size="16" fill="#475569">forrt.org/flora-replication-atlas</text>
  <text x="${W - padX}" y="${H - 24}" text-anchor="end" font-family="Georgia,'Times New Roman',serif" font-size="16" fill="#475569">Has this study been replicated?</text>
</svg>`;
}

let _forrtLogoBase64 = null;
async function getForrtLogo() {
  if (!_forrtLogoBase64) {
    const buf = await readFile(join(__dirname, "../public/forrt_text.svg"));
    const logoResvg = new Resvg(buf, { fitTo: { mode: "width", value: 280 } });
    const png = logoResvg.render().asPng();
    _forrtLogoBase64 = png.toString("base64");
  }
  return _forrtLogoBase64;
}

async function generateOgImage(paper) {
  const logo = await getForrtLogo();
  const svg = buildOgSvg(paper, logo);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

function injectMeta(html, meta) {
  const { title, description, pageUrl, jsonLd, authors, ogImageUrl } = meta;

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escHtml(title)}</title>`,
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escHtml(pageUrl)}" />`,
  );

  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escHtml(description)}$2`,
  );
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${escHtml(title)}$2`,
  );
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${escHtml(description)}$2`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${escHtml(pageUrl)}$2`,
  );
  html = html.replace(
    /(<meta property="og:type" content=")[^"]*(")/,
    `$1article$2`,
  );
  if (ogImageUrl) {
    html = html.replace(
      /(<meta property="og:image" content=")[^"]*(")/,
      `$1${escHtml(ogImageUrl)}$2`,
    );
    html = html.replace(
      /(<meta name="twitter:image" content=")[^"]*(")/,
      `$1${escHtml(ogImageUrl)}$2`,
    );
  }

  html = html.replace(
    /(<meta name="twitter:title" content=")[^"]*(")/,
    `$1${escHtml(title)}$2`,
  );
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${escHtml(description)}$2`,
  );

  // Swap the landing page's crawlable copy for this paper's own.
  if (meta.body) {
    html = html.replace(
      /<!--ssg-start-->[\s\S]*?<!--ssg-end-->/,
      `<!--ssg-start-->\n      ${meta.body}\n      <!--ssg-end-->`,
    );
  }

  // Replace the site-level JSON-LD with the per-article one
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n    ${jsonLd}\n    </script>`,
  );

  // Inject per-author OG tags before </head>
  if (authors.length > 0) {
    const authorTags = authors
      .map(
        (a) =>
          `  <meta property="article:author" content="${escHtml(`${a.given} ${a.family}`)}">`,
      )
      .join("\n");
    html = html.replace("</head>", `${authorTags}\n</head>`);
  }

  return html;
}

async function main() {
  const baseHtml = await readFile(join(DIST_DIR, "index.html"), "utf-8");

  console.log("Fetching DOI list...");
  let dois = await fetchAllDois();

  // A source URL in the DOI field would become a nested directory here.
  const malformed = dois.filter((d) => !/^10\./.test(d));
  if (malformed.length) {
    console.warn(
      `  Skipping ${malformed.length} record(s) whose DOI field is not a DOI: ${malformed.slice(0, 5).join(", ")}`,
    );
    dois = dois.filter((d) => /^10\./.test(d));
  }

  // Local smoke-testing hook: PRERENDER_LIMIT=3 npm run prerender-doi-pages
  if (process.env.PRERENDER_LIMIT) {
    dois = dois.slice(0, Number(process.env.PRERENDER_LIMIT));
    console.log(`PRERENDER_LIMIT set, building ${dois.length} pages only.`);
  }
  console.log(
    `Found ${dois.length} DOIs. Fetching paper data in batches of ${BATCH_SIZE}...`,
  );

  const papers = await fetchAllPapers(dois);
  const fetched = Object.keys(papers).length;
  console.log(`Got data for ${fetched}/${dois.length} DOIs. Writing pages...`);

  // Only link on to a study that actually has a page here.
  const atlasDois = new Set(dois);

  let withMeta = 0;
  let withoutMeta = 0;

  for (let i = 0; i < dois.length; i++) {
    const doi = dois[i];
    const paper = papers[doi];
    const outDir = join(DIST_DIR, "doi", doi);
    await mkdir(outDir, { recursive: true });

    if (paper) {
      withMeta++;
      const meta = buildPageMeta(paper, atlasDois);
      meta.body = renderBody(paper, dois, i, papers, atlasDois);
      const html = injectMeta(baseHtml, meta);
      await writeFile(join(outDir, "index.html"), html, "utf-8");
      // The slow half of the build; skip it when only the HTML is under test.
      if (!process.env.PRERENDER_SKIP_OG) {
        try {
          const png = await generateOgImage(paper);
          await writeFile(join(outDir, "og.png"), png);
        } catch (e) {
          console.warn(`  OG image failed for ${doi}: ${e.message}`);
        }
      }
    } else {
      // Drop the landing copy so a DOI URL never presents the home page's text.
      withoutMeta++;
      const fallback = baseHtml.replace(
        /<!--ssg-start-->[\s\S]*?<!--ssg-end-->/,
        `<!--ssg-start--><main class="ssg"><h1>${escHtml(doi)}</h1><p>This record is in the atlas but its metadata could not be loaded at build time. <a href="${SITE_URL}/">Search the atlas</a> or open <a href="https://doi.org/${escHtml(doi)}">https://doi.org/${escHtml(doi)}</a>.</p></main><!--ssg-end-->`,
      );
      await writeFile(join(outDir, "index.html"), fallback, "utf-8");
    }

    const written = withMeta + withoutMeta;
    if (written % 100 === 0)
      console.log(`  ${written}/${dois.length} pages written`);
  }

  console.log(
    `Done. ${withMeta} pages with meta${process.env.PRERENDER_SKIP_OG ? "" : " + OG image"}, ${withoutMeta} with fallback HTML.`,
  );

  console.log("Writing browse pages...");
  const browseUrls = await generateBrowsePages(
    DIST_DIR,
    dois.map((d) => papers[d]).filter(Boolean),
  );
  // generate-sitemap.js reads this so the browse layer is in the sitemap too.
  await writeFile(
    join(DIST_DIR, "browse-index.json"),
    JSON.stringify(browseUrls, null, 0),
    "utf-8",
  );
  console.log(`Done. ${browseUrls.length} browse pages written.`);
}

main().catch((err) => {
  console.error("Pre-render failed:", err.message);
  process.exit(1);
});
