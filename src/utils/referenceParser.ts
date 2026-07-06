import { stripDoiUrl } from "./doi";

// For general reference text (paste / RIS / BIB): stop at < to avoid XML tags
// from embedded metadata. A slash is only treated as part of the suffix when
// the next segment contains digits/underscores/brackets — pure [A-Za-z-]
// segments are journal routing words.
const TEXT_SUFFIX = `[^\\s,/<>\\]'"#?&\\\\]`;
const TEXT_EXTRA_SLASH = `(?:\\/(?![a-zA-Z-]+(?:[/\\s,#?&<>{}\\[\\]]|$))${TEXT_SUFFIX}+)*`;
const DOI_RE = new RegExp(`(10\\.\\d{4,}(?:\\.\\d+)*\\/${TEXT_SUFFIX}+${TEXT_EXTRA_SLASH})`, "g");

// For PDF / raw-text extraction: also stop at ( ) to avoid PDF object syntax
// like (doi)/Key(value), and stop at < to avoid XMP metadata tags.
const PDF_SUFFIX = `[^\\s,/<>\\]'"#?&\\\\()]`;
const PDF_EXTRA_SLASH = `(?:\\/(?![a-zA-Z-]+(?:[/\\s,#?&<>{}\\[\\]]|$))${PDF_SUFFIX}+)*`;
const PDF_DOI_RE = new RegExp(`(10\\.\\d{4,}(?:\\.\\d+)*\\/${PDF_SUFFIX}+${PDF_EXTRA_SLASH})`, "g");

function cleanDoi(doi: string): string {
  return doi
    .replace(/\)\/[A-Za-z].*$/, "")  // strip residual PDF object syntax: )/Key
    .replace(/<.*$/, "")              // strip residual XML/XMP tags: </dc:identifier
    .replace(/[.,;)\]>]+$/, "");      // strip trailing punctuation
}

export type ParsedReference = {
  raw: string;
  doi: string | null;
  queryText: string;
};

function extractDoiFromText(text: string): string | null {
  const re = new RegExp(DOI_RE.source, "g");
  const match = re.exec(text);
  return match ? cleanDoi(match[1]) : null;
}

function buildQueryText(ref: string): string {
  // Strip leading numbering: [1], 1., (1)
  let s = ref.replace(/^\s*[\[(]?\d+[\].)]\s*/, "");

  // Try APA-style: "Author (Year). Title. Journal..."
  const apaTitle = s.match(/\(\d{4}[a-z]?\)\.\s+([^.]{10,})\./);
  if (apaTitle) return apaTitle[1].trim();

  // Try to grab content after apparent author section (first comma or period block)
  // Heuristic: take the longest contiguous non-author fragment
  s = s.replace(/^[A-Z][^.]+\.\s+/, ""); // strip leading "Author, A.B." chunk
  return s.substring(0, 250).trim();
}

// Returns true if a line looks like the start of a new reference entry.
function looksLikeRefStart(line: string): boolean {
  // Numbered: [1], 1., 1)
  if (/^[\[(]?\d+[\].)]\s+\S/.test(line)) return true;
  // APA-style: starts with Author, A. or Author, A., & ...
  if (/^[A-Z][a-záéíóú''-]+,\s+[A-Z]/.test(line)) return true;
  // Vancouver-style: starts with Author AB or LASTNAME A
  if (/^[A-Z][a-z]+ [A-Z]{1,3}[,\s]/.test(line)) return true;
  // Starts with a year: 2020. Title...
  if (/^\d{4}\.\s+[A-Z]/.test(line)) return true;
  return false;
}

export function splitIntoReferences(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const refs: string[] = [];
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (current.trim()) {
        refs.push(current.trim());
        current = "";
      }
      continue;
    }

    // Numbered reference or detected ref-start while accumulating something different
    const startsNew =
      /^[\[(]?\d+[\].)]\s+\S/.test(trimmed) ||
      (current.trim() && looksLikeRefStart(trimmed));

    if (startsNew && current.trim()) {
      refs.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current.trim()) refs.push(current.trim());

  const filtered = refs.filter((r) => r.length > 15);

  // Last-resort: if everything collapsed into one entry but there are multiple
  // substantial lines, treat each non-trivial line as its own reference.
  if (filtered.length <= 1) {
    const perLine = lines.map((l) => l.trim()).filter((l) => l.length > 20);
    if (perLine.length > 1) return perLine;
  }

  return filtered;
}

export function parseReferences(text: string): ParsedReference[] {
  // Fast path: text is just a list of raw DOIs (one per line / comma-separated)
  const doiOnlyLines = text
    .split(/[\r\n,;]+/)
    .map((s) => stripDoiUrl(s.trim()))
    .filter((s) => /^10\.\d{4,}\//.test(s));

  const rawRefs = splitIntoReferences(text);

  // If the whole text is raw DOIs and splitting gave nothing useful, use doi-only mode
  if (doiOnlyLines.length > 0 && rawRefs.length === 0) {
    return doiOnlyLines.map((doi) => ({
      raw: doi,
      doi: cleanDoi(doi),
      queryText: doi,
    }));
  }

  // If no reference-style entries, fall back to extracting every DOI in the text
  if (rawRefs.length === 0) {
    const all: string[] = [];
    const re = new RegExp(DOI_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) all.push(cleanDoi(m[1]));
    return [...new Set(all)].map((doi) => ({
      raw: doi,
      doi,
      queryText: doi,
    }));
  }

  return rawRefs.map((raw) => ({
    raw,
    doi: extractDoiFromText(raw),
    queryText: buildQueryText(raw),
  }));
}

export function parseRisFile(text: string): ParsedReference[] {
  const records: ParsedReference[] = [];
  let doi: string | null = null;
  let title = "";
  let author = "";
  let year = "";
  let inRecord = false;

  const flush = () => {
    if (!inRecord) return;
    const raw = [title, author, year].filter(Boolean).join("; ") || doi || "";
    if (raw) {
      records.push({
        raw,
        doi: doi ? cleanDoi(doi) : null,
        queryText: [title, author].filter(Boolean).join(" "),
      });
    }
    doi = null; title = ""; author = ""; year = ""; inRecord = false;
  };

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9])\s{1,2}-\s+(.*)$/);
    if (!m) continue;
    const [, tag, val] = m;
    if (tag === "TY") { inRecord = true; }
    else if (tag === "ER") { flush(); }
    else if (tag === "DO" && !doi) { doi = val.trim(); }
    else if ((tag === "TI" || tag === "T1") && !title) { title = val.trim(); }
    else if ((tag === "AU" || tag === "A1") && !author) { author = val.trim(); }
    else if ((tag === "PY" || tag === "Y1") && !year) { year = val.trim().slice(0, 4); }
  }
  flush();

  return records.filter((r) => r.doi || r.queryText);
}

function extractBibField(block: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*`, "i");
  const match = re.exec(block);
  if (!match) return "";
  let s = block.slice(match.index + match[0].length).trimStart();
  if (s[0] === "{") {
    let depth = 0;
    let k = 0;
    for (; k < s.length; k++) {
      if (s[k] === "{") depth++;
      else if (s[k] === "}") { depth--; if (depth === 0) break; }
    }
    return s.slice(1, k).replace(/[{}]/g, "").trim();
  } else if (s[0] === '"') {
    const end = s.indexOf('"', 1);
    return end >= 0 ? s.slice(1, end).trim() : "";
  } else {
    const end = s.search(/[,\n]/);
    return end >= 0 ? s.slice(0, end).trim() : s.trim();
  }
}

export function extractDoisDirect(text: string): ParsedReference[] {
  const re = new RegExp(PDF_DOI_RE.source, "g");
  const seen = new Set<string>();
  const refs: ParsedReference[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const doi = cleanDoi(m[1]);
    if (doi.length > 7 && !seen.has(doi)) {
      seen.add(doi);
      refs.push({ raw: doi, doi, queryText: doi });
    }
  }
  return refs;
}

export function parseBibFile(text: string): ParsedReference[] {
  const entries: ParsedReference[] = [];
  let i = 0;

  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) break;
    const brace = text.indexOf("{", at);
    if (brace === -1) break;

    let depth = 0;
    let j = brace;
    while (j < text.length) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") { depth--; if (depth === 0) break; }
      j++;
    }

    const block = text.slice(at, j + 1);
    const doi = extractBibField(block, "doi");
    const title = extractBibField(block, "title");
    const author = extractBibField(block, "author");
    const year = extractBibField(block, "year");
    const raw = [title, author, year].filter(Boolean).join("; ") || doi || block.slice(0, 80);

    if (doi || title) {
      entries.push({
        raw,
        doi: doi ? cleanDoi(doi) : null,
        queryText: [title, author].filter(Boolean).join(" "),
      });
    }

    i = j + 1;
  }

  return entries.filter((e) => e.doi || e.queryText);
}
