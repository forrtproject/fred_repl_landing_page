import { writeFile, readFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "../dist");
const API_BASE = "https://rep-api.forrt.org/v1";
const SITE_URL = "https://forrt.org/flora-replication-atlas";
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
  if (!Array.isArray(authors) || !authors.length) return "unknown authors";
  if (authors.length === 1) return authors[0].family;
  if (authors.length === 2)
    return `${authors[0].family} & ${authors[1].family}`;
  return `${authors[0].family} et al.`;
}

function buildPageMeta(paper) {
  const doi = paper.doi;
  const title = paper.title || doi;
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  const authorNames = authors.map((a) => `${a.family}, ${a.given}`).join("; ");
  const authorLastNames = authors.map((a) => a.family).filter(Boolean);

  const replications = paper.record?.replications || [];
  const reproductions = paper.record?.reproductions || [];
  const stats = paper.record?.stats;
  const nReplications = stats?.n_replications_total ?? 0;
  const nReproductions = stats?.n_reproductions_total ?? 0;

  const allOutcomes = [
    ...replications.map((r) => r.outcome),
    ...reproductions.map((r) => r.outcome),
  ].filter(Boolean);
  const uniqueOutcomes = [...new Set(allOutcomes)];

  const replicationSentences = replications.map((r) => {
    const by = formatAuthors(r.authors);
    const outcome = r.outcome
      ? `described as ${r.outcome}`
      : "outcome not recorded";
    return `"${title}" has been replicated by ${by} (${r.year}), ${outcome}.`;
  });

  const reproductionSentences = reproductions.map((r) => {
    const by = formatAuthors(r.authors);
    const outcome = r.outcome
      ? `described as ${r.outcome}`
      : "outcome not recorded";
    return `"${title}" has been reproduced by ${by} (${r.year}), ${outcome}.`;
  });

  const replicationSummary =
    replicationSentences.length > 0 || reproductionSentences.length > 0
      ? [...replicationSentences, ...reproductionSentences].join(" ")
      : "No replications or reproductions recorded yet.";

  const description =
    `"${title}" by ${authorNames} (${paper.year}${paper.journal ? `, ${paper.journal}` : ""}). ` +
    `${replicationSummary} Indexed in the FLoRA Replication Atlas (FORRT FLoRA database). DOI: ${doi}`;

  const titleKeywords = title
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 6)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

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

  // Trailing slash is required: pages are written as doi/<doi>/index.html, and
  // GitHub Pages 301-redirects the slash-less URL to this one. Declaring the
  // slash-less form as canonical makes Google override it with the redirect target.
  const pageUrl = `${SITE_URL}/doi/${doi}/`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    name: title,
    author: authors.map((a) => ({
      "@type": "Person",
      givenName: a.given,
      familyName: a.family,
    })),
    datePublished: String(paper.year),
    isPartOf: paper.journal
      ? { "@type": "Periodical", name: paper.journal }
      : undefined,
    identifier: { "@type": "PropertyValue", propertyID: "DOI", value: doi },
    url: `https://doi.org/${doi}`,
    description,
    keywords,
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

  const ogImageUrl = `${SITE_URL}/doi/${doi}/og.png`;
  return {
    title: `${title} — FLoRA Replication Atlas`,
    description,
    keywords,
    pageUrl,
    jsonLd,
    authors,
    ogImageUrl,
  };
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
  const { title, description, keywords, pageUrl, jsonLd, authors, ogImageUrl } =
    meta;

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
    /(<meta name="keywords" content=")[^"]*(")/,
    `$1${escHtml(keywords)}$2`,
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
  const dois = await fetchAllDois();
  console.log(
    `Found ${dois.length} DOIs. Fetching paper data in batches of ${BATCH_SIZE}...`,
  );

  const papers = await fetchAllPapers(dois);
  const fetched = Object.keys(papers).length;
  console.log(`Got data for ${fetched}/${dois.length} DOIs. Writing pages...`);

  let withMeta = 0;
  let withoutMeta = 0;

  for (const doi of dois) {
    const paper = papers[doi];
    const outDir = join(DIST_DIR, "doi", doi);
    await mkdir(outDir, { recursive: true });

    if (paper) {
      withMeta++;
      const meta = buildPageMeta(paper);
      const html = injectMeta(baseHtml, meta);
      await writeFile(join(outDir, "index.html"), html, "utf-8");
      try {
        const png = await generateOgImage(paper);
        await writeFile(join(outDir, "og.png"), png);
      } catch (e) {
        console.warn(`  OG image failed for ${doi}: ${e.message}`);
      }
    } else {
      withoutMeta++;
      await writeFile(join(outDir, "index.html"), baseHtml, "utf-8");
    }

    const written = withMeta + withoutMeta;
    if (written % 100 === 0)
      console.log(`  ${written}/${dois.length} pages written`);
  }

  console.log(
    `Done. ${withMeta} pages with meta + OG image, ${withoutMeta} with fallback HTML.`,
  );
}

main().catch((err) => {
  console.error("Pre-render failed:", err.message);
  process.exit(1);
});
