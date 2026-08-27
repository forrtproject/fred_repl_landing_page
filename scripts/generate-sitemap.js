import { writeFile, readFile } from "fs/promises";
import { dirname, join } from "path";

// const API_BASE = process.env.VITE_BACKEND_URL || "https://rep-api.forrt.org/v1";
const API_BASE = "https://rep-api.forrt.org/v1/";
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf-8"));
const SITE_URL = pkg.homepage;
const OUTPUT_PATH = process.env.OUTPUT_PATH || "dist/sitemap.xml";

async function fetchAllDois() {
  const res = await fetch(`${API_BASE}/dois`);
  if (!res.ok) throw new Error(`API returned ${res.status}: ${res.statusText}`);
  const data = await res.json();

  // Support both { dois: [...] } and plain array responses
  const dois = Array.isArray(data) ? data : data.dois;
  if (!Array.isArray(dois)) {
    throw new Error(
      "Unexpected API response format — expected an array of DOIs",
    );
  }
  return dois;
}

function encodeDoi(doi) {
  // Brackets are the common case: emitted raw, the entry is rejected.
  return doi.replace(
    /[&<>"'\[\]{}|\\^`\s]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

/** Some records store a source URL in the DOI field; those have no page. */
function isRealDoi(doi) {
  return typeof doi === "string" && /^10\./.test(doi);
}

/** Browse-page URLs, written by the prerenderer. Absent on a pre-build run. */
async function readBrowseUrls() {
  try {
    const path = join(dirname(OUTPUT_PATH), "browse-index.json");
    const urls = JSON.parse(await readFile(path, "utf-8"));
    return Array.isArray(urls) ? urls : [];
  } catch {
    return [];
  }
}

function buildSitemap(dois, browseUrls) {
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    // Homepage
    `  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
    // Browse pages: the layer between the homepage and the DOI leaves
    ...browseUrls.map(
      (url) =>
        `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
    ),
    // DOI pages
    ...dois.map(
      (doi) =>
        `  <url>
    <loc>${SITE_URL}/doi/${encodeDoi(doi)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

async function main() {
  console.log(`Fetching DOIs from ${API_BASE}/dois ...`);
  const all = await fetchAllDois();
  const dois = all.filter(isRealDoi);
  const skipped = all.length - dois.length;
  console.log(
    `Found ${all.length} DOIs${skipped ? `, skipping ${skipped} malformed` : ""}`,
  );

  const browseUrls = await readBrowseUrls();
  if (browseUrls.length)
    console.log(`Including ${browseUrls.length} browse pages`);

  const xml = buildSitemap(dois, browseUrls);
  await writeFile(OUTPUT_PATH, xml, "utf-8");
  console.log(
    `Sitemap written to ${OUTPUT_PATH} (${dois.length + browseUrls.length + 1} URLs)`,
  );
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err.message);
  console.error("Deploying without sitemap");
  process.exit(0); // Don't fail the build — sitemap is non-critical
});
