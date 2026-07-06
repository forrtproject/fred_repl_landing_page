// Anything that separates DOIs in a pasted citation list: commas, semicolons,
// and any whitespace (spaces, tabs, newlines).
const DOI_DELIMITER_RE = /[\s,;]+/;
const DOI_PREFIX_RE = /10\./g;
const DOI_URL_PREFIX_RE = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i;

export function stripDoiUrl(s: string): string {
  return s.replace(DOI_URL_PREFIX_RE, "");
}

export type DoiPasteResult =
  | { kind: "none" }
  | { kind: "single"; doi: string }
  | { kind: "multi"; dois: string[] }
  | { kind: "reject"; reason: string };

export const MULTI_DOI_WHITESPACE_REJECTION =
  "If you copy in multiple DOIs at once, they must not contain any spaces or other whitespace within them.";

export function parseDoiPaste(raw: string): DoiPasteResult {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "none" };

  // Split on any delimiter, then strip doi.org URL prefixes from each token.
  // URLs never contain spaces/commas/semicolons so each URL stays as one token.
  const tokens = trimmed
    .split(DOI_DELIMITER_RE)
    .map((s) => stripDoiUrl(s.trim()))
    .filter((s) => s !== "");

  if (tokens.length === 0) return { kind: "none" };

  const allValid = tokens.every((t) => t.startsWith("10."));

  if (allValid) {
    return tokens.length === 1
      ? { kind: "single", doi: tokens[0]! }
      : { kind: "multi", dois: tokens };
  }

  // Single unrecognised token — reject if it looks like a bad link, otherwise
  // let the default paste behavior run (could be a keyword, title, etc.).
  if (tokens.length === 1) {
    const [sole] = tokens;
    if (/^https?:\/\//i.test(sole!)) {
      return {
        kind: "reject",
        reason:
          "The link you pasted is not a DOI link. Please check what you have pasted — only DOIs (e.g. 10.1000/xyz) or doi.org links (e.g. https://doi.org/10.1000/xyz) are supported.",
      };
    }
    return { kind: "none" };
  }

  // Multiple tokens, some invalid — check if any invalid ones are bad links.
  const hasInvalidLink = tokens.some(
    (t) => !t.startsWith("10.") && /^https?:\/\//i.test(t),
  );
  if (hasInvalidLink) {
    return {
      kind: "reject",
      reason:
        "Some links you pasted are not DOI links. Please check what you have pasted — only doi.org links (e.g. https://doi.org/10.1000/xyz) are supported.",
    };
  }

  // No bad links but some tokens don't look like DOIs. Check if the whole
  // input is actually one DOI whose whitespace got fragmented (e.g. a PDF
  // copy with a line break mid-DOI): collapse and try again.
  const prefixCount = (raw.match(DOI_PREFIX_RE) || []).length;
  if (prefixCount <= 1) {
    const collapsed = stripDoiUrl(raw.replace(/[\s,;]+/g, "").trim());
    if (collapsed.startsWith("10.")) return { kind: "single", doi: collapsed };
  }

  return { kind: "reject", reason: MULTI_DOI_WHITESPACE_REJECTION };
}
