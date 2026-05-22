import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  getInvoice,
  getGetInvoiceQueryKey,
  getProfile,
  getGetProfileUrl,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatIndianCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download } from "lucide-react";

// ─── Amount in words (Indian numbering system) ───────────────────────────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n] + " ";
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "") + " ";
  if (n < 1_000) return ONES[Math.floor(n / 100)] + " Hundred " + numWords(n % 100);
  if (n < 1_00_000) return numWords(Math.floor(n / 1_000)) + "Thousand " + numWords(n % 1_000);
  if (n < 1_00_00_000) return numWords(Math.floor(n / 1_00_000)) + "Lakh " + numWords(n % 1_00_000);
  return numWords(Math.floor(n / 1_00_00_000)) + "Crore " + numWords(n % 1_00_00_000);
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = numWords(rupees).trim();
  if (result) result += " Rupees";
  if (paise) result += " and " + numWords(paise).trim() + " Paise";
  return (result || "Zero Rupees") + " Only";
}
// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceShow() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { toast } = useToast();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: getGetInvoiceQueryKey(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: !isNaN(invoiceId),
  });

  const { data: profile } = useQuery({
    queryKey: [getGetProfileUrl()],
    queryFn: () => getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const handleDownloadPdf = async () => {
    const token = getToken();
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Failed to download PDF", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoiceNumber ?? `invoice-${invoiceId}`}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  if (invoiceLoading) {
    return (
      <Layout>
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Invoice not found.</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              Back to Invoices
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const grandTotal = Number(invoice.totalAmount);

  return (
    <Layout>
      <div className="space-y-5 max-w-4xl">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{invoice.invoiceNumber}</h1>
              <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
            </div>
          </div>
          <Button onClick={handleDownloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Invoice document */}
        <div className="bg-card border rounded-lg overflow-hidden print:shadow-none">

          {/* Letterhead */}
          <div className="bg-primary/5 border-b px-6 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={`${basePath}/logo-brand.png`}
                  alt={profile?.shopName ?? "Shop Logo"}
                  className="h-14 w-auto"
                />
                {profile?.shopName && (
                  <div>
                    <p className="font-bold text-lg leading-tight">{profile.shopName}</p>
                    {profile.shopAddress && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                        {profile.shopAddress}
                      </p>
                    )}
                    {profile.gstNumber && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        GSTIN: {profile.gstNumber}
                      </p>
                    )}
                    {profile.phone && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ph: {profile.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Tax Invoice
                </p>
                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                  {invoice.invoiceNumber}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Date: {formatDate(invoice.invoiceDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Bill To / Ship To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-md p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Bill To
                </p>
                <p className="font-semibold text-foreground">{invoice.customerName}</p>
                {invoice.customerAddress && (
                  <p className="text-sm text-muted-foreground mt-0.5">{invoice.customerAddress}</p>
                )}
                {invoice.customerGstin && (
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">
                    GSTIN: {invoice.customerGstin}
                  </p>
                )}
              </div>
              {profile?.state && (
                <div className="bg-muted/30 rounded-md p-3 sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Place of Supply
                  </p>
                  <p className="text-sm font-medium">{profile.state}</p>
                  {profile.email && (
                    <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Items Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground rounded-tl-md">
                      Description / HSN
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">
                      Net Wt (g)
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">
                      Rate/g (₹)
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">
                      Jewel Value
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">
                      Making
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">
                      GST
                    </th>
                    <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground rounded-tr-md">
                      Item Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-medium">{item.description}</p>
                        {item.itemType && (
                          <p className="text-xs text-muted-foreground">{item.itemType}</p>
                        )}
                        {item.hsnCode && (
                          <p className="text-xs text-muted-foreground font-mono">
                            HSN: {item.hsnCode}
                          </p>
                        )}
                        {item.grossWeight != null && (
                          <p className="text-xs text-muted-foreground">
                            Gross: {Number(item.grossWeight).toFixed(3)}g
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {item.netWeight != null ? Number(item.netWeight).toFixed(3) : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {item.sellingPricePerGram != null
                          ? formatIndianCurrency(Number(item.sellingPricePerGram))
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatIndianCurrency(Number(item.amount))}
                        {item.gemstonePrice && Number(item.gemstonePrice) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Gem: {formatIndianCurrency(Number(item.gemstonePrice))}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatIndianCurrency(Number(item.makingChargeAmount))}
                        {item.makingChargePercent && Number(item.makingChargePercent) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            @{Number(item.makingChargePercent)}%
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <p>{formatIndianCurrency(Number(item.gstJewel) + Number(item.gstMaking))}</p>
                        <p className="text-xs text-muted-foreground leading-tight">
                          J:3% + M:5%
                        </p>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        {formatIndianCurrency(Number(item.itemTotal) + Number(item.gstJewel) + Number(item.gstMaking))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {/* Amount in words */}
              <div className="sm:max-w-xs">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Amount in Words
                </p>
                <p className="text-sm font-medium text-foreground italic">
                  {amountInWords(grandTotal)}
                </p>
              </div>

              {/* Summary breakdown */}
              <div className="w-full sm:max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jewel Value</span>
                  <span>{formatIndianCurrency(Number(invoice.subtotalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Making Charges</span>
                  <span>{formatIndianCurrency(Number(invoice.makingChargesTotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST on Jewel (3%)</span>
                  <span>{formatIndianCurrency(Number(invoice.gstJewelTotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST on Making (5%)</span>
                  <span>{formatIndianCurrency(Number(invoice.gstMakingTotal))}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatIndianCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Declaration footer */}
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              <p className="font-semibold text-foreground">Declaration</p>
              <p>
                We declare that this invoice shows the actual price of the goods described and that
                all particulars are true and correct. Goods once sold will not be taken back or
                exchanged.
              </p>
              {profile?.shopName && (
                <p className="pt-2 font-medium text-foreground">
                  For {profile.shopName}
                </p>
              )}
              <p className="pt-6 text-muted-foreground">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
