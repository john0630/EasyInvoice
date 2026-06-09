import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { DOCUMENT_TITLES, formatMoney } from "@easy-invoice/shared";
import type { PdfDocumentData } from "../types";
const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#333" },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 32, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 16 },
});

export function MinimalPdf({ data }: { data: PdfDocumentData }) {
  const title = DOCUMENT_TITLES[data.kind];
  const money = (n: number) => formatMoney(n, data.currency);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={{ color: "#888", marginBottom: 24 }}>{data.number}</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text>{data.seller_name}</Text>
            <Text style={{ color: "#666" }}>{data.seller_email}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text>{data.buyer_name}</Text>
            <Text style={{ color: "#666" }}>{data.buyer_email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {data.line_items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text>{item.description}</Text>
            <Text>{money(item.quantity * item.unit_price)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>
            {money(data.totals.grand_total)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
