interface SmoothScrollOpts {
  /** How to align the target. "start" aligns to the top of the container,
   *  "nearest" brings the target just into view with minimal movement. */
  block?: "start" | "nearest";
  /** Maximum distance (px) animated smoothly. Longer jumps are completed
   *  instantly up to this residual, then the residual is scrolled smoothly.
   *  Takes precedence over `residualViewports`. */
  residualPx?: number;
  /** Residual expressed as a multiple of the container's viewport height.
   *  Defaults to 1. Larger blocks (e.g. the detail panel) read better with a
   *  bigger value so the smooth phase shows substantial motion. */
  residualViewports?: number;
}

/**
 * Scroll `target` into view within `container`, but keep the smooth animation
 * short regardless of distance: instantly jump so the target sits just outside
 * the viewport, then smooth-scroll the residual (~1 viewport). This stops the
 * trailing column from crawling across a long list.
 */
export function smoothScrollIntoView(
  container: HTMLElement,
  target: HTMLElement,
  opts: SmoothScrollOpts = {},
): void {
  const { block = "start", residualPx, residualViewports = 1 } = opts;

  // Detached nodes report zeroed rects, which would scroll the container to a
  // bogus position. Bail out; a re-render will have replaced this element.
  if (!target.isConnected) return;

  // Mobile/tablet layouts make the panels `overflow: visible` and scroll the
  // page instead: the passed container isn't the scroller, so defer to the
  // native behaviour.
  if (container.scrollHeight <= container.clientHeight) {
    target.scrollIntoView({ behavior: "smooth", block });
    return;
  }

  const currentScroll = container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  const targetTop =
    currentScroll +
    (target.getBoundingClientRect().top - container.getBoundingClientRect().top);

  let finalScroll: number;
  if (block === "nearest") {
    const viewTop = currentScroll;
    const viewBottom = currentScroll + container.clientHeight;
    const targetBottom = targetTop + target.offsetHeight;
    if (targetTop >= viewTop && targetBottom <= viewBottom) {
      // Already fully visible, so don't scroll. This also throttles the rapid
      // selection changes during a fast right-panel drag from each launching
      // a new animation.
      return;
    }
    // Bring the nearest off-screen edge into view with minimal movement.
    finalScroll = targetTop < viewTop ? targetTop : targetBottom - container.clientHeight;
  } else {
    finalScroll = targetTop;
  }

  finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));

  const residual = residualPx ?? container.clientHeight * residualViewports;
  const distance = finalScroll - currentScroll;

  if (Math.abs(distance) > residual) {
    const dir = distance > 0 ? 1 : -1;
    // Jump so the target sits just outside the viewport...
    container.scrollTop = finalScroll - dir * residual;
    // ...then smooth-scroll the residual. A single rAF lets the instant jump
    // commit before the smooth phase starts; a double rAF guards against
    // engines that otherwise coalesce the two into a teleport.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTo({ top: finalScroll, behavior: "smooth" });
      });
    });
  } else {
    container.scrollTo({ top: finalScroll, behavior: "smooth" });
  }
}
