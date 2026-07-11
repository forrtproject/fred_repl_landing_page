import type { Author, ReplicationStats } from "../../@types";
import { badgeBgs,  TextColor } from "../../configs";
import { renderAuthors } from "../../utils/formatter";
import { ScrollIcon } from "../icons/scroll";

type ReplicationTimelineItemProps = {
    doi?: string;
    title?: string;
    authors?: Author[];
    journal?: string;
    year?: number;
    stats?: ReplicationStats;
    children?: any;
    status?: "failed" | "successful" | "partial" | "mixed" | "uninformative" | "blank";
    defaultOpen?: boolean;
};

export const ReplicationTimelineItem = (props: ReplicationTimelineItemProps) => {
    const defaultProps = { checked: props.defaultOpen };
    const replicationCount = props.stats?.n_replications_total ?? 0;
    return (
        <div class="collapse collapse-arrow bg-base-100 border border-base-200">
            <input type="checkbox" {...defaultProps} name="fort-accordion" />
            <div class="collapse-title px-4 py-3">
                <div class="flex flex-col gap-2">
                    <div class="flex items-start gap-3">
                        <div class={`mt-2 h-2 w-2 min-w-2 rounded-full ${badgeBgs[props.status || "blank"]}`}></div>
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <div class="w-10 rounded">
                                    <ScrollIcon color="#000" />
                                </div>
                                <div class="flex flex-col">
                                    <span class={`badge badge-sm ${badgeBgs[props.status || "blank"]} ${TextColor[props.status || "blank"]}`}>{props.doi}</span>
                                    <a class="link link-hover font-semibold" href={props.doi ? `https://doi.org/${props.doi}` : undefined} rel="noreferrer">
                                        {props.title}
                                    </a>
                                </div>
                            </div>
                            {renderAuthors(props.authors) ? (
                                <div class="text-xs text-neutral/70 mt-1">
                                    {renderAuthors(props.authors)}
                                </div>
                            ) : null}
                            <div class="text-xs text-neutral/70 flex flex-wrap gap-2 mt-1">
                                {props.journal ? <span>{props.journal}</span> : null}
                                {props.year ? <span>{props.year}</span> : null}
                                {props.doi ? <span>{props.doi}</span> : null}
                            </div>
                            <span class="text-xs">Replications: {replicationCount}</span>
                        </div>
                        <div class="text-xs text-neutral/70">
                            <span class="collapse-open">Collapse</span>
                            <span class="collapse-closed">Expand</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collapse-content text-sm">
                {props.children}
            </div>
        </div>
    );
};
