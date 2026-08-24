import { AlertCircleIcon, ExternalLinkIcon, PlusIcon } from "../icons";
type NoDataStateProps = {
  doi: string;
};

export const NoDataState = (props: NoDataStateProps) => {
  return (
    <div class="detail-wrap">
      <div class="detail-card">
        <div class="no-data-state">
          <div class="no-data-icon">
            <AlertCircleIcon size={32} color="#853953" />
          </div>
          <h2>No replication data available</h2>
          <p>
            We don't have replication records for <strong>{props.doi}</strong>{" "}
            yet. This DOI may not be tracked in the FLoRA database.
          </p>
          <div class="no-data-actions">
            <a
              class="cb-btn primary"
              href={`https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform?usp=pp_url&entry.355822122=${encodeURIComponent(props.doi)}`}
              target="_blank"
              rel="noreferrer"
            >
              <PlusIcon size={12} />
              Suggest a replication entry
            </a>
            <a
              class="cb-btn ghost"
              href={`https://doi.org/${props.doi}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLinkIcon size={12} />
              View on DOI.org
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
