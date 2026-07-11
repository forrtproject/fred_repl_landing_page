import type { OriginalPaper, FormattedDOIResult } from "../../@types";
import { formatReplicationResponse } from "../../api/formatter";
import { ReplicationActionsPanel } from "./ReplicationActionsPanel";
import { ReplicationTimelineItem } from "./ReplicationTimelineItem";
import { ResearchNotFound } from "./ResearchNotFount";
import { MarkdownToHtml } from "../../utils/markdown";
import { ReplicationSection } from "./ReplicationSection";
import { EyeOpenIcon } from "../icons/eye-open";

type ReplicationSummaryProps = {
    data?: OriginalPaper;
    defaultOpen?: boolean;
    q?: string;
};

type OutcomeStatus = "failed" | "mixed" | "partial" | "successful" | "uninformative" | "blank";

const resolveOutcomeStatus = (outcomes?: { success?: number; failed?: number; mixed?: number; partial?: number; total?: number }): OutcomeStatus => {
    if (!outcomes?.total) {
        return "blank";
    }

    const values = [
        { outcome: "successful" as OutcomeStatus, count: outcomes.success || 0 },
        { outcome: "failed" as OutcomeStatus, count: outcomes.failed || 0 },
        { outcome: "mixed" as OutcomeStatus, count: outcomes.mixed || 0 },
        { outcome: "partial" as OutcomeStatus, count: outcomes.partial || 0 },
    ].filter(item => item.count > 0);

    if (values.length === 1 && values[0].count === outcomes.total) {
        return values[0].outcome;
    }

    return "mixed";
};

export const ReplicationSummary = ({ data, defaultOpen, q }: ReplicationSummaryProps) => {
    const rep = formatReplicationResponse(data);
    const status = resolveOutcomeStatus(rep.outcomes);
    const stats = rep.stats;
    return (
        <ReplicationTimelineItem
            doi={rep.doi ?? q}
            title={rep.title}
            authors={rep.authors}
            journal={rep.journal}
            year={rep.year}
            stats={rep.stats}
            status={status}
            defaultOpen={defaultOpen}
        >
            {
                data?.record ? (
                    <section class="p-4 rounded-md flex justify-center">
                        <div class="card max-w-full bg-base-100">
                            <div class="card-body">
                                <SummaryHeader rep={rep} stats={stats} />
                                <ReplicationActionsPanel data={rep} />
                                <div class="divider"></div>
                                {(rep.replications?.length || rep.reproductions?.length) ? (
                                    <>
                                        <ReplicationSection
                                            title={`Replication${rep.replications && rep.replications.length > 1 ? 's' : ''}`}
                                            emptyMessage="No replications available yet."
                                            items={rep.replications || []}
                                        />
                                        <ReplicationSection
                                            title={`Reproduction${rep.reproductions && rep.reproductions.length > 1 ? 's' : ''}`}
                                            emptyMessage="No reproductions available yet."
                                            items={rep.reproductions || []}
                                        />
                                    </>
                                ) : null}
                                <ReplicationSection
                                    title={`Target Stud${rep.originals && rep.originals.length > 1 ? 'ies' : 'y'}`}
                                    items={rep.originals || []}
                                />
                            </div>
                        </div>
                    </section>
                ) : <ResearchNotFound doi={rep.doi || q} />
            }
        </ReplicationTimelineItem>
    );
};

const SummaryHeader = (props: { rep: FormattedDOIResult; stats?: FormattedDOIResult["stats"] }) => (
    <div class="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div class="rounded-md border border-base-200 p-4">
            <div class="flex items-start justify-between">
                <h3 class="text-sm font-semibold text-neutral/80">Replication Study</h3>
                {
                    props.rep.doi ? (
                        <div class="flex justify-end no-print">
                            <a class="btn btn-sm" href={`https://doi.org/${props.rep.doi}`} target="__blank">
                                <span class="mr-2"><EyeOpenIcon /></span>
                                <span>View Research</span>
                            </a>
                        </div>
                    ) : null
                }
            </div>
            {props.rep.title ? <div class="mt-2 text-lg font-semibold">{props.rep.title}</div> : null}
            <div class="mt-2 text-sm text-neutral/70 flex flex-wrap gap-2">
                {props.rep.journal ? <span>{props.rep.journal}</span> : null}
                {props.rep.year ? <span>{props.rep.year}</span> : null}
                {props.rep.doi ? (
                    <a class="link" href={`https://doi.org/${props.rep.doi}`} target="_blank" rel="noreferrer">{props.rep.doi}</a>
                ) : null}
            </div>
            {props.rep.apaRef ? (
                <div class="mt-4">
                    <div class="text-xs font-semibold text-neutral/70">APA reference</div>
                    <p class="mt-2 text-sm academic-text reference">
                        <MarkdownToHtml text={props.rep.apaRef} />
                    </p>
                </div>
            ) : null}
        </div>
    </div>
);
