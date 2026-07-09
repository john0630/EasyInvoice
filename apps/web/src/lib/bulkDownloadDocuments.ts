import JSZip from "jszip";
import { calculateTotals, type DocumentFormData } from "@easy-invoice/shared";
import type { SellerInfo } from "@/lib/localCatalog";
import {
  buildPdfFilename,
  renderPdfBlob,
  triggerBlobDownload,
} from "@/lib/downloadPdf";

function uniqueZipFilename(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const stem = base.replace(/\.pdf$/i, "");
  let n = 2;
  while (used.has(`${stem}-${n}.pdf`)) n++;
  const unique = `${stem}-${n}.pdf`;
  used.add(unique);
  return unique;
}

export async function downloadDocumentPdfs(
  items: { form: DocumentFormData; seller: SellerInfo }[],
): Promise<void> {
  if (items.length === 0) return;

  if (items.length === 1) {
    const { form, seller } = items[0];
    const totals = calculateTotals(form.line_items);
    const blob = await renderPdfBlob(form.template_id, {
      ...form,
      ...seller,
      totals,
      amount_paid: form.amount_paid ?? totals.grand_total,
    });
    triggerBlobDownload(blob, buildPdfFilename(form.number, form.issue_date));
    return;
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const { form, seller } of items) {
    const totals = calculateTotals(form.line_items);
    const blob = await renderPdfBlob(form.template_id, {
      ...form,
      ...seller,
      totals,
      amount_paid: form.amount_paid ?? totals.grand_total,
    });
    const filename = uniqueZipFilename(
      buildPdfFilename(form.number, form.issue_date),
      usedNames,
    );
    zip.file(filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(
    zipBlob,
    `documents-${new Date().toISOString().slice(0, 10)}.zip`,
  );
}
