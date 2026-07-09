import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getPdfDocument, type PdfDocumentData } from "@easy-invoice/pdf";
import type { TemplateId } from "@easy-invoice/shared";

export function buildPdfFilename(documentNumber: string, issueDate: string): string {
  const safeNumber = (documentNumber.trim() || "draft").replace(/[/\\?%*:|"<>]/g, "-");
  const safeDate = issueDate.trim() || new Date().toISOString().slice(0, 10);
  return `${safeNumber}-${safeDate}.pdf`;
}

export async function renderPdfBlob(
  templateId: TemplateId,
  data: PdfDocumentData,
): Promise<Blob> {
  const doc = getPdfDocument(templateId, data) as ReactElement<DocumentProps>;
  return pdf(doc).toBlob();
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(
  templateId: TemplateId,
  data: PdfDocumentData,
  filename: string,
): Promise<void> {
  const blob = await renderPdfBlob(templateId, data);
  triggerBlobDownload(blob, filename);
}
