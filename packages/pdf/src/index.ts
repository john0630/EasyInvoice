import type { ReactElement } from "react";
import type { TemplateId } from "@easy-invoice/shared";
import type { PdfDocumentData } from "./types";
import { ClassicPdf } from "./templates/Classic";
import { MinimalPdf } from "./templates/Minimal";
import { ModernPdf } from "./templates/Modern";

export type { PdfDocumentData } from "./types";

const TEMPLATES: Record<
  TemplateId,
  (props: { data: PdfDocumentData }) => ReactElement
> = {
  classic: ClassicPdf,
  minimal: MinimalPdf,
  modern: ModernPdf,
};

export function getPdfDocument(
  templateId: TemplateId,
  data: PdfDocumentData,
): ReactElement {
  const Template = TEMPLATES[templateId] ?? ClassicPdf;
  return Template({ data });
}
