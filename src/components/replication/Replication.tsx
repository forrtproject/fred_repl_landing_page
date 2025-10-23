import type { Author } from "../../@types";
import { MarkdownToHtml } from "../../utils/markdown";

type ReplicationProps = {
    title?: string | null;
    appaRef?: string | null;
    authors?: Author[] | null;
    outcome?: "failed" | "successful" | "partial" | "mixed" | "uninformative" | "blank";
    doi?: string | null;
};
export const Replication = (props: ReplicationProps) => {
    const badgeBgs = {
        successful: 'bg-success',
        failed: 'bg-error',
        partial: 'bg-warning',
        mixed: 'bg-warning',
        uninformative: 'bg-gray-400',
        blank: 'bg-gray-200',
    }

    const bgs = {
        successful: 'bg-green-50',
        failed: 'bg-red-50',
        partial: 'bg-orange-50',
        mixed: 'bg-yellow-50',
        uninformative: 'bg-gray-100',
        blank: 'bg-gray-50',
    }
    return props.authors ? (
        <div class={`flex p-4 rounded-md flex-col flex-1 ${bgs[props.outcome || 'mixed']}`}>
            <div class="inline-flex gap-2">
                <div class={`mt-2 ${badgeBgs[props.outcome || 'uninformative']} h-2 w-2 min-w-2 rounded-full`}></div>
                <div class="flex flex-col gap-4">
                    <h2 class="text-sm font-bold">{props.title}</h2>
                    <p class="text-sm"><MarkdownToHtml text={props.appaRef || ''} /></p>
                    { props.doi ? (
                        <a href={`https://doi.org/${props.doi}`} class="text-sm pl-0 link link-primary link-hover" target="__blank">
                            <span class="mr-2">DOI:</span><span>{props.doi}</span>
                        </a>
                    ) : null }
                </div>
            </div>
        </div>
    ) : null;
}