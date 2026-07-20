type PdfOptions = {
  title?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const collectStyles = (): string =>
  Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join("\n");

export const downloadElementAsPdf = (element: HTMLElement, options: PdfOptions = {}): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const title = escapeHtml(options.title || "replication-summary");
  const styles = collectStyles();
  const printStyles = `
<style>
  @media print {
    .no-print {
      display: none !important;
    }
  }

  body {
    margin: 24px;
  }

  .print-container {
    max-width: 960px;
    margin: 0 auto;
  }
</style>
`;

  const doc = printWindow.document;
  doc.title = title;

  const head = doc.head || doc.createElement("head");
  if (!doc.head) {
    doc.documentElement.appendChild(head);
  }

  head.insertAdjacentHTML("beforeend", styles + printStyles);

  const body = doc.body || doc.createElement("body");
  if (!doc.body) {
    doc.documentElement.appendChild(body);
  }

  const container = doc.createElement("div");
  container.className = "print-container";

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.querySelectorAll("details").forEach(detail => {
    (detail as HTMLDetailsElement).open = true;
  });

  container.appendChild(clonedElement);
  body.appendChild(container);

  // Both the load event and the timeout can fire; guard so print runs once.
  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  printWindow.addEventListener("load", triggerPrint, { once: true });
  setTimeout(triggerPrint, 500);
};
