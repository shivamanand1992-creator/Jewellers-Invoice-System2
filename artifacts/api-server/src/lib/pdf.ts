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

// Draw a horizontal line
function hline(doc: PDFKit.PDFDocument, y: number, color = "#cccccc", width = 0.5) {
  doc.moveTo(40, y).lineTo(555, y).strokeColor(color).lineWidth(width).stroke();
}

// Draw text and return new Y position
function drawText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts: any = {}) {
  doc.text(text, x, y, opts);
  return y + (opts.lineGap ?? 0) + doc.heightOfString(text, opts);
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const L = 40;   // left margin
    const R = 555;  // right edge
    const W = R - L; // content width
    let y = 30;

    // ═══════════════════════════════════════════════
    // HEADER - Logo + Shop Details
    // ═══════════════════════════════════════════════
    const logoPath = path.join(__dirname, "../logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, L + W / 2 - 25, y, { height: 45 });
      y += 52;
    }

    doc.font("Helvetica-Bold").fontSize(15).fillColor("#1a1a1a")
       .text(data.shop.shopName, L, y, { width: W, align: "center" });
    y += 20;

    doc.font("Helvetica").fontSize(8.5).fillColor("#444444")
       .text(data.shop.shopAddress, L, y, { width: W, align: "center" });
    y += 13;

    doc.font("Helvetica").fontSize(8.5).fillColor("#444444")
       .text(`GSTIN: ${data.shop.gstNumber}`, L, y, { width: W, align: "center" });
    y += 13;

    if (data.shop.phone) {
      doc.font("Helvetica").fontSize(8.5).fillColor("#444444")
         .text(`Phone: ${data.shop.phone}`, L, y, { width: W, align: "center" });
      y += 13;
    }

    y += 6;
    hline(doc, y, "#333333", 1);
    y += 5;

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
       .text("TAX INVOICE", L, y, { width: W, align: "center" });
    y += 16;

    hline(doc, y, "#333333", 1);
    y += 12;

    // ═══════════════════════════════════════════════
    // INVOICE INFO + BILL TO (two columns)
    // ═══════════════════════════════════════════════
    const leftColW = W / 2 - 10;
    const rightColX = L + W / 2 + 10;
    const rightColW = W / 2 - 10;
    const infoStartY = y;

    // Left: invoice meta
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000")
       .text("Invoice No:", L, y, { width: 70, lineBreak: false });
    doc.font("Helvetica").fontSize(8.5)
       .text(data.invoiceNumber, L + 72, y, { width: leftColW - 72, lineBreak: false });
    y += 15;

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000")
       .text("Date:", L, y, { width: 70, lineBreak: false });
    doc.font("Helvetica").fontSize(8.5)
       .text(data.invoiceDate, L + 72, y, { width: leftColW - 72, lineBreak: false });
    y += 15;

    // Right: Bill To
    let ry = infoStartY;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#555555")
       .text("BILL TO", rightColX, ry, { width: rightColW });
    ry += 13;

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000")
       .text(data.customerName, rightColX, ry, { width: rightColW });
    ry += 14;

    if (data.customerAddress) {
      doc.font("Helvetica").fontSize(8.5).fillColor("#333333")
         .text(data.customerAddress, rightColX, ry, { width: rightColW });
      ry += doc.heightOfString(data.customerAddress, { width: rightColW }) + 4;
    }

    if (data.customerGstin) {
      doc.font("Helvetica").fontSize(8).fillColor("#333333")
         .text(`GSTIN: ${data.customerGstin}`, rightColX, ry, { width: rightColW });
      ry += 12;
    }

    y = Math.max(y, ry) + 12;

    hline(doc, y, "#333333", 0.8);
    y += 8;

    // ═══════════════════════════════════════════════
    // ITEMS TABLE
    // ═══════════════════════════════════════════════

    // Column definitions
    type Align = "left" | "right" | "center";
    const cols: { label: string; x: number; w: number; align: Align }[] = [
      { label: "Description",  x: L,    w: 155, align: "left"  },
      { label: "Type",         x: 196,  w: 40,  align: "left"  },
      { label: "Net Wt",       x: 237,  w: 50,  align: "right" },
      { label: "Rate/g",       x: 288,  w: 58,  align: "right" },
      { label: "Amount",       x: 347,  w: 58,  align: "right" },
      { label: "Making",       x: 406,  w: 52,  align: "right" },
      { label: "Total",        x: 459,  w: 96,  align: "right" },
    ];

    // Table header background
    doc.rect(L, y, W, 16).fillColor("#f0f0f0").fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
    cols.forEach(c => {
      doc.text(c.label, c.x, y + 4, { width: c.w, align: c.align, lineBreak: false });
    });
    y += 18;

    hline(doc, y, "#aaaaaa", 0.5);
    y += 5;

    // Item rows
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const descH = doc.heightOfString(item.description, { width: cols[0].w });
      const hsnH = item.hsnCode ? 10 : 0;
      const rowH = Math.max(descH + hsnH + 6, 22);

      // Alternate row shading
      if (i % 2 === 1) {
        doc.rect(L, y, W, rowH).fillColor("#fafafa").fill();
      }

      const vals = [
        item.description,
        item.itemType ?? "—",
        fmtW(item.netWeight),
        item.sellingPricePerGram ? fmt(item.sellingPricePerGram) : "—",
        fmt(item.amount),
        fmt(item.makingChargeAmount),
        fmt(item.itemTotal),
      ];

      doc.font("Helvetica").fontSize(8).fillColor("#000000");
      vals.forEach((v, ci) => {
        const c = cols[ci];
        doc.text(v, c.x, y + 3, { width: c.w, align: c.align, lineBreak: ci === 0 });
      });

      // HSN code below description
      if (item.hsnCode) {
        const hsnY = y + 3 + doc.heightOfString(item.description, { width: cols[0].w });
        doc.font("Helvetica").fontSize(7).fillColor("#777777")
           .text(`HSN: ${item.hsnCode}`, cols[0].x, hsnY, { width: cols[0].w, lineBreak: false });
      }

      y += rowH;
      hline(doc, y, "#dddddd", 0.3);
      y += 3;
    }

    y += 10;
    hline(doc, y, "#333333", 0.8);
    y += 14;

    // ═══════════════════════════════════════════════
    // TOTALS SUMMARY (right side)
    // ═══════════════════════════════════════════════
    const totStartY = y;
    const totLX = 320;
    const totVX = 450;
    const totLW = 125;
    const totVW = 105;

    const totRows: [string, string][] = [
      ["Subtotal (Jewel Value):", fmt(data.subtotalAmount)],
      ["Making Charges:", fmt(data.makingChargesTotal)],
      ["GST @ 3% (Jewellery):", fmt(data.gstJewelTotal)],
      ["GST @ 5% (Making):", fmt(data.gstMakingTotal)],
    ];

    doc.font("Helvetica").fontSize(8.5).fillColor("#333333");
    let ty = totStartY;
    for (const [label, val] of totRows) {
      doc.text(label, totLX, ty, { width: totLW, align: "left", lineBreak: false });
      doc.text(val, totVX, ty, { width: totVW, align: "right", lineBreak: false });
      ty += 15;
    }

    ty += 3;
    hline(doc, ty, "#333333", 0.8);
    ty += 6;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
       .text("GRAND TOTAL:", totLX, ty, { width: totLW, align: "left", lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#c8960c")
       .text(fmt(data.totalAmount), totVX, ty, { width: totVW, align: "right", lineBreak: false });
    ty += 20;

    y = Math.max(ty, totStartY) + 16;
    hline(doc, y, "#333333", 0.8);
    y += 14;

    // ═══════════════════════════════════════════════
    // QR CODE (centered, large, high quality)
    // ═══════════════════════════════════════════════
    const qrPath = path.join(__dirname, "../qr-code.jpg");
    if (fs.existsSync(qrPath)) {
      const qrSize = 130;
      const qrX = L + W / 2 - qrSize / 2;

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
         .text("— Please Pay Here —", L, y, { width: W, align: "center" });
      y += 16;

      doc.image(qrPath, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 6;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#333333")
         .text("Scan to Pay via UPI", L, y, { width: W, align: "center" });
      y += 14;
    }

    hline(doc, y, "#333333", 0.8);
    y += 12;

    doc.end();
  });
}
