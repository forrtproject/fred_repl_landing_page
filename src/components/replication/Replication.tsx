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
            <ul class="list bg-base-100 rounded-box shadow-md max-h-76 overflow-y-auto mt-4">
                <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Authors</li>
                {props.authors?.map(author =>
                    <li class="list-row">
                        <div>
                            <div>{author.family ?? ''} {author.given ?? ''}</div>
                            <div class="text-xs uppercase font-semibold opacity-60">{author.sequence ?? ''}</div>
                        </div>
                    </li>
                )}
            </ul>
        </>
    ) : null;
}