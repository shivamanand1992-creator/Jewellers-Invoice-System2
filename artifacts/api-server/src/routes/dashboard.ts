import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from '../middlewares/requireAuth';
import { eq, desc, sql } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetMonthlyGstResponse,
  GetRecentInvoicesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.userId!;

  const allInvoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId));

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  let totalSales = 0;
  let totalGstCollected = 0;
  let totalMakingCharges = 0;
  let thisMonthSales = 0;
  let thisMonthInvoices = 0;

  for (const inv of allInvoices) {
    const total = parseFloat(inv.totalAmount);
    const gst = parseFloat(inv.gstJewelTotal) + parseFloat(inv.gstMakingTotal);
    const making = parseFloat(inv.makingChargesTotal);

    totalSales += total;
    totalGstCollected += gst;
    totalMakingCharges += making;

    const invDate = new Date(inv.createdAt);
    if (invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear) {
      thisMonthSales += total;
      thisMonthInvoices++;
    }
  }

  res.json(
    GetDashboardStatsResponse.parse({
      totalInvoices: allInvoices.length,
      totalSales,
      totalGstCollected,
      totalMakingCharges,
      thisMonthInvoices,
      thisMonthSales,
    }),
  );
});

router.get("/dashboard/monthly-gst", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.userId!;

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const year = now.getFullYear();

  const monthlyMap: Record<number, { gstJewel: number; gstMaking: number; count: number }> = {};

  for (const inv of invoices) {
    const invDate = new Date(inv.createdAt);
    if (invDate.getFullYear() !== year) continue;
    const m = invDate.getMonth();
    if (!monthlyMap[m]) monthlyMap[m] = { gstJewel: 0, gstMaking: 0, count: 0 };
    monthlyMap[m].gstJewel += parseFloat(inv.gstJewelTotal);
    monthlyMap[m].gstMaking += parseFloat(inv.gstMakingTotal);
    monthlyMap[m].count++;
  }

  const result = Object.entries(monthlyMap).map(([monthStr, data]) => {
    const month = parseInt(monthStr);
    return {
      month: month + 1,
      year,
      monthName: monthNames[month],
      gstJewel: data.gstJewel,
      gstMaking: data.gstMaking,
      totalGst: data.gstJewel + data.gstMaking,
      invoiceCount: data.count,
    };
  }).sort((a, b) => a.month - b.month);

  res.json(GetMonthlyGstResponse.parse(result));
});

router.get("/dashboard/recent-invoices", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.userId!;

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId))
    .orderBy(desc(invoicesTable.createdAt))
    .limit(5);

  res.json(GetRecentInvoicesResponse.parse(invoices));
});

export default router;
