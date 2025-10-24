import type { Author } from "../../@types";
import { badgeBgs, bgs } from "../../configs";
import { MarkdownToHtml } from "../../utils/markdown";

type ReplicationProps = {
    title?: string | null;
    appaRef?: string | null;
    authors?: Author[] | null;
    outcome?: "failed" | "successful" | "partial" | "mixed" | "uninformative" | "blank";
    doi?: string | null;
};
export const Replication = (props: ReplicationProps) => {
    return props.authors ? (
        <div class={`flex p-4 rounded-md flex-col flex-1 ${bgs[props.outcome || 'mixed']}`}>
            <div class="inline-flex gap-2">
                <div class={`mt-2 ${badgeBgs[props.outcome || 'uninformative']} h-2 w-2 min-w-2 rounded-full`}></div>
                <div class="flex flex-col gap-4">
                    <h2 class="text-sm font-bold">{props.title}</h2>
                    <p class="text-sm academic-text reference"><MarkdownToHtml text={props.appaRef || ''} /></p>
                </div>
            </div>
        </div>
    ) : null;
}