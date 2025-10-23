import type { Author, DOIResult, FormattedDOIResult } from "../@types";

export const formatReplicationResponse = (data?: DOIResult): FormattedDOIResult => {
 const doi = data?.candidate?.meta?.original_doi;
 const original = data?.candidate?.meta?.replications.find(r => r.doi_o === doi);
 const replications = data?.candidate?.meta?.replications;
 const outcomes = data?.candidate?.meta?.replications?.reduce((acc, curr) => {
    if (curr.outcome === "successful") {
        acc.success = (acc.success || 0) + 1;
    } else if (curr.outcome === "failed") {
        acc.failed = (acc.failed || 0) + 1;
    } else if (curr.outcome === "partial" || curr.outcome === "mixed") {
        acc.mixed = (acc.mixed || 0) + 1;
    }
    return acc;
}, { success: 0, failed: 0, mixed: 0, total: replications?.length || 0 });

const uniqueAuthors = new Map<string, Author>();
const rep = [original, ...(replications || [])];

rep.forEach(r => {
    r?.author_o.forEach(author => {
        if (author.ORCID) {
            uniqueAuthors.set(author.ORCID, author);
        } else if (author.family || author.given) {
            uniqueAuthors.set(`${author.family || ""}, ${author.given || ""}`, author);
        }
    });
    r?.author_r?.forEach(author => {
        if (author.ORCID) {
            uniqueAuthors.set(author.ORCID, author);
        } else if (author.family || author.given) {
            uniqueAuthors.set(`${author.family || ""}, ${author.given || ""}`, author);
        }
    });
});

 return { doi, original, replications, data, outcomes, authors: Array.from(uniqueAuthors.values()) };
}