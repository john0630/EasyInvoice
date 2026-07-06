import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { DOCUMENT_TITLES, formatMoney, formatLineItemDescription } from "@easy-invoice/shared";
import type { PdfDocumentData } from "../types";

const ACCENT = "#2563eb";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica" },
  accent: { backgroundColor: ACCENT, height: 8 },
  body: { padding: 40 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: ACCENT },
  card: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 4, marginBottom: 12 },
});

export function ModernPdf({ data }: { data: PdfDocumentData }) {
  const title = DOCUMENT_TITLES[data.kind];
  const money = (n: number) => formatMoney(n, data.currency);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} />
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={{ color: "#64748b", marginBottom: 20 }}>{data.number}</Text>

          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Seller</Text>
              <Text>{data.seller_name}</Text>
              <Text>{data.seller_address}</Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Buyer</Text>
              <Text>{data.buyer_name}</Text>
              <Text>{data.buyer_address}</Text>
            </View>
          </View>

          {data.line_items.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#e2e8f0",
              }}
            >
              <Text>{formatLineItemDescription(item)}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {money(item.quantity * item.unit_price)}
              </Text>
            </View>
          ))}

          <View style={{ marginTop: 20, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: ACCENT }}>
              {money(data.totals.grand_total)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
