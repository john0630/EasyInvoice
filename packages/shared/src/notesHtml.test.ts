import { describe, expect, it } from "vitest";
import {
  hasNotesContent,
  isRichNotes,
  normalizeNotesHtml,
  notesToPlainText,
} from "./notesHtml";

describe("notesHtml", () => {
  it("detects rich notes", () => {
    expect(isRichNotes("<p>Hello</p>")).toBe(true);
    expect(isRichNotes("Plain text")).toBe(false);
  });

  it("normalizes empty editor html", () => {
    expect(normalizeNotesHtml("<p></p>")).toBe("");
    expect(normalizeNotesHtml("<p><strong>Hi</strong></p>")).toBe(
      "<p><strong>Hi</strong></p>",
    );
  });

  it("converts html to plain text", () => {
    expect(notesToPlainText("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
    expect(notesToPlainText("<ul><li>One</li><li>Two</li></ul>")).toContain(
      "• One",
    );
  });

  it("checks note content", () => {
    expect(hasNotesContent("<p></p>")).toBe(false);
    expect(hasNotesContent("<p>Thanks</p>")).toBe(true);
    expect(hasNotesContent("Thanks")).toBe(true);
  });
});
