import { Router, type IRouter } from "express";
import { requireAuth } from "@clerk/express";
import { eq, and, desc } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, profilesTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  GetInvoiceParams,
  DeleteInvoiceParams,
  DownloadInvoicePdfParams,
  GetInvoiceResponse,
  ListInvoicesResponse,
} from "@workspace/api-zod";
import { generateInvoicePdf } from "../lib/pdf";

const router: IRouter = Router();

router.get("/invoices", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(ListInvoicesResponse.parse(invoices));
});

router.post("/invoices", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, customerAddress, customerGstin, invoiceDate, items } = parsed.data;

  const existingCount = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId));
  const nextNum = (existingCount.length + 1).toString().padStart(3, "0");
  const invoiceNumber = `INV-${nextNum}`;

  let subtotalAmount = 0;
  let makingChargesTotal = 0;
  let gstJewelTotal = 0;
  let gstMakingTotal = 0;

  for (const item of items) {
    subtotalAmount += item.amount;
    makingChargesTotal += item.makingChargeAmount;
    gstJewelTotal += item.gstJewel;
    gstMakingTotal += item.gstMaking;
  }

  const totalAmount = subtotalAmount + makingChargesTotal + gstJewelTotal + gstMakingTotal;

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      userId,
      invoiceNumber,
      customerName,
      customerAddress: customerAddress ?? null,
      customerGstin: customerGstin ?? null,
      invoiceDate,
      subtotalAmount: subtotalAmount.toFixed(2),
      makingChargesTotal: makingChargesTotal.toFixed(2),
      gstJewelTotal: gstJewelTotal.toFixed(2),
      gstMakingTotal: gstMakingTotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    })
    .returning();

  const insertedItems = await db
    .insert(invoiceItemsTable)
    .values(
      items.map((item) => ({
        invoiceId: invoice.id,
        itemType: item.itemType ?? null,
        description: item.description,
        grossWeight: item.grossWeight != null ? item.grossWeight.toFixed(3) : null,
        netWeight: item.netWeight != null ? item.netWeight.toFixed(3) : null,
        sellingPricePerGram: item.sellingPricePerGram != null ? item.sellingPricePerGram.toFixed(2) : null,
        gemstonePrice: item.gemstonePrice != null ? item.gemstonePrice.toFixed(2) : null,
        amount: item.amount.toFixed(2),
        makingChargePercent: item.makingChargePercent.toFixed(2),
        makingChargeAmount: item.makingChargeAmount.toFixed(2),
        gstJewel: item.gstJewel.toFixed(2),
        gstMaking: item.gstMaking.toFixed(2),
        itemTotal: item.itemTotal.toFixed(2),
        hsnCode: item.hsnCode ?? null,
      })),
    )
    .returning();

  res.status(201).json(
    GetInvoiceResponse.parse({ ...invoice, items: insertedItems }),
  );
});

router.get("/invoices/:id", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, userId)));

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoice.id));

  res.json(GetInvoiceResponse.parse({ ...invoice, items }));
});

router.delete("/invoices/:id", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/invoices/:id/pdf", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const params = DownloadInvoicePdfParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, userId)));

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoice.id));

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  const shopDetails = profile ?? {
    shopName: "S.S. JEWELLERS",
    shopAddress: "Delhi",
    gstNumber: "N/A",
    upiId: "N/A",
    state: "Delhi",
    phone: null,
    email: null,
  };

  const pdfBuffer = await generateInvoicePdf({
    ...invoice,
    items,
    shop: shopDetails,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
  );
  res.send(pdfBuffer);
});

export default router;
