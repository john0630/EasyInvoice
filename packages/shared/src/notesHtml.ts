export function isRichNotes(notes: string): boolean {
  return /<[a-z][\s\S]*>/i.test(notes.trim());
}

export function normalizeNotesHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return "";
  }
  return trimmed;
}

export function notesToPlainText(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return "";
  if (!isRichNotes(trimmed)) return trimmed;

  const withBreaks = trimmed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/blockquote>/gi, "\n\n");

  const text = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function hasNotesContent(notes: string): boolean {
  return notesToPlainText(notes).trim().length > 0;
}
