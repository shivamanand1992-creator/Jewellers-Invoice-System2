import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  listInvoices,
  getListInvoicesUrl,
  useDeleteInvoice,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatIndianCurrency, formatDate } from "@/lib/format";
import { PlusCircle, Search, Trash2, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InvoicesList() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: [getListInvoicesUrl()],
    queryFn: () => listInvoices(),
  });

  const { mutate: deleteInvoice, isPending: deleting } = useDeleteInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [getListInvoicesUrl()] });
        toast({ title: "Invoice deleted successfully" });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete invoice", variant: "destructive" });
      },
    },
  });

  const filtered = (invoices ?? []).filter(
    (inv) =>
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-0.5">All your GST invoices</p>
          </div>
          <Link href="/invoices/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or invoice number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground mx-auto">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {search ? "No invoices found" : "No invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? "Try a different search term"
                  : "Create your first GST invoice to get started"}
              </p>
            </div>
            {!search && (
              <Link href="/invoices/new">
                <Button variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">{inv.invoiceNumber}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.customerName}</p>
                      {inv.customerGstin && (
                        <p className="text-xs text-muted-foreground">{inv.customerGstin}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatIndianCurrency(Number(inv.totalAmount))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(inv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteInvoice({ id: deleteId })}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
