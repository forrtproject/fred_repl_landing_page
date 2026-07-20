type NoDataStateProps = {
  doi: string;
};

export const NoDataState = (props: NoDataStateProps) => {
  return (
    <div class="detail-wrap">
      <div class="detail-card">
        <div class="no-data-state">
          <div class="no-data-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#853953"
              stroke-width="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
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
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Suggest a replication entry
            </a>
            <a
              class="cb-btn ghost"
              href={`https://doi.org/${props.doi}`}
              target="_blank"
              rel="noreferrer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View on DOI.org
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
