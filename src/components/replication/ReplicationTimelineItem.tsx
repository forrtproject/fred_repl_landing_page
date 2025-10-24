import { bgs } from "../../configs";

type ReplicationTimelineItemProps = {
    doi?: string;
    children?: any;
    status?: "failed" | "successful" | "partial" | "mixed" | "uninformative" | "blank";
    defaultOpen?: boolean;
};
export const ReplicationTimelineItem = (props: ReplicationTimelineItemProps) => {
    const defaultProps = { checked: props.defaultOpen };
    return (
        <div class="collapse collapse-plus bg-base-100 border border-base-300">
            <input type="radio" name="my-accordion-1" {...defaultProps} />
            <div class={`collapse-title font-semibold ${bgs[props.status || "blank"]}`}>{props.doi}</div>
            <div class="collapse-content text-sm">
                {props.children}
            </div>
        </div>
    );
};
