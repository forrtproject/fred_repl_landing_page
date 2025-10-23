import type { DOIResult } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { Replication } from "./Replication";
import { ReplicationActionsPanel } from "./ReplicationActionsPanel";
import { ReplicationStatusbar } from "./ReplicationStatusbar";
import { ReplicationActionSuccessRate } from "./ReplicationSuccessRate";
import { ReplicationToolbar } from "./ReplicationTollbar";

type ReplicationSummaryProps = {
    data?: DOIResult;
};
export const ReplicationSummary = ({ data }: ReplicationSummaryProps) => {
    const rep = formatReplicationResponse(data);
    console.log("Formatted Replication Data:", rep); 
    return data?.candidate ? (
        <section class="p-4 rounded-md flex justify-center">
            <div class="card max-w-full bg-base-100">
                <ReplicationToolbar title={rep.original?.title_o} doi={rep.original?.doi_r} />
                <div class="card-body">
                    <ReplicationStatusbar outcomes={rep.outcomes} />
                    <ReplicationActionsPanel data={rep} />
                    <div class="divider"></div>
                    <ReplicationActionSuccessRate outcomes={rep.outcomes} />
                    <Replication authors={rep.original?.author_o} title={rep.original?.title_o} appaRef={rep.original?.apa_ref_o} />
                    <Replication authors={rep.original?.author_r} title={rep.original?.title_r} appaRef={rep.original?.apa_ref_r} />
                </div>
            </div>
        </section>
    ) : null;
};