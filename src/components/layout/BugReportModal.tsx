import { CloseIcon, GithubIcon } from "../icons";
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
            <CloseIcon size={14} />
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
            <GithubIcon size={14} />
            Submit on GitHub
          </button>
        </div>
      </div>
    </div>
  );
};
