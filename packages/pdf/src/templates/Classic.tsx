import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  DOCUMENT_TITLES,
  formatMoney,
  formatAmount,
  notesToPlainText,
  hasNotesContent,
  formatLineItemDescription,
  type DocumentKind,
} from "@easy-invoice/shared";
import type { PdfDocumentData } from "../types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a5f",
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1e3a5f" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#666", marginBottom: 2 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  colDesc: { flex: 3 },
  colNum: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 180, justifyContent: "space-between", marginBottom: 4 },
  grandTotal: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 4 },
});

import { formatDate as formatDocumentDate } from "@easy-invoice/shared";

function formatDate(d?: string) {
  return d ? formatDocumentDate(d) : "";
}

export function ClassicPdf({ data }: { data: PdfDocumentData }) {
  const title = DOCUMENT_TITLES[data.kind];
  const money = (n: number) => formatMoney(n, data.currency);
  const amount = (n: number) => formatAmount(n);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text>#{data.number}</Text>
          </View>
          <View>
            <Text style={styles.label}>Issue Date</Text>
            <Text>{formatDate(data.issue_date)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 40, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>FROM</Text>
            <Text>{data.seller_name}</Text>
            <Text>{data.seller_address}</Text>
            <Text>{data.seller_email}</Text>
            {data.seller_phone ? <Text>{data.seller_phone}</Text> : null}
            {data.seller_tax_id ? <Text>Tax ID: {data.seller_tax_id}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>BILL TO</Text>
            <Text>{data.buyer_name}</Text>
            <Text>{data.buyer_address}</Text>
            <Text>{data.buyer_email}</Text>
          </View>
        </View>

        <KindMeta kind={data.kind} data={data} formatDate={formatDate} />

        <View style={styles.section}>
          <View style={[styles.row, { backgroundColor: "#f5f5f5", fontFamily: "Helvetica-Bold" }]}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colNum}>Qty</Text>
            <Text style={styles.colNum}>Price ({data.currency})</Text>
            <Text style={styles.colNum}>Total ({data.currency})</Text>
          </View>
          {data.line_items.map((item, i) => {
            const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
            return (
              <View key={i} style={styles.row}>
                <Text style={styles.colDesc}>{formatLineItemDescription(item)}</Text>
                <Text style={styles.colNum}>{item.quantity}</Text>
                <Text style={styles.colNum}>{amount(item.unit_price)}</Text>
                <Text style={styles.colNum}>{amount(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(data.totals.subtotal)}</Text>
          </View>
          {data.totals.discount_total > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-{money(data.totals.discount_total)}</Text>
            </View>
          )}
          {data.totals.tax_total > 0 && (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{money(data.totals.tax_total)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>{data.kind === "receipt" ? "Amount Paid" : "Total Due"}</Text>
            <Text>
              {money(data.kind === "receipt" ? (data.amount_paid ?? data.totals.grand_total) : data.totals.grand_total)}
            </Text>
          </View>
        </View>

        {hasNotesContent(data.notes) ? (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{notesToPlainText(data.notes)}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

function KindMeta({
  kind,
  data,
  formatDate,
}: {
  kind: DocumentKind;
  data: PdfDocumentData;
  formatDate: (d?: string) => string;
}) {
  if (kind === "invoice") {
    if (data.show_due_info !== true) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text>Due Date: {formatDate(data.due_date)}</Text>
        {data.payment_terms ? <Text>Terms: {data.payment_terms}</Text> : null}
      </View>
    );
  }
  if (kind === "proforma") {
    return data.valid_until ? (
      <View style={{ marginBottom: 16 }}>
        <Text>Valid Until: {formatDate(data.valid_until)}</Text>
      </View>
    ) : null;
  }
  if (kind === "receipt") {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text>Paid On: {formatDate(data.paid_at)}</Text>
        <Text>Payment Method: {data.payment_method}</Text>
      </View>
    );
  }
  return null;
}
