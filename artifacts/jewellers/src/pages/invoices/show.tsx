import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { getInvoice, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatIndianCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, Download } from "lucide-react";

export default function InvoiceShow() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);

  const { data: invoice, isLoading } = useQuery({
    queryKey: getGetInvoiceQueryKey(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: !isNaN(invoiceId),
  });

  const handleDownloadPdf = async () => {
    const token = getToken();
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert("Failed to download PDF"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
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
            <Button variant="outline" className="mt-4">Back to Invoices</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Invoice Body */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Top bar */}
          <div className="bg-primary/5 border-b px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo-brand.png" alt="S.S. Jewellers" className="h-14 w-auto" />
              <p className="text-xs text-muted-foreground">Tax Invoice</p>
            </div>
            <Badge variant="outline" className="font-mono text-sm px-3 py-1">{invoice.invoiceNumber}</Badge>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Bill To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Bill To</p>
                <p className="font-semibold text-foreground">{invoice.customerName}</p>
                {invoice.customerAddress && <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>}
                {invoice.customerGstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {invoice.customerGstin}</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Invoice Date</p>
                <p className="text-sm font-medium">{formatDate(invoice.invoiceDate)}</p>
              </div>
            </div>

            <Separator />

            {/* Items Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold text-muted-foreground">Description</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Wt (g)</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Rate/g</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Making</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">GST</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{item.description}</p>
                        {item.itemType && <p className="text-xs text-muted-foreground">{item.itemType}</p>}
                        {item.hsnCode && <p className="text-xs text-muted-foreground">HSN: {item.hsnCode}</p>}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {item.netWeight != null ? Number(item.netWeight).toFixed(3) : "—"}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {item.sellingPricePerGram != null ? formatIndianCurrency(Number(item.sellingPricePerGram)) : "—"}
                      </td>
                      <td className="py-3 text-right">{formatIndianCurrency(Number(item.amount))}</td>
                      <td className="py-3 text-right">{formatIndianCurrency(Number(item.makingChargeAmount))}</td>
                      <td className="py-3 text-right">
                        <p>{formatIndianCurrency(Number(item.gstJewel) + Number(item.gstMaking))}</p>
                        <p className="text-xs text-muted-foreground">
                          J:{formatIndianCurrency(Number(item.gstJewel))} M:{formatIndianCurrency(Number(item.gstMaking))}
                        </p>
                      </td>
                      <td className="py-3 text-right font-semibold">{formatIndianCurrency(Number(item.itemTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (Jewel Value)</span>
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
                  <span>Total</span>
                  <span className="text-primary">{formatIndianCurrency(Number(invoice.totalAmount))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
