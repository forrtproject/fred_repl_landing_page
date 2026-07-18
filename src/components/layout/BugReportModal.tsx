import { createSignal, onCleanup, onMount } from "solid-js";
import { createFocusTrap } from "../../utils/modalA11y";

type Props = {
  errorTitle: string;
  errorMessage: string;
  onClose: () => void;
};

const GITHUB_REPO = "forrtproject/flora-replication-atlas";

export const BugReportModal = (props: Props) => {
  let modalRef: HTMLDivElement | undefined;
  const [description, setDescription] = createSignal(props.errorMessage);
  const [steps, setSteps] = createSignal("");

  // Capture phase so this topmost modal consumes Escape before the underlying
  // modals' bubble-phase listeners (document/window) can also close on it.
  const handleKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    props.onClose();
  };
  onMount(() => document.addEventListener("keydown", handleKey, true));
  onCleanup(() => document.removeEventListener("keydown", handleKey, true));

  // Mounted only while open, so the trap is always active for this instance.
  createFocusTrap(() => modalRef, () => true);

  const handleSubmit = () => {
    const title = `Bug: ${props.errorTitle}`;
    const body = [
      `**What happened:**`,
      description() || "(no description provided)",
      "",
      `**Steps to reproduce:**`,
      steps() || "(not provided)",
      "",
      `**Expected behavior:**`,
      "No error should occur.",
      "",
      `---`,
      `*Reported via FLORA Replication Atlas*`,
    ].join("\n");

    const url =
      `https://github.com/${GITHUB_REPO}/issues/new` +
      `?title=${encodeURIComponent(title)}` +
      `&body=${encodeURIComponent(body)}` +
      `&labels=bug`;
    window.open(url, "_blank", "noopener,noreferrer");
    props.onClose();
  };

  return (
    <div class="brm-overlay" onClick={props.onClose}>
      <div ref={modalRef} class="brm-box" onClick={(e) => e.stopPropagation()}>
        <div class="brm-header">
          <h2 class="brm-title">Report an Error</h2>
          <button class="brm-close" onClick={props.onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="brm-body">
          <label class="brm-label">
            What happened?
          </label>
          <textarea
            class="brm-textarea"
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            rows={4}
            placeholder="Describe the error..."
          />

          <label class="brm-label">
            Steps to reproduce{" "}
            <span class="brm-optional">(optional)</span>
          </label>
          <textarea
            class="brm-textarea"
            value={steps()}
            onInput={(e) => setSteps(e.currentTarget.value)}
            rows={3}
            placeholder="1. I searched for...&#10;2. Then clicked..."
          />

          <p class="brm-hint">
            Clicking "Submit" will open a pre-filled GitHub issue in your browser. The issue type will be set to <strong>bug</strong>.
          </p>
        </div>

        <div class="brm-footer">
          <button class="brm-btn-ghost" onClick={props.onClose}>
            Cancel
          </button>
          <button class="brm-btn-primary" onClick={handleSubmit}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Submit on GitHub
          </button>
        </div>
      </div>
    </div>
  );
};
