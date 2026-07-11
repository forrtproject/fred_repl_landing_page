import { badgeBgs, bgs } from "../../configs";
import { MarkdownToHtml } from "../../utils/markdown";
import type { ReplicationProps } from "./types";

const MetadataRow = (props: ReplicationProps) => (
    <div class="text-xs text-neutral/70 flex flex-wrap gap-2">
        {props.journal ? <span>{props.journal}</span> : null}
        {props.year ? <span>{props.year}</span> : null}
        {props.volume ? <span>Vol {props.volume}</span> : null}
        {props.issue ? <span>Issue {props.issue}</span> : null}
        {props.pages ? <span>Pages {props.pages}</span> : null}
        {props.doi ? (
            <a class="link" href={`https://doi.org/${props.doi}`} target="_blank" rel="noreferrer">{props.doi}</a>
        ) : null}
    </div>
);

export const Replication = (props: ReplicationProps) => {
    return props.authors ? (
        <div class={`flex p-4 rounded-md flex-col flex-1 ${bgs[props.outcome || 'mixed']}`}>
            <div class="flex flex-col gap-3">
                <div class="flex items-start gap-3">
                    <div class={`mt-2 ${badgeBgs[props.outcome || 'uninformative']} h-2 w-2 min-w-2 rounded-full`}></div>
                    <div class="flex flex-col gap-2 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            {props.title ? <h2 class="text-sm font-bold">{props.title}</h2> : null}
                        </div>
                        <MetadataRow {...props} />
                        <p class="text-sm academic-text reference"><MarkdownToHtml text={props.appaRef || ''} /></p>
                    </div>
                </div>
            </div>
        </div>
    ) : null;
}