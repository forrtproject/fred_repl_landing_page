import type { Author } from "../../@types";
import { MarkdownToHtml } from "../../utils/markdown";

type ReplicationProps = {
    title?: string | null;
    appaRef?: string | null;
    authors?: Author[] | null;
};
export const Replication = (props: ReplicationProps) => {
    return props.authors ? (
        <>
            <h2 class="card-title">{props.title}</h2>
            <p><MarkdownToHtml text={props.appaRef || ''} /></p>
        </>
    ) : null;
}