/**
 * Converts markdown-style links to HTML links
 * Example: [text](url) becomes <a href="url">text</a>
 * Also converts **text** and *text* to <strong>text</strong>
 */
export const markdownToHtml = (text: string): string => {
  if (!text) return '';
  
  let result = text;
  
  // Convert markdown links [text](url) to HTML links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a class="link link-secondary" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Convert bold **text** to <strong>text</strong>
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  // Convert italic/bold *text* to <strong>text</strong>
  result = result.replace(
    /\*([^*]+)\*/g,
    '<strong>$1</strong>'
  );
  
  return result;
};

/**
 * Component-friendly version that returns JSX-compatible HTML
 */
export const MarkdownToHtml = (props: { text: string }) => {
  return <span innerHTML={markdownToHtml(props.text)} />;
};