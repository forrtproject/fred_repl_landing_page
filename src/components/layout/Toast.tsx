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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
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
