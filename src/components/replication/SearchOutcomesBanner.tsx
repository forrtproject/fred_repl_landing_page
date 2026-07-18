import { createMemo, For } from "solid-js";

type OutcomeCounts = {
    success: number;
    failed: number;
    mixed: number;
    partial: number;
    total: number;
    categorizedTotal: number;
};

type SearchOutcomesBannerProps = {
    outcomes: OutcomeCounts;
    paperCount: number;
};

type Segment = {
    key: keyof Omit<OutcomeCounts, "total" | "categorizedTotal">;
    label: string;
    color: string;
};

const SEGMENTS: Segment[] = [
    { key: "success", label: "Successful", color: "var(--success-light)" },
    { key: "failed",  label: "Failed",     color: "var(--error)"         },
    { key: "mixed",   label: "Mixed",      color: "var(--warning)"       },
    { key: "partial", label: "Partial",    color: "var(--primary)"       },
];

type DisplaySegment = { label: string; color: string; count: number; pct: number };

export const SearchOutcomesBanner = (props: SearchOutcomesBannerProps) => {
    // Widths are relative to `total` (the header count) so the bar always sums to
    // it; the uncategorized remainder is shown as a muted grey segment.
    const pct = (count: number) =>
        props.outcomes.total > 0 ? (count / props.outcomes.total) * 100 : 0;

    const segments = createMemo<DisplaySegment[]>(() => {
        const shown: DisplaySegment[] = SEGMENTS
            .filter(s => props.outcomes[s.key] > 0)
            .map(s => ({
                label: s.label,
                color: s.color,
                count: props.outcomes[s.key],
                pct: pct(props.outcomes[s.key]),
            }));
        const uncategorized = props.outcomes.total - props.outcomes.categorizedTotal;
        if (uncategorized > 0) {
            shown.push({
                label: "Uncategorized",
                color: "var(--text-muted)",
                count: uncategorized,
                pct: pct(uncategorized),
            });
        }
        return shown;
    });

    return (
        <div style={{
            padding: "14px 20px 12px",
            "border-bottom": "1px solid var(--border-light)",
            "font-family": "var(--font-body)",
        }}>
            <p style={{
                "font-size": "11px",
                "font-weight": "600",
                color: "var(--text-muted)",
                "text-transform": "uppercase",
                "letter-spacing": "0.06em",
                "margin-bottom": "8px",
            }}>
                {props.outcomes.total} Replication{props.outcomes.total !== 1 ? "s" : ""} · {props.paperCount} Paper{props.paperCount !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", width: "100%", height: "28px", "border-radius": "var(--radius)", overflow: "hidden", gap: "2px" }}>
                <For each={segments()}>
                    {(s) => (
                        <div
                            style={{ background: s.color, width: `${s.pct}%`, display: "flex", "align-items": "center", "justify-content": "center" }}
                            title={`${s.label}: ${s.count}`}
                        >
                            <span style={{ color: "white", "font-size": "11px", "font-weight": "700", "text-shadow": "0 1px 2px rgba(0,0,0,0.25)", "user-select": "none" }}>
                                {s.count}
                            </span>
                        </div>
                    )}
                </For>
            </div>
            <div style={{ display: "flex", width: "100%", gap: "2px", "margin-top": "4px" }}>
                <For each={segments()}>
                    {(s) => (
                        <div style={{ width: `${s.pct}%`, "text-align": "center", overflow: "hidden" }}>
                            <span style={{ "font-size": "10px", "font-weight": "600", color: s.color, "white-space": "nowrap" }}>
                                {s.label}
                            </span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};
