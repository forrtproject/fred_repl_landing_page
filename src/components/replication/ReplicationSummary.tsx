import type { DOIResult } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { Replication } from "./Replication";
import { ReplicationToolbar } from "./ReplicationTollbar";

type ReplicationSummaryProps = {
    data?: DOIResult;
};
export const ReplicationSummary = ({ data }: ReplicationSummaryProps) => {
    const rep = formatReplicationResponse(data);
    return data?.candidate ? (
        <section class="p-4 rounded-md flex justify-center">
            <div class="card  bg-base-100">
                <ReplicationToolbar title={rep.original?.title_o} />
                <div class="card-body">
                    <Replication authors={rep.original?.author_o} title={rep.original?.title_o} appaRef={rep.original?.apa_ref_o} />
                    <Replication authors={rep.original?.author_r} title={rep.original?.title_r} appaRef={rep.original?.apa_ref_r} />
                </div>
            </div>
        </section>
    ) : null;
};