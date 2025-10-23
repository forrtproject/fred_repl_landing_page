import type { FormattedDOIResult } from "../../@types";

type SuccessRateProps = {
    outcomes?: FormattedDOIResult["outcomes"];
}

export const ReplicationActionSuccessRate = (props: SuccessRateProps) => {
    const successRate = props.outcomes && props.outcomes.total ? (props.outcomes.success || 0) / props.outcomes.total * 100 : 0;
    return (
        <div class="flex flex-col gap-2">
            <span>Replication Success Rate: {successRate.toFixed(2)}%</span>
            <progress class="progress progress-success w-full" value={successRate || 0} max={100}></progress>
        </div>
    )
}