import { isRichNotes } from "@easy-invoice/shared";
import { sanitizeNotesHtml } from "@/lib/sanitizeNotes";

type Props = {
  notes: string;
  className?: string;
};

export function NotesContent({ notes, className = "" }: Props) {
  if (!notes.trim()) return null;

  if (isRichNotes(notes)) {
    return (
      <div
        className={`notes-content ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeNotesHtml(notes) }}
      />
    );
  }

  return <p className={`whitespace-pre-line ${className}`}>{notes}</p>;
}
