import { AlertCircleIcon, CloseIcon, InfoIcon, WarningIcon } from "../icons";
import { createSignal, For, onCleanup, type JSX } from "solid-js";

export type ToastVariant = "error" | "warning" | "info";

export type Toast = {
  id: number;
  title: string;
  message: string;
  variant: ToastVariant;
  reportable?: boolean;
};

type ToastItemProps = {
  toast: Toast;
  onDismiss: (id: number) => void;
  onReport?: (toast: Toast) => void;
};

let nextId = 1;

const AUTO_DISMISS_MS = 5000;

const ICONS: Record<ToastVariant, () => JSX.Element> = {
  error: () => (
    <AlertCircleIcon size={18} />
  ),
  warning: () => (
    <WarningIcon size={18} />
  ),
  info: () => (
    <InfoIcon size={18} />
  ),
};

const ToastItem = (props: ToastItemProps) => {
  const [exiting, setExiting] = createSignal(false);
  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  const dismiss = () => {
    setExiting(true);
    exitTimer = setTimeout(() => props.onDismiss(props.toast.id), 200);
  };

  const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
  onCleanup(() => {
    clearTimeout(timer);
    if (exitTimer) clearTimeout(exitTimer);
  });

  return (
    <div
      classList={{
        toast: true,
        [`toast--${props.toast.variant}`]: true,
        "toast--exit": exiting(),
      }}
      role="alert"
    >
      <span class="toast-icon">{ICONS[props.toast.variant]()}</span>
      <div class="toast-body">
        <div class="toast-title">{props.toast.title}</div>
        <div class="toast-message">{props.toast.message}</div>
        {props.toast.reportable && props.onReport && (
          <button
            class="toast-report-btn"
            onClick={() => { dismiss(); props.onReport!(props.toast); }}
          >
            Report this error
          </button>
        )}
      </div>
      <button class="toast-close" aria-label="Dismiss" onClick={dismiss}>
        <CloseIcon size={11} />
      </button>
    </div>
  );
};

export const createToastState = (onReport?: (toast: Toast) => void) => {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const show = (title: string, message: string, variant: ToastVariant = "error", reportable?: boolean) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, title, message, variant, reportable }]);
  };

  const ToastStack = () => (
    <div class="toast-stack" aria-live="assertive" aria-atomic="false">
      <For each={toasts()}>
        {(toast) => <ToastItem toast={toast} onDismiss={dismiss} onReport={onReport} />}
      </For>
    </div>
  );

  return { show, ToastStack };
};
