import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  logger.info({ dbHost: dbUrl.replace(/:[^:@]+@/, ":***@").split("@")[1] ?? "unknown" }, "Connecting to database");
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        shop_name TEXT NOT NULL,
        shop_address TEXT NOT NULL,
        gst_number TEXT NOT NULL,
        upi_id TEXT NOT NULL,
        state TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_address TEXT,
        customer_gstin TEXT,
        invoice_date TEXT NOT NULL,
        subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        making_charges_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        gst_jewel_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        gst_making_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        item_type TEXT,
        description TEXT NOT NULL,
        gross_weight NUMERIC(10,3),
        net_weight NUMERIC(10,3),
        selling_price_per_gram NUMERIC(12,2),
        gemstone_price NUMERIC(12,2),
        amount NUMERIC(12,2) NOT NULL,
        making_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        making_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        gst_jewel NUMERIC(12,2) NOT NULL DEFAULT 0,
        gst_making NUMERIC(12,2) NOT NULL DEFAULT 0,
        item_total NUMERIC(12,2) NOT NULL,
        hsn_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    logger.info("Database migrations completed");
  } catch (err) {
    logger.error({ err }, "Database migration failed");
    throw err;
  } finally {
    client.release();
  }
}
