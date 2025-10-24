import type { DOIResult } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { Replication } from "./Replication";
import { ReplicationActionsPanel } from "./ReplicationActionsPanel";
import { ReplicationStatusbar } from "./ReplicationStatusbar";
import { ReplicationActionSuccessRate } from "./ReplicationSuccessRate";
import { ReplicationTimelineItem } from "./ReplicationTimelineItem";
import { ReplicationToolbar } from "./ReplicationTollbar";
import { ResearchNotFound } from "./ResearchNotFount";

type ReplicationSummaryProps = {
    data?: DOIResult;
    defaultOpen?: boolean;
    q?: string;
};
export const ReplicationSummary = ({ data, defaultOpen, q }: ReplicationSummaryProps) => {
    const rep = formatReplicationResponse(data);
    return (
        <ReplicationTimelineItem doi={rep.original?.doi_o ?? q} status={rep.original?.outcome} defaultOpen={defaultOpen}>
            {
                data?.candidate ? (
                    <section class="p-4 rounded-md flex justify-center">
                        <div class="card max-w-full bg-base-100">
                            <ReplicationToolbar title={rep.original?.title_o} doi={rep.original?.doi_o} />
                            <div class="card-body">
                                <ReplicationStatusbar outcomes={rep.outcomes} />
                                <ReplicationActionsPanel data={rep} />
                                <div class="divider"></div>
                                <ReplicationActionSuccessRate outcomes={rep.outcomes} />
                                <div class="card border border-dashed rounded-sm border-gray-300 mt-4">
                                    <div class="card-body flex flex-col gap-4">
                                        {
                                            rep.replications?.map((r) => (
                                                <Replication
                                                    outcome={r.outcome || 'blank'}
                                                    authors={r.author_r || undefined}
                                                    title={r.title_r || ''}
                                                    appaRef={r.apa_ref_r || ''}
                                                    doi={r.doi_r}
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : <ResearchNotFound />
            }
        </ReplicationTimelineItem>
    );
};