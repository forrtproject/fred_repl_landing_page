/**
 * Title and description templates for atlas detail pages.
 *
 * Plain JS with JSDoc types so the Node prerender script and the Solid client
 * can share one implementation: whatever the build writes into the static head
 * is exactly what the client rewrites on a soft navigation.
 */

export const SITE_URL = "https://forrt.org/flora-replication-atlas";

const TITLE_BUDGET = 65;
const DESCRIPTION_BUDGET = 158;
const MIN_TITLE_STUB = 25;
const MAX_TITLE_STUB = 45;

/* Artefacts that reach the SERP straight out of the source spreadsheet:
   filename-shaped titles, bracketed coder tokens, and the trailing record hash. */
const SOURCE_ARTEFACTS = [
  /\s*-\s*[A-Za-z0-9]{4}$/, // trailing record hash: "… - k97z"
  /\s*\[[A-Z][A-Z _-]{2,}\]\s*/g, // coder tokens: "[SCORE]"
  /^\s*\[[^\]]{1,12}\]\s*/, // leading record number: "[94] Data Replicada …"
];

/** @param {string} raw */
export function cleanTitle(raw) {
  let t = String(raw ?? "").trim();
  if (!t) return "";
  // Underscore-joined runs are filenames the source data kept, not prose.
  t = t.replace(/\S*_\S*/g, (token) => token.replace(/_+/g, " "));
  t = t.replace(SOURCE_ARTEFACTS[1], " ");
  t = t.replace(SOURCE_ARTEFACTS[2], "");
  t = t.replace(SOURCE_ARTEFACTS[0], "");
  return t.replace(/\s+/g, " ").replace(/[\s.,;:-]+$/, "").trim();
}

/** Truncate at a word boundary, appending an ellipsis only when text was cut. */
export function truncateWords(text, max) {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const stem = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s.,;:-]+$/,
    "",
  );
  return `${stem}…`;
}

/** @param {string} [outcome] */
export function outcomeBucket(outcome) {
  const o = String(outcome ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!o) return "unrecorded";
  if (o === "successful" || o === "success") return "successful";
  if (o === "failed" || o === "failure") return "failed";
  if (o === "mixed") return "mixed";
  if (o === "partial") return "partial";
  if (o.startsWith("computationally successful") && /,\s*robust$/.test(o))
    return "successful";
  if (o.startsWith("computational issues")) return "failed";
  return "mixed";
}

function attempts(paper) {
  const record = paper?.record || {};
  return [
    ...(Array.isArray(record.replications) ? record.replications : []),
    ...(Array.isArray(record.reproductions) ? record.reproductions : []),
  ];
}

/** Counts per bucket, highest first, for the pages' one distinguishing fact. */
export function outcomeCounts(paper) {
  const counts = new Map();
  for (const a of attempts(paper)) {
    const b = outcomeBucket(a?.outcome);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Drops coder tokens the source data carries in the author field, e.g. "[SCORE]". */
export function cleanAuthorName(name) {
  return String(name ?? "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;.]+|[\s,;]+$/g, "")
    .trim();
}

/** Short surname form: "Nuttin", "Ziano & Feldman", "Ziano et al." */
export function shortAuthors(authors) {
  const names = (Array.isArray(authors) ? authors : [])
    .map((a) => cleanAuthorName(a?.family || a?.given || ""))
    .filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

/**
 * The outcome half of the title: front-loaded, short enough that it survives
 * SERP truncation, and never omitted even when the study title has to give way.
 */
function titleOutcomePhrase(paper) {
  const counts = outcomeCounts(paper);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  if (total === 0) return "no replications recorded";

  const named = counts.filter(([b]) => b !== "unrecorded");
  const word = named.length === 1 ? named[0][0] : "mixed results";
  const label = named.length === 0 ? "outcome not recorded" : word;

  if (total === 1) return `replicated: ${label}`;
  return `${total} replications: ${label}`;
}

/** @returns {string} the `<title>` for a detail page. */
export function buildTitle(paper) {
  const phrase = titleOutcomePhrase(paper);
  const clean = cleanTitle(paper?.title) || paper?.doi || "Study";
  const budget = TITLE_BUDGET - phrase.length - 3;
  const stub = truncateWords(
    clean,
    Math.max(MIN_TITLE_STUB, Math.min(MAX_TITLE_STUB, budget)),
  );
  return `${stub} — ${phrase}`;
}

function descriptionOutcomeSentence(paper) {
  const counts = outcomeCounts(paper);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  if (total === 0)
    return "No replication or reproduction attempt is recorded in the FLoRA Replication Atlas.";

  const parts = counts.map(([bucket, n]) =>
    bucket === "unrecorded" ? `${n} without a recorded outcome` : `${n} ${bucket}`,
  );
  const word = total === 1 ? "attempt" : "attempts";
  const summary =
    counts.length === 1 && counts[0][0] !== "unrecorded"
      ? counts[0][0]
      : parts.join(", ");
  return `${total} replication ${word} on record: ${summary}.`;
}

/** @returns {string} the meta description for a detail page, ≤158 characters. */
export function buildDescription(paper) {
  const sentence = descriptionOutcomeSentence(paper);
  const byline = [
    shortAuthors(paper?.authors),
    paper?.year ? `(${paper.year}${paper?.journal ? `, ${truncateWords(paper.journal, 40)}` : ""})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tail = byline ? `${byline}. ${sentence}` : sentence;
  const clean = cleanTitle(paper?.title);
  const room = DESCRIPTION_BUDGET - tail.length - 3;
  if (clean && room >= MIN_TITLE_STUB)
    return `${truncateWords(clean, room)} — ${tail}`;
  return tail;
}

/** Site-relative path of the atlas page for a DOI, or null when it has none. */
export function atlasPath(doi) {
  if (!doi || !/^10\./.test(String(doi))) return null;
  return `${SITE_URL}/doi/${doi}/`;
}
