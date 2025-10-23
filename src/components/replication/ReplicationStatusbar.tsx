import type { FormattedDOIResult } from "../../@types"
import { ErrorIcon } from "../icons/error"
import { SuccessIcon } from "../icons/success"
import { WarningIcon } from "../icons/warning"
type ReplicationStatusBarProps = {
    outcomes?: FormattedDOIResult["outcomes"];
}
export const ReplicationStatusBar = (props: ReplicationStatusBarProps) => {
    return (
        <div class="">
            <h3 class="text-lg font-semibold">Replication Studies</h3>
            <div class="flex gap-8 flex-wrap mt-4">
                <div role="alert" class="alert alert-success alert-soft flex flex-col flex-1">
                    <SuccessIcon />
                    <span>{props.outcomes?.success} Success</span>
                </div>
                <div role="alert" class="alert alert-warning alert-soft flex flex-col flex-1">
                    <WarningIcon />
                    <span>{props.outcomes?.mixed} Mixed</span>
                </div>
                <div role="alert" class="alert alert-error alert-soft flex flex-col flex-1">
                    <ErrorIcon />
                    <span>{props.outcomes?.failed} Failed</span>
                </div>
            </div>
        </div>
    )
}