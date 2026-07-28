import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type OfferPdfData = {
  offerNumber: string;
  generatedDate: string;
  validUntil: string;
  sender: {
    displayName: string;
    legalName?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    taxId?: string | null;
    vatNote: string;
    disclaimer: string;
  };
  recipient: {
    name?: string | null;
    company: string;
    address?: string | null;
  };
  audit?: {
    score: number;
    band: string;
  } | null;
  goal: string;
  nextSteps?: string | null;
  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    priceLabel?: string | null;
    interval: string;
    period?: string | null;
  }>;
  onceTotal: number;
  monthlyTotal: number;
};

const palette = {
  ink: "#272936",
  muted: "#676b7c",
  line: "#dfe3f0",
  blue: "#4466f6",
  soft: "#f4f6fd",
  white: "#fbfcff",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 46,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: palette.ink,
    backgroundColor: palette.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  brand: { fontSize: 19, fontFamily: "Helvetica-Bold", color: palette.blue },
  eyebrow: { color: palette.muted, fontSize: 8, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 },
  meta: { textAlign: "right", color: palette.muted, lineHeight: 1.5 },
  addressRow: { flexDirection: "row", gap: 28, marginTop: 24, marginBottom: 26 },
  addressColumn: { width: "50%", lineHeight: 1.5 },
  section: { marginTop: 19 },
  heading: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", lineHeight: 1.12, marginBottom: 10, maxWidth: 430 },
  body: { fontSize: 10, lineHeight: 1.55, color: palette.ink },
  audit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginTop: 16,
    backgroundColor: palette.soft,
    borderRadius: 5,
  },
  auditScore: { fontSize: 20, color: palette.blue, fontFamily: "Helvetica-Bold" },
  table: { marginTop: 8, borderTopWidth: 1, borderTopColor: palette.line },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  itemBody: { flexGrow: 1, flexShrink: 1 },
  itemName: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  itemDescription: { color: palette.muted, fontSize: 8.5, lineHeight: 1.45 },
  itemPrice: { width: 105, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totals: { alignSelf: "flex-end", width: 240, marginTop: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalStrong: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    left: 46,
    right: 46,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    color: palette.muted,
    fontSize: 7.5,
  },
  note: { marginTop: 22, color: palette.muted, fontSize: 8, lineHeight: 1.45 },
});

function money(value: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function intervalLabel(interval: string, period?: string | null) {
  if (period) return period;
  if (interval === "monatlich") return "pro Monat";
  return "einmalig";
}

export function OfferPdf({ data }: { data: OfferPdfData }) {
  return (
    <Document title={`Angebot ${data.offerNumber}`} author={data.sender.displayName}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Lokale Sichtbarkeit, klar umgesetzt</Text>
            <Text style={styles.brand}>{data.sender.displayName}</Text>
          </View>
          <View style={styles.meta}>
            <Text>{data.offerNumber}</Text>
            <Text>Erstellt am {data.generatedDate}</Text>
            <Text>Gültig bis {data.validUntil}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.addressColumn}>
            <Text style={styles.eyebrow}>Angebot für</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.recipient.company}</Text>
            {data.recipient.name ? <Text>{data.recipient.name}</Text> : null}
            {data.recipient.address ? <Text>{data.recipient.address}</Text> : null}
          </View>
          <View style={styles.addressColumn}>
            <Text style={styles.eyebrow}>Anbieter</Text>
            <Text>{data.sender.legalName || data.sender.displayName}</Text>
            {data.sender.address ? <Text>{data.sender.address}</Text> : null}
            {data.sender.email ? <Link src={`mailto:${data.sender.email}`}>{data.sender.email}</Link> : null}
            {data.sender.phone ? <Text>{data.sender.phone}</Text> : null}
            {data.sender.taxId ? <Text>{data.sender.taxId}</Text> : null}
          </View>
        </View>

        <Text style={styles.eyebrow}>Ihr nächster Sichtbarkeitsschritt</Text>
        <Text style={styles.title}>Klarer Auftritt. Lokal besser gefunden.</Text>
        <Text style={styles.body}>{data.goal}</Text>

        {data.audit ? (
          <View style={styles.audit}>
            <View>
              <Text style={styles.eyebrow}>Audit-Ausgangslage</Text>
              <Text>{data.audit.band}</Text>
            </View>
            <Text style={styles.auditScore}>{data.audit.score}/100</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.heading}>Leistungsumfang</Text>
          <View style={styles.table}>
            {data.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.item} wrap={false}>
                <View style={styles.itemBody}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
                </View>
                <Text style={styles.itemPrice}>
                  {item.priceLabel || money(item.unitPrice * item.quantity)}
                  {"\n"}
                  <Text style={{ color: palette.muted, fontSize: 8 }}>
                    {intervalLabel(item.interval, item.period)}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totals} wrap={false}>
          {data.onceTotal > 0 ? (
            <View style={styles.totalRow}>
              <Text>Einmalig netto</Text>
              <Text style={styles.totalStrong}>{money(data.onceTotal)}</Text>
            </View>
          ) : null}
          {data.monthlyTotal > 0 ? (
            <View style={styles.totalRow}>
              <Text>Monatlich netto</Text>
              <Text style={styles.totalStrong}>{money(data.monthlyTotal)}</Text>
            </View>
          ) : null}
          <Text style={{ color: palette.muted, fontSize: 8, textAlign: "right" }}>{data.sender.vatNote}</Text>
        </View>

        {data.nextSteps ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.heading}>Nächste Schritte</Text>
            <Text style={styles.body}>{data.nextSteps}</Text>
          </View>
        ) : null}

        <Text style={styles.note}>{data.sender.disclaimer}</Text>

        <View style={styles.footer} fixed>
          <Text>{data.sender.displayName} · {data.offerNumber}</Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
