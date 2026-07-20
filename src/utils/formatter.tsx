import type { Author } from "../@types";

export const formatAuthors = (authors?: Author[]) => {
    if (!Array.isArray(authors) || authors.length === 0) return "";
    const names = authors
        .map(author => {
            const family = author.family || "";
            const given = author.given ? `, ${author.given}` : "";
            return family ? `${family}${given}` : author.given || "";
        })
        .filter(name => name.length > 0);
    if (!names.length) return "";
    if (names.length <= 3) return names.join("; ");
    return `${names.slice(0, 3).join("; ")}; et al.`;
};

export const renderAuthors = (authors?: Author[]) => formatAuthors(authors);

/**
 * Canonicalize an outcome string for matching/bucketing: trim, lowercase,
 * collapse internal whitespace, and normalize spacing around commas so variants
 * like " Successful ", "FAILED", or "computationally successful,robust" compare
 * equal to their canonical form. Used by both the badge parser and the outcome
 * counts so cards and aggregate bars never disagree.
 */
export const normalizeOutcome = (outcome?: string): string =>
    (outcome ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*,\s*/g, ", ");

/** "Authors (Year)" — omitting whichever part is missing; empty string when both are. */
export const authorYearLine = (authors?: Author[], year?: string | number) => {
    const parts = [formatAuthors(authors), year ? `(${year})` : ""];
    return parts.filter(Boolean).join(" ");
};
