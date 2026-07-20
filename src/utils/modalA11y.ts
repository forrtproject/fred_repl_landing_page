import { createEffect, onCleanup } from "solid-js";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusable = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);

/**
 * Traps Tab focus inside a dialog while it is open, moves initial focus into
 * the dialog on open, and restores focus to the previously focused element on
 * close. Dependency-free; wire it once near a component's root with an accessor
 * for the dialog container and an `open` accessor.
 */
export function createFocusTrap(
  getContainer: () => HTMLElement | undefined,
  isOpen: () => boolean,
) {
  createEffect(() => {
    if (!isOpen()) return;
    const container = getContainer();
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer so any `autofocus` element inside the dialog wins; only take over
    // initial focus if nothing in the dialog has claimed it.
    queueMicrotask(() => {
      if (!container.isConnected) return;
      if (container.contains(document.activeElement)) return;
      const focusables = getFocusable(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Listen on document, not the container: dynamic content can unmount the
    // focused element (dropping focus to <body>), after which a container-scoped
    // listener would never see the Tab and could not recover focus.
    document.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    });
  });
}
