import { CloseIcon, WarningIcon } from "../icons";
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
            <CloseIcon size={16} />
          </button>

          <div class="alert-dialog-icon" aria-hidden="true">
            <WarningIcon size={26} />
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
