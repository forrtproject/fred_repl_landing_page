import type {FormattedDOIResult } from "../../@types";
import { CopyIcon } from "../icons/copy";
import { DNAIcon } from "../icons/dna";
import { DownloadIcon } from "../icons/download";
import { FlagIcon } from "../icons/flag";
import { ShareIcon } from "../icons/share";
import { TagIcon } from "../icons/tag";
import { UserGroupIcon } from "../icons/user-group";
type ReplicationActionsPanelProps = {
    data: FormattedDOIResult;
};
export const ReplicationActionsPanel = (props: ReplicationActionsPanelProps) => {
    return (
        <div class="mt-8 border border-gray-200">
            <div class="navbar min-h-0 flex-wrap">
                <div class="navbar-start p-0 w-auto flex-1 flex-wrap">
                    <button class="btn btn-sm btn-ghost mr-2">
                        <UserGroupIcon className="w-5 h-5" />
                        <span>{props.data.authors?.length || 0}</span>
                        <span>{`Author${(props.data.authors?.length || 0) > 1 ? 's' : ''}`}</span>
                    </button>
                    <button class="btn btn-sm btn-ghost mr-2">
                        <DNAIcon className="w-5 h-5" />
                        <span>{props.data.replications?.length || 0}</span>
                        <span>{`Replication${(props.data.replications?.length || 0) > 1 ? 's' : ''}`}</span>
                    </button>
                </div>
                <div class="navbar-end p-0 gap-2 w-auto flex-1 flex-wrap">
                    <button class="btn btn-sm"><CopyIcon className="w-5 h-5" /></button>
                    <button class="btn btn-sm"><TagIcon className="w-5 h-5" /></button>
                    <button class="btn btn-sm"><ShareIcon className="w-5 h-5" /></button>
                    <button class="btn btn-sm"><DownloadIcon className="w-5 h-5" /> Download PDF</button>
                    <button class="btn btn-sm"><FlagIcon className="w-5 h-5" /> Flag Errors</button>
                    <button class="btn btn-sm"><FlagIcon className="w-5 h-5" /> Suggest Additions</button>
                </div>
            </div>
        </div>
    )
};