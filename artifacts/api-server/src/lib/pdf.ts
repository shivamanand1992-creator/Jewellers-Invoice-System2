import PDFDocument from "pdfkit";
import type { InvoiceItem } from "@workspace/db";

type InvoiceData = {
  invoiceNumber: string;
  customerName: string;
  customerAddress?: string | null;
  customerGstin?: string | null;
  invoiceDate: string;
  subtotalAmount: string;
  makingChargesTotal: string;
  gstJewelTotal: string;
  gstMakingTotal: string;
  totalAmount: string;
  items: InvoiceItem[];
  shop: {
    shopName: string;
    shopAddress: string;
    gstNumber: string;
    upiId: string;
    state: string;
    phone?: string | null;
    email?: string | null;
  };
};

function fmt(n: string | number | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtW(n: string | number | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `${num.toFixed(3)}g`;
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80;

    // ── Header ─────────────────────────────────────────────────────────────
    doc.fontSize(20).font("Helvetica-Bold").text(data.shop.shopName, 40, 40, { align: "center", width: pageWidth });
    doc.fontSize(10).font("Helvetica").text(data.shop.shopAddress, { align: "center", width: pageWidth });
    doc.fontSize(9).text(`GSTIN: ${data.shop.gstNumber}  |  UPI: ${data.shop.upiId}`, { align: "center", width: pageWidth });
    if (data.shop.phone) doc.text(`Phone: ${data.shop.phone}`, { align: "center", width: pageWidth });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Invoice Info ───────────────────────────────────────────────────────
    const infoY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold").text(`INVOICE #${data.invoiceNumber}`, 40, infoY);
    doc.fontSize(9).font("Helvetica").text(`Date: ${data.invoiceDate}`, 40, doc.y + 2);

    doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", 300, infoY);
    doc.fontSize(9).font("Helvetica").text(data.customerName, 300, doc.y + 2);
    if (data.customerAddress) doc.text(data.customerAddress, 300);
    if (data.customerGstin) doc.text(`GSTIN: ${data.customerGstin}`, 300);

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Items Table ────────────────────────────────────────────────────────
    const colX = [40, 180, 250, 310, 380, 450, 510];
    const headers = ["Description", "Type", "Net Wt", "Price/g", "Amount", "Making", "Total"];

    doc.fontSize(8).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 50, align: "left" });
    });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.3);

    doc.fontSize(8).font("Helvetica");
    for (const item of data.items) {
      const rowY = doc.y;
      const vals = [
        item.description,
        item.itemType ?? "—",
        fmtW(item.netWeight),
        item.sellingPricePerGram ? fmt(item.sellingPricePerGram) : "—",
        fmt(item.amount),
        fmt(item.makingChargeAmount),
        fmt(item.itemTotal),
      ];
      vals.forEach((v, i) => {
        doc.text(v, colX[i], rowY, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 50, align: "left" });
      });
      doc.moveDown(0.6);
    }

    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // ── GST Summary ────────────────────────────────────────────────────────
    const summaryX = 350;
    const valueX = 470;
    const summaryWidth = 100;

    const rows: [string, string][] = [
      ["Subtotal (Jewellery):", fmt(data.subtotalAmount)],
      ["Making Charges:", fmt(data.makingChargesTotal)],
      ["GST @ 3% (Jewellery):", fmt(data.gstJewelTotal)],
      ["GST @ 5% (Making):", fmt(data.gstMakingTotal)],
    ];

    doc.fontSize(9).font("Helvetica");
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.text(label, summaryX, y, { width: 120 });
      doc.text(value, valueX, y, { width: summaryWidth, align: "right" });
      doc.moveDown(0.4);
    }

    doc.moveDown(0.2);
    doc.moveTo(summaryX, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.3);

    const totalY = doc.y;
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("GRAND TOTAL:", summaryX, totalY, { width: 120 });
    doc.text(fmt(data.totalAmount), valueX, totalY, { width: summaryWidth, align: "right" });

    doc.moveDown(2);

    // ── Terms ──────────────────────────────────────────────────────────────
    doc.fontSize(8).font("Helvetica-Bold").text("Terms & Conditions:", 40);
    doc.font("Helvetica").fontSize(7);
    const terms = [
      "1. Goods once sold will not be taken back.",
      "2. All disputes are subject to Delhi jurisdiction.",
      "3. This is a computer-generated invoice.",
      "4. Prices are inclusive of GST as itemized above.",
      "5. Please check the goods at the time of purchase.",
    ];
    for (const t of terms) {
      doc.text(t, 40);
    }

    doc.end();
  });
}
