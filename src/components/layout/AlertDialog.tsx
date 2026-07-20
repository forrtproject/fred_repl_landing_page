import { Show, onCleanup, onMount, type JSX } from "solid-js";
import { createFocusTrap } from "../../utils/modalA11y";

type AlertDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  hint?: JSX.Element;
  confirmLabel?: string;
  variant?: "warning" | "error" | "info";
  onClose: () => void;
};

export const AlertDialog = (props: AlertDialogProps) => {
  let dialogRef: HTMLDivElement | undefined;

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.open) props.onClose();
  };

  onMount(() => window.addEventListener("keydown", handleKey));
  onCleanup(() => window.removeEventListener("keydown", handleKey));

  createFocusTrap(() => dialogRef, () => props.open);

  return (
    <Show when={props.open}>
      <div
        class="alert-dialog-backdrop"
        onClick={props.onClose}
        role="presentation"
      >
        <div
          ref={dialogRef}
          class="alert-dialog"
          classList={{
            "alert-dialog-warning": (props.variant ?? "warning") === "warning",
            "alert-dialog-error": props.variant === "error",
            "alert-dialog-info": props.variant === "info",
          }}
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
        >
          <button
            type="button"
            class="alert-dialog-close"
            aria-label="Close"
            onClick={props.onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div class="alert-dialog-icon" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h3 class="alert-dialog-title" id="alert-dialog-title">
            {props.title ?? "Heads up"}
          </h3>
          <p class="alert-dialog-message">{props.message}</p>
          <Show when={props.hint}>
            <div class="alert-dialog-hint">{props.hint}</div>
          </Show>

          <div class="alert-dialog-actions">
            <button
              type="button"
              class="alert-dialog-confirm"
              onClick={props.onClose}
              autofocus
            >
              {props.confirmLabel ?? "Got it"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
