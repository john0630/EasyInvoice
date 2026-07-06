import DOMPurify from "isomorphic-dompurify";

export function sanitizeNotesHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h1",
      "h2",
      "h3",
    ],
    ALLOWED_ATTR: [],
  });
}
