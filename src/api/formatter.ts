import type { DOIResult, FormattedDOIResult } from "../@types";

export const formatReplicationResponse = (data?: DOIResult): FormattedDOIResult => {
 const doi = data?.candidate?.meta?.original_doi;
 const original = data?.candidate?.meta?.replications.find(r => r.doi_o === doi);
 const replications = data?.candidate?.meta?.replications.filter(r => r.doi_o !== doi);
 return { doi, original, replications, data };
}