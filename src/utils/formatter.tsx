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

/** "Authors (Year)" — omitting whichever part is missing; empty string when both are. */
export const authorYearLine = (authors?: Author[], year?: string | number) => {
    const parts = [formatAuthors(authors), year ? `(${year})` : ""];
    return parts.filter(Boolean).join(" ");
};
