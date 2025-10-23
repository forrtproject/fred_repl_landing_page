import type { DOIResult, FormattedDOIResult } from "../@types";

export const formatReplicationResponse = (data?: DOIResult): FormattedDOIResult => {
 const doi = data?.candidate?.meta?.original_doi;
 const original = data?.candidate?.meta?.replications.find(r => r.doi_o === doi);
 const replications = data?.candidate?.meta?.replications.filter(r => r.doi_o !== doi);
 const outcomes = data?.candidate?.meta?.replications?.reduce((acc, curr) => {
    if (curr.outcome === "successful") {
        acc.success = (acc.success || 0) + 1;
    } else if (curr.outcome === "failed") {
        acc.failed = (acc.failed || 0) + 1;
    } else if (curr.outcome === "partial" || curr.outcome === "mixed") {
        acc.mixed = (acc.mixed || 0) + 1;
    }
    return acc;
}, { success: 0, failed: 0, mixed: 0 });

 return { doi, original, replications, data, outcomes };
}