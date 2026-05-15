import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
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
  return `Rs.${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtW(n: string | number | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `${num.toFixed(3)}g`;
}

const PW = 595.28; // A4 width in points
const PH = 841.89; // A4 height in points
const ML = 40;     // margin left
const MR = 40;     // margin right
const CW = PW - ML - MR; // content width

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    let y = 30;

    // ── HEADER ─────────────────────────────────────────────────────────────
    const logoPath = path.join(__dirname, "../logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, PW / 2 - 30, y, { height: 50, align: "center" });
      y += 58;
    }

    // Shop name
    doc.fontSize(16).font("Helvetica-Bold")
       .text(data.shop.shopName, ML, y, { width: CW, align: "center" });
    y += 22;

    // Shop address
    doc.fontSize(9).font("Helvetica")
       .text(data.shop.shopAddress, ML, y, { width: CW, align: "center" });
    y += 14;

    // GSTIN & UPI
    doc.fontSize(9).font("Helvetica")
       .text(`GSTIN: ${data.shop.gstNumber}   |   UPI: ${data.shop.upiId}`, ML, y, { width: CW, align: "center" });
    y += 14;

    // Phone
    if (data.shop.phone) {
      doc.fontSize(9).font("Helvetica")
         .text(`Phone: ${data.shop.phone}`, ML, y, { width: CW, align: "center" });
      y += 14;
    }

    y += 6;

    // Divider
    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#888888").lineWidth(0.5).stroke();
    y += 10;

    // TAX INVOICE label
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000")
       .text("TAX INVOICE", ML, y, { width: CW, align: "center" });
    y += 18;

    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#888888").lineWidth(0.5).stroke();
    y += 10;

    // ── INVOICE INFO + BILL TO ──────────────────────────────────────────────
    const col1X = ML;
    const col2X = PW / 2 + 10;
    const infoY = y;

    // Left: Invoice details
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000")
       .text("Invoice No:", col1X, infoY, { width: 80 });
    doc.fontSize(9).font("Helvetica")
       .text(data.invoiceNumber, col1X + 80, infoY, { width: 120 });

    doc.fontSize(9).font("Helvetica-Bold")
       .text("Date:", col1X, infoY + 16, { width: 80 });
    doc.fontSize(9).font("Helvetica")
       .text(data.invoiceDate, col1X + 80, infoY + 16, { width: 120 });

    // Right: Bill To
    doc.fontSize(9).font("Helvetica-Bold")
       .text("BILL TO:", col2X, infoY, { width: CW / 2 });
    doc.fontSize(10).font("Helvetica-Bold")
       .text(data.customerName, col2X, infoY + 14, { width: CW / 2 });

    let billY = infoY + 28;
    if (data.customerAddress) {
      doc.fontSize(9).font("Helvetica")
         .text(data.customerAddress, col2X, billY, { width: CW / 2 });
      billY += doc.heightOfString(data.customerAddress, { width: CW / 2 }) + 2;
    }
    if (data.customerGstin) {
      doc.fontSize(9).font("Helvetica")
         .text(`GSTIN: ${data.customerGstin}`, col2X, billY, { width: CW / 2 });
      billY += 14;
    }

    y = Math.max(infoY + 50, billY) + 12;

    // Divider
    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#888888").lineWidth(0.5).stroke();
    y += 8;

    // ── ITEMS TABLE ─────────────────────────────────────────────────────────
    // Column definitions: x, width, align
    const cols = [
      { x: ML,      w: 160, label: "Description",  align: "left"  as const },
      { x: 200,     w: 40,  label: "Type",         align: "left"  as const },
      { x: 240,     w: 50,  label: "Net Wt",       align: "right" as const },
      { x: 290,     w: 60,  label: "Rate/g",       align: "right" as const },
      { x: 350,     w: 60,  label: "Amount",       align: "right" as const },
      { x: 410,     w: 55,  label: "Making",       align: "right" as const },
      { x: 465,     w: 90,  label: "Total",        align: "right" as const },
    ];

    // Header row background
    doc.rect(ML, y, CW, 18).fillColor("#f5f5f5").fill();
    doc.fillColor("#000000");

    doc.fontSize(8).font("Helvetica-Bold");
    cols.forEach(col => {
      doc.text(col.label, col.x, y + 4, { width: col.w, align: col.align });
    });
    y += 20;

    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#cccccc").lineWidth(0.3).stroke();
    y += 4;

    // Item rows
    doc.fontSize(8).font("Helvetica").fillColor("#000000");
    for (const item of data.items) {
      const rowH = Math.max(
        doc.heightOfString(item.description, { width: cols[0].w }) + 8,
        24
      );

      const vals = [
        item.description,
        item.itemType ?? "—",
        fmtW(item.netWeight),
        item.sellingPricePerGram ? fmt(item.sellingPricePerGram) : "—",
        fmt(item.amount),
        fmt(item.makingChargeAmount),
        fmt(item.itemTotal),
      ];

      if (item.hsnCode) {
        doc.fontSize(7).font("Helvetica").fillColor("#666666")
           .text(`HSN: ${item.hsnCode}`, cols[0].x, y + rowH - 10, { width: cols[0].w });
      }

      vals.forEach((v, i) => {
        doc.fontSize(8).font("Helvetica").fillColor("#000000")
           .text(v, cols[i].x, y + 2, { width: cols[i].w, align: cols[i].align });
      });

      y += rowH;
      doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#eeeeee").lineWidth(0.3).stroke();
      y += 2;
    }

    y += 8;
    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#888888").lineWidth(0.5).stroke();
    y += 10;

    // ── SUMMARY + QR CODE ───────────────────────────────────────────────────
    const summaryX = 350;
    const summaryLabelW = 130;
    const summaryValX = summaryX + summaryLabelW + 4;
    const summaryValW = PW - MR - summaryValX;

    const summaryRows: [string, string][] = [
      ["Subtotal (Jewel Value):", fmt(data.subtotalAmount)],
      ["Making Charges:", fmt(data.makingChargesTotal)],
      ["GST @ 3% (Jewellery):", fmt(data.gstJewelTotal)],
      ["GST @ 5% (Making Charges):", fmt(data.gstMakingTotal)],
    ];

    const summaryStartY = y;
    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    let sy = summaryStartY;
    for (const [label, value] of summaryRows) {
      doc.text(label, summaryX, sy, { width: summaryLabelW, align: "left" });
      doc.text(value, summaryValX, sy, { width: summaryValW, align: "right" });
      sy += 16;
    }

    sy += 4;
    doc.moveTo(summaryX, sy).lineTo(PW - MR, sy).strokeColor("#888888").lineWidth(0.5).stroke();
    sy += 6;

    // Grand Total
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
    doc.text("GRAND TOTAL:", summaryX, sy, { width: summaryLabelW, align: "left" });
    doc.text(fmt(data.totalAmount), summaryValX, sy, { width: summaryValW, align: "right" });
    sy += 20;

    // QR Code on the left side
    const qrPath = path.join(__dirname, "../qr-code.jpg");
    const qrSize = 100;
    const qrX = ML;
    const qrY = summaryStartY;

    if (fs.existsSync(qrPath)) {
      doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000")
         .text("Scan & Pay", qrX, qrY + qrSize + 4, { width: qrSize, align: "center" });
      doc.fontSize(7).font("Helvetica").fillColor("#444444")
         .text(`UPI: ${data.shop.upiId}`, qrX, qrY + qrSize + 16, { width: qrSize + 40, align: "left" });
    }

    y = Math.max(sy, qrY + qrSize + 30) + 16;

    // Divider
    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor("#888888").lineWidth(0.5).stroke();
    y += 10;

    // ── TERMS + SIGNATURE ───────────────────────────────────────────────────
    const termsX = ML;
    const sigX = PW / 2 + 20;
    const termsY = y;

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000")
       .text("Terms & Conditions:", termsX, termsY);
    const terms = [
      "1. Goods once sold will not be taken back.",
      "2. All disputes are subject to Delhi jurisdiction.",
      "3. This is a computer-generated invoice.",
      "4. Prices are inclusive of GST as itemized above.",
      "5. Please check goods at the time of purchase.",
    ];
    doc.fontSize(7.5).font("Helvetica").fillColor("#333333");
    let ty = termsY + 14;
    for (const t of terms) {
      doc.text(t, termsX, ty, { width: 220 });
      ty += 12;
    }

    // Signature block
    doc.fontSize(8).font("Helvetica").fillColor("#333333")
       .text("For " + data.shop.shopName, sigX, termsY + 10, { width: 180 });
    doc.moveTo(sigX, termsY + 55).lineTo(sigX + 150, termsY + 55)
       .strokeColor("#000000").lineWidth(0.5).stroke();
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000")
       .text("Authorized Signatory", sigX, termsY + 58, { width: 180 });

    doc.end();
  });
}
