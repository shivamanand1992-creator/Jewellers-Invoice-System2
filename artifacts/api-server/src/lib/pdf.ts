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
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtW(n: string | number | null | undefined): string {
  if (n == null || n === "" ) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "—";
  return `${num.toFixed(3)}g`;
}

function amountInWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function toWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
    if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
    return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = "Rs. " + toWords(rupees) + " Only";
  if (paise > 0) result = "Rs. " + toWords(rupees) + " and " + toWords(paise) + " Paise Only";
  return result;
}

function hline(doc: PDFKit.PDFDocument, x1: number, y: number, x2: number, color = "#000000", w = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(w).stroke();
}

function vline(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, color = "#000000", w = 0.5) {
  doc.moveTo(x, y1).lineTo(x, y2).strokeColor(color).lineWidth(w).stroke();
}

function box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color = "#000000", lw = 0.5) {
  doc.rect(x, y, w, h).strokeColor(color).lineWidth(lw).stroke();
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
    const buffers: Buffer[] = [];
    doc.on("data", (c) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const L = 30;
    const R = 565;
    const W = R - L;
    let y = 20;

    // ═══════════════════════════════════════════════════════
    // HEADER — Logo + Shop Name + Address
    // ═══════════════════════════════════════════════════════
    // ── HEADER: Logo left, Shop details right ──────────────────
    const logoPath = path.join(__dirname, "../logo.png");
    y += 14;
    const headerStartY = y;
    const logoW = 100;
    const detailX = L + logoW + 12;
    const detailW = R - detailX;

    // Calculate text block height first to center logo
    const shopLines = [
      data.shop.shopName,
      data.shop.shopAddress,
      data.shop.phone ? `Mobile: ${data.shop.phone}` : null,
      data.shop.email ? `Email: ${data.shop.email}` : null,
      `GSTIN: ${data.shop.gstNumber}  |  State: ${data.shop.state}`,
    ].filter(Boolean);
    const textBlockH = 24 + (shopLines.length - 1) * 13 + 8;

    if (fs.existsSync(logoPath)) {
      const logoH = Math.min(logoW, textBlockH);
      const logoTopY = headerStartY + (textBlockH - logoH) / 2;
      doc.image(logoPath, L, logoTopY, { width: logoW, height: logoH });
    }

    // Shop details on the right
    let dy = headerStartY;
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000")
       .text(data.shop.shopName, detailX, dy, { width: detailW });
    dy += 24;

    doc.font("Helvetica").fontSize(9).fillColor("#333333")
       .text(data.shop.shopAddress, detailX, dy, { width: detailW });
    dy += 14;

    if (data.shop.phone) {
      doc.font("Helvetica").fontSize(9).fillColor("#333333")
         .text(`Mobile: ${data.shop.phone}`, detailX, dy, { width: detailW });
      dy += 13;
    }
    if (data.shop.email) {
      doc.font("Helvetica").fontSize(9).fillColor("#333333")
         .text(`Email: ${data.shop.email}`, detailX, dy, { width: detailW });
      dy += 13;
    }

    doc.font("Helvetica").fontSize(9).fillColor("#333333")
       .text(`GSTIN: ${data.shop.gstNumber}  |  State: ${data.shop.state}`, detailX, dy, { width: detailW });
    dy += 13;

    // Use the taller of logo or text block
    y = Math.max(headerStartY + logoW, dy) + 8;

    hline(doc, L, y, R, "#000000", 1.5);
    y += 4;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
       .text("Tax Invoice", L, y, { width: W, align: "center" });
    y += 16;

    hline(doc, L, y, R, "#000000", 1.5);
    y += 0;

    // ═══════════════════════════════════════════════════════
    // RECEIVER + OTHER DETAILS (two column box)
    // ═══════════════════════════════════════════════════════
    const midX = L + W * 0.55;
    const sectionStartY = y;

    // Left column header
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
       .text("Detail of Receiver (Billed to)", L + 4, y + 4, { width: midX - L - 8 });

    // Right column header
    doc.font("Helvetica-Bold").fontSize(8)
       .text("Other Details", midX + 4, y + 4, { width: R - midX - 8 });

    y += 18;
    hline(doc, L, y, R, "#000000", 0.5);
    y += 5;

    // Left: Receiver info
    const lx = L + 4;
    const lw = midX - L - 8;
    let ly = y;

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
       .text(data.customerName, lx, ly, { width: lw });
    ly += 14;

    if (data.customerAddress) {
      doc.font("Helvetica").fontSize(8.5).fillColor("#333333")
         .text(data.customerAddress, lx, ly, { width: lw });
      ly += doc.heightOfString(data.customerAddress, { width: lw }) + 4;
    }

    if (data.customerGstin) {
      doc.font("Helvetica").fontSize(8.5).fillColor("#333333");
      doc.text("GSTIN  :  " + data.customerGstin, lx, ly, { width: lw });
      ly += 12;
    }



    // Right: Invoice details
    const rx = midX + 4;
    const rw = R - midX - 8;
    let ry = y;

    const rightDetails: [string, string][] = [
      ["Invoice No", data.invoiceNumber],
      ["Invoice Date", data.invoiceDate],
      ["Terms of Payment", "On Delivery"],
      ["Currency", "INR"],
    ];

    doc.font("Helvetica").fontSize(8.5).fillColor("#333333");
    for (const [label, value] of rightDetails) {
      doc.font("Helvetica-Bold").text(`${label}: `, rx, ry, { continued: true, width: rw });
      doc.font("Helvetica").text(value, { width: rw });
      ry += 14;
    }

    y = Math.max(ly, ry) + 8;

    // Draw box around receiver section
    box(doc, L, sectionStartY, W, y - sectionStartY, "#000000", 0.5);
    vline(doc, midX, sectionStartY, y, "#000000", 0.5);
    hline(doc, L, sectionStartY + 18, R, "#000000", 0.5);

    y += 0;

    // ═══════════════════════════════════════════════════════
    // ITEMS TABLE
    // ═══════════════════════════════════════════════════════
    const tableStartY = y;

    type Align = "left" | "right" | "center";
    const cols: { label: string; x: number; w: number; align: Align }[] = [
      { label: "Sr.",          x: L,     w: 18,  align: "center" },
      { label: "Description", x: L+18,  w: 118, align: "left"   },
      { label: "HSN",         x: L+136, w: 42,  align: "center" },
      { label: "Net Wt",      x: L+178, w: 38,  align: "right"  },
      { label: "Rate/g",      x: L+216, w: 44,  align: "right"  },
      { label: "Metal Cost",  x: L+260, w: 48,  align: "right"  },
      { label: "Gemstone",    x: L+308, w: 48,  align: "right"  },
      { label: "Amount",      x: L+356, w: 46,  align: "right"  },
      { label: "Making",      x: L+402, w: 44,  align: "right"  },
      { label: "Subtotal",    x: L+446, w: 89,  align: "right"  },
    ];

    // Header row
    doc.rect(L, y, W, 18).fillColor("#f0f0f0").fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
    cols.forEach(c => {
      doc.text(c.label, c.x + 2, y + 5, { width: c.w - 4, align: c.align, lineBreak: false });
    });
    y += 18;

    hline(doc, L, y, R, "#000000", 0.5);

    // Draw column dividers in header
    cols.slice(1).forEach(c => {
      vline(doc, c.x, tableStartY, y, "#aaaaaa", 0.3);
    });

    // Item rows
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const rowStartY = y;
      const descH = doc.heightOfString(item.description, { width: cols[1].w - 4 });
      const rowH = Math.max(descH + 8, 20);

      if (i % 2 === 1) {
        doc.rect(L, y, W, rowH).fillColor("#fafafa").fill();
      }

      const gemstone = item.gemstonePrice ? parseFloat(String(item.gemstonePrice)) : 0;
      const amount = parseFloat(String(item.amount)); // metal + gemstone
      const metalCost = amount - gemstone;            // derived metal cost
      const making = parseFloat(String(item.makingChargeAmount));

      const vals: string[] = [
        String(i + 1),
        item.description,
        item.hsnCode ?? "—",
        fmtW(item.netWeight),
        item.sellingPricePerGram ? fmt(item.sellingPricePerGram) : "—",
        metalCost > 0 ? fmt(metalCost) : "—",
        gemstone > 0 ? fmt(gemstone) : "—",
        fmt(amount),
        fmt(making),
        fmt(amount + making),
      ];

      doc.font("Helvetica").fontSize(8.5).fillColor("#000000");
      vals.forEach((v, ci) => {
        const c = cols[ci];
        doc.text(v, c.x + 2, y + 4, { width: c.w - 4, align: c.align, lineBreak: false });
      });

      y += rowH;
      hline(doc, L, y, R, "#dddddd", 0.3);

      // Column dividers
      cols.slice(1).forEach(c => {
        vline(doc, c.x, rowStartY, y, "#dddddd", 0.3);
      });
    }

    hline(doc, L, y, R, "#000000", 0.5);

    // Draw outer box for table
    box(doc, L, tableStartY, W, y - tableStartY, "#000000", 0.5);

    y += 0;

    // ═══════════════════════════════════════════════════════
    // TOTALS SECTION
    // ═══════════════════════════════════════════════════════
    const totSectionY = y;
    const totMidX = L + W * 0.55;
    const totLX = totMidX + 4;
    const totVX = R - 82;
    const totLW = totVX - totLX - 4;
    const totVW = 80;

    const gstJewel = parseFloat(data.gstJewelTotal);
    const gstMaking = parseFloat(data.gstMakingTotal);
    const subtotal = parseFloat(data.subtotalAmount);
    const making = parseFloat(data.makingChargesTotal);
    const grandTotal = parseFloat(data.totalAmount);

    // TOTAL = sum of (amount + making) per item; amount already includes gemstone
    const rowSubtotalsSum = data.items.reduce((acc, item) => {
      const amount = parseFloat(String(item.amount));
      const making = parseFloat(String(item.makingChargeAmount));
      return acc + amount + making;
    }, 0);

    const totRows: [string, string, boolean][] = [
      ["TOTAL", fmt(rowSubtotalsSum), false],
      [`CGST @ 1.5% (Jewellery)`, fmt(gstJewel / 2), false],
      [`SGST @ 1.5% (Jewellery)`, fmt(gstJewel / 2), false],
      [`CGST @ 2.5% (Making)`, fmt(gstMaking / 2), false],
      [`SGST @ 2.5% (Making)`, fmt(gstMaking / 2), false],
    ];

    let ty = y + 5;
    doc.font("Helvetica").fontSize(8.5).fillColor("#333333");
    for (const [label, val, bold] of totRows) {
      if (bold) doc.font("Helvetica-Bold").fillColor("#000000");
      else doc.font("Helvetica").fillColor("#333333");
      doc.text(label, totLX, ty, { width: totLW, align: "left", lineBreak: false });
      doc.text(val, totVX, ty, { width: totVW, align: "right", lineBreak: false });
      ty += 14;
    }

    // Grand Total row
    ty += 2;
    hline(doc, totMidX, ty, R, "#000000", 0.5);
    ty += 4;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
       .text("GRAND TOTAL", totLX, ty, { width: totLW, align: "left", lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
       .text(fmt(grandTotal), totVX, ty, { width: totVW, align: "right", lineBreak: false });
    ty += 16;

    const totSectionH = ty - totSectionY;

    // Draw box around totals
    box(doc, totMidX, totSectionY, R - totMidX, totSectionH, "#000000", 0.5);

    y = totSectionY + totSectionH;

    // ═══════════════════════════════════════════════════════
    // AMOUNT IN WORDS
    // ═══════════════════════════════════════════════════════
    const wordsY = y;
    const wordsH = 22;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
       .text("Total Invoice Amount (In Words): ", L + 4, y + 7, { continued: true, width: W - 8 });
    doc.font("Helvetica").fontSize(8).fillColor("#000000")
       .text(amountInWords(grandTotal), { width: W - 8 });

    y += wordsH;
    box(doc, L, wordsY, W, wordsH, "#000000", 0.5);

    // ═══════════════════════════════════════════════════════
    // BOTTOM SECTION — QR (left) + Declaration + Signature (right)
    // ═══════════════════════════════════════════════════════
    const botStartY = y;
    const botMidX = L + W * 0.45;
    const botH = 140;

    // Left: QR Code
    const qrPath = path.join(__dirname, "../qr-code.jpg");
    const qrSize = 90;
    const qrX = L + (botMidX - L) / 2 - qrSize / 2;

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000")
       .text("Scan & Pay via UPI", L + 4, y + 6, { width: botMidX - L - 8, align: "center" });
    y += 20;

    if (fs.existsSync(qrPath)) {
      doc.image(qrPath, qrX, y, { width: qrSize, height: qrSize });
    }

    doc.font("Helvetica").fontSize(7.5).fillColor("#444444")
       .text(`UPI: ${data.shop.upiId}`, L + 4, y + qrSize + 4, { width: botMidX - L - 8, align: "center" });

    // Right: Declaration + Signature
    let ry2 = botStartY + 6;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
       .text("Declaration", botMidX + 4, ry2, { width: R - botMidX - 8 });
    ry2 += 12;

    doc.font("Helvetica").fontSize(7.5).fillColor("#333333")
       .text(
         "Certified that all the particulars shown in the above tax invoice are true and correct and that our registration under CGST Act 2017 is valid as on the date of this invoice.",
         botMidX + 4, ry2, { width: R - botMidX - 8 }
       );
    ry2 += 46;

    doc.font("Helvetica").fontSize(8.5).fillColor("#333333")
       .text(`For ${data.shop.shopName}`, botMidX + 4, ry2, { width: R - botMidX - 8 });
    ry2 += 30;

    hline(doc, botMidX + 4, ry2, botMidX + 4 + 120, "#000000", 0.5);
    ry2 += 5;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000")
       .text("Authorised Signatory", botMidX + 4, ry2, { width: R - botMidX - 8 });

    const finalBotY = botStartY + botH;
    box(doc, L, botStartY, W, botH, "#000000", 0.5);
    vline(doc, botMidX, botStartY, finalBotY, "#000000", 0.5);
    hline(doc, L, botStartY, R, "#000000", 0.5);

    y = finalBotY;

    // ═══════════════════════════════════════════════════════
    // TERMS & CONDITIONS
    // ═══════════════════════════════════════════════════════
    const termsStartY = y;
    y += 6;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
       .text("Terms & Conditions:- ", L + 4, y, { continued: true, width: W - 8 });
    doc.font("Helvetica").fontSize(7.5).fillColor("#333333")
       .text(
         "1. Goods once sold will not be taken back.  2. All disputes are subject to Delhi jurisdiction.  3. This is a Computer Generated Invoice.  4. Prices are inclusive of GST as itemized above.  5. Please check the goods at the time of purchase.",
         { width: W - 8 }
       );
    y += 20;

    hline(doc, L, y, R, "#000000", 0.5);
    y += 5;

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#333333")
       .text("SUBJECT TO DELHI NCR JURISDICTION", L, y, { width: W / 2, align: "left" });
    doc.font("Helvetica").fontSize(7.5).fillColor("#333333")
       .text("This is a Computer Generated Invoice", L + W / 2, y, { width: W / 2, align: "right" });

    box(doc, L, termsStartY, W, y + 12 - termsStartY, "#000000", 0.5);

    doc.end();
  });
}
