export type BibtexEntry = {
  type: string;
  key: string;
  fields: Record<string, string>;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// True only if the leading `{` is closed by the trailing `}` (i.e. the two are
// a matching pair), so that a value like `{A} and {B}` — where the brace depth
// returns to 0 before the end — is left intact instead of being corrupted.
const bracesArePair = (value: string): boolean => {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    // Count backslashes immediately before this char; an odd run means the
    // brace is escaped (\{ or \}) and therefore not structural.
    let backslashes = 0;
    for (let j = i - 1; j >= 0 && value[j] === "\\"; j -= 1) backslashes += 1;
    if (backslashes % 2 === 1) continue;
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    if (depth === 0 && i < value.length - 1) return false;
  }
  return depth === 0;
};

const stripWrapping = (value: string): string => {
  let trimmed = value.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}") && bracesArePair(trimmed)) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

type SplitState = {
  parts: string[];
  buffer: string;
  braceDepth: number;
  inQuotes: boolean;
};

const updateQuoteState = (state: SplitState, char: string, prevChar: string | undefined): void => {
  if (char === '"' && prevChar !== "\\") {
    state.inQuotes = !state.inQuotes;
  }
};

const updateBraceDepth = (state: SplitState, char: string): void => {
  if (state.inQuotes) return;
  if (char === "{") state.braceDepth += 1;
  if (char === "}" && state.braceDepth > 0) state.braceDepth -= 1;
};

const flushBuffer = (state: SplitState): void => {
  if (state.buffer.trim()) state.parts.push(state.buffer.trim());
  state.buffer = "";
};

const splitTopLevel = (input: string): string[] => {
  const state: SplitState = { parts: [], buffer: "", braceDepth: 0, inQuotes: false };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const prevChar = i > 0 ? input[i - 1] : undefined;

    updateQuoteState(state, char, prevChar);
    updateBraceDepth(state, char);

    if (char === "," && state.braceDepth === 0 && !state.inQuotes) {
      flushBuffer(state);
      continue;
    }

    state.buffer += char;
  }

  flushBuffer(state);
  return state.parts;
};

export const bibtexToJson = (bibtex: string): BibtexEntry | null => {
  if (!bibtex) return null;
  const pattern = /^@([a-zA-Z]+)\s*\{\s*([^,]+)\s*,([\s\S]*)\}\s*$/;
  const match = pattern.exec(bibtex.trim());
  if (!match) return null;

  const type = match[1].toLowerCase();
  const key = match[2].trim();
  const rawFields = match[3].trim();

  const fields: Record<string, string> = {};
  const entries = splitTopLevel(rawFields);

  entries.forEach(entry => {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) return;
    const field = entry.slice(0, eqIndex).trim().toLowerCase();
    const rawValue = entry.slice(eqIndex + 1).trim();
    fields[field] = stripWrapping(rawValue);
  });

  return { type, key, fields };
};

const formatLabel = (value: string): string =>
  value
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const bibtexToHtml = (bibtex: string): string => {
  const entry = bibtexToJson(bibtex);
  if (!entry) return "<div>Invalid BibTeX</div>";

  const preferredOrder = [
    "title",
    "author",
    "journal",
    "year",
    "month",
    "volume",
    "number",
    "pages",
    "doi",
    "url",
    "publisher",
    "issn",
  ];

  const fieldKeys = Object.keys(entry.fields);
  const orderedKeys = [
    ...preferredOrder.filter(key => fieldKeys.includes(key)),
    ...fieldKeys.filter(key => !preferredOrder.includes(key)),
  ];

  const rows = orderedKeys
    .map(key => {
      const value = entry.fields[key];
      return `<div class="flex flex-col gap-1 min-w-[180px] flex-1"><dt class="text-[11px] font-semibold text-neutral/70">${escapeHtml(formatLabel(key))}</dt><dd class="text-xs">${escapeHtml(value)}</dd></div>`;
    })
    .join("");

  return `
    <div class="flex flex-col gap-2">
      <div class="text-[11px] uppercase text-neutral/70">${escapeHtml(entry.type)} · ${escapeHtml(entry.key)}</div>
      <dl class="flex flex-wrap gap-3">${rows}</dl>
    </div>
  `;
};

export const BibtexToHtml = (props: { text: string }) => (
  <span innerHTML={bibtexToHtml(props.text)} />
);
