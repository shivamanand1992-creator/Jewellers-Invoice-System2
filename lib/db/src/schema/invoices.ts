import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address"),
  customerGstin: text("customer_gstin"),
  invoiceDate: text("invoice_date").notNull(),
  subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  makingChargesTotal: numeric("making_charges_total", { precision: 12, scale: 2 }).notNull().default("0"),
  gstJewelTotal: numeric("gst_jewel_total", { precision: 12, scale: 2 }).notNull().default("0"),
  gstMakingTotal: numeric("gst_making_total", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  itemType: text("item_type"),
  description: text("description").notNull(),
  grossWeight: numeric("gross_weight", { precision: 10, scale: 3 }),
  netWeight: numeric("net_weight", { precision: 10, scale: 3 }),
  sellingPricePerGram: numeric("selling_price_per_gram", { precision: 12, scale: 2 }),
  gemstonePrice: numeric("gemstone_price", { precision: 12, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  makingChargePercent: numeric("making_charge_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  makingChargeAmount: numeric("making_charge_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  gstJewel: numeric("gst_jewel", { precision: 12, scale: 2 }).notNull().default("0"),
  gstMaking: numeric("gst_making", { precision: 12, scale: 2 }).notNull().default("0"),
  itemTotal: numeric("item_total", { precision: 12, scale: 2 }).notNull(),
  hsnCode: text("hsn_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const insertInvoiceItemSchema = createInsertSchema(invoiceItemsTable).omit({ id: true, createdAt: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
