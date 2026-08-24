// Regenerates public/fonts/*.woff2 and src/fonts.css from Google Fonts.
// Run manually when a family or weight range changes; the build does not call it.
import { writeFile, mkdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FONT_DIR = join(ROOT, "public", "fonts");

// Google serves modern woff2 subsets only to a browser-like UA.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FAMILIES = [
  {
    slug: "domine",
    family: "Domine",
    css: "https://fonts.googleapis.com/css2?family=Domine:wght@400..700&display=swap",
  },
  {
    slug: "sourcesans3",
    family: "Source Sans 3",
    css: "https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300..700;1,400..600&display=swap",
  },
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

async function main() {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf-8"));
  const base = new URL(pkg.homepage).pathname.replace(/\/$/, "");

  await mkdir(FONT_DIR, { recursive: true });
  const faces = [];

  for (const { slug, family, css } of FAMILIES) {
    const sheet = await fetchText(css);
    // Each @font-face block is preceded by a /* subset */ comment.
    const parts = sheet.split(/\/\*\s*([a-z0-9-]+)\s*\*\//);
    for (let i = 1; i < parts.length; i += 2) {
      const subset = parts[i];
      const block = parts[i + 1];
      const url = block.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
      if (!url) continue;

      const style = block.includes("font-style: italic") ? "italic" : "normal";
      const weight = block.match(/font-weight:\s*([\d ]+);/)[1].trim();
      const range = block.match(/unicode-range:\s*([^;]+);/)[1].trim();
      const file = `${slug}-${subset}-${style}.woff2`;

      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      await writeFile(
        join(FONT_DIR, file),
        Buffer.from(await res.arrayBuffer()),
      );

      faces.push(`@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("${base}/fonts/${file}") format("woff2");
  unicode-range: ${range};
}`);
    }
  }

  await writeFile(
    join(ROOT, "src", "fonts.css"),
    `/* Self-hosted from Google Fonts. Regenerate with scripts/fetch-fonts.mjs. */\n${faces.join("\n")}\n`,
    "utf-8",
  );
  console.log(`Wrote ${faces.length} faces to public/fonts and src/fonts.css`);
}

main().catch((err) => {
  console.error("Font fetch failed:", err.message);
  process.exit(1);
});
