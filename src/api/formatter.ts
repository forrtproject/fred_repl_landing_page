import type { OriginalPaper, FormattedDOIResult, DOIResults } from "../@types";
import { normalizeOutcome } from "../utils/formatter";

export const formatReplicationResponse = (data?: OriginalPaper): FormattedDOIResult => {
    if (!data) {
        return {};
    }

    const replications = data.record?.replications || [];
    const outcomes = replications.reduce(
        (acc, curr) => {
            const outcome = normalizeOutcome(curr.outcome);
            if (outcome === "successful") {
                acc.success = (acc.success || 0) + 1;
            } else if (outcome === "failed") {
                acc.failed = (acc.failed || 0) + 1;
            } else if (outcome === "partial") {
                acc.partial = (acc.partial || 0) + 1;
            } else if (outcome === "mixed") {
                acc.mixed = (acc.mixed || 0) + 1;
            }
            return acc;
        },
        { success: 0, failed: 0, mixed: 0, partial: 0, total: replications.length }
    );

    return {
        doi: data.doi,
        title: data.title,
        authors: data.authors,
        journal: data.journal,
        year: data.year,
        apaRef: data.apa_ref,
        bibtexRef: data.bibtex_ref,
        stats: data.record?.stats,
        replications,
        originals: data.record?.originals || [],
        reproductions: data.record?.reproductions || [],
        outcomes,
        data,
    };
};

export const replicationResponseHasNoData = (res: DOIResults): boolean => {
    return Object.values(res.results || {}).every(paper => paper == null || paper.record == null);
}