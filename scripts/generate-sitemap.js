import { writeFile, readFile } from "fs/promises";

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
      "Unexpected API response format: expected an array of DOIs",
    );
  }
  return dois;
}

function encodeDoi(doi) {
  // Percent-encode characters that are invalid in XML (and in URLs)
  return doi
    .replace(/&/g, "%26")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
}

function buildSitemap(dois) {
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    // Homepage
    `  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
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
  const dois = await fetchAllDois();
  console.log(`Found ${dois.length} DOIs`);

  const xml = buildSitemap(dois);
  await writeFile(OUTPUT_PATH, xml, "utf-8");
  console.log(`Sitemap written to ${OUTPUT_PATH} (${dois.length + 1} URLs)`);
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err.message);
  console.error("Deploying without sitemap");
  process.exit(0); // Don't fail the build; sitemap is non-critical
});
