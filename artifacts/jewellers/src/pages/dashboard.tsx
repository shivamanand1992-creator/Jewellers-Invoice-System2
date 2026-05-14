import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getDashboardStats,
  getGetDashboardStatsQueryKey,
  getMonthlyGst,
  getGetMonthlyGstQueryKey,
  getRecentInvoices,
  getGetRecentInvoicesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIndianCurrency, formatDate } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  TrendingUp,
  Receipt,
  IndianRupee,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: getGetDashboardStatsQueryKey(),
    queryFn: () => getDashboardStats(),
  });

  const { data: monthlyGst, isLoading: gstLoading } = useQuery({
    queryKey: getGetMonthlyGstQueryKey(),
    queryFn: () => getMonthlyGst(),
  });

  const { data: recentInvoices, isLoading: recentLoading } = useQuery({
    queryKey: getGetRecentInvoicesQueryKey(),
    queryFn: () => getRecentInvoices(),
  });

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = (monthlyGst ?? []).map((m) => ({
    name: m.monthName ?? MONTHS[(m.month - 1)] ?? String(m.month),
    "GST Jewel": Number(m.gstJewel),
    "GST Making": Number(m.gstMaking),
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Overview of your invoicing activity</p>
          </div>
          <Link href="/invoices/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Invoices"
            value={statsLoading ? null : String(stats?.totalInvoices ?? 0)}
            icon={<FileText className="h-5 w-5" />}
          />
          <StatCard
            label="Total Sales"
            value={statsLoading ? null : formatIndianCurrency(Number(stats?.totalSales ?? 0))}
            icon={<IndianRupee className="h-5 w-5" />}
          />
          <StatCard
            label="GST Collected"
            value={statsLoading ? null : formatIndianCurrency(Number(stats?.totalGstCollected ?? 0))}
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            label="Making Charges"
            value={statsLoading ? null : formatIndianCurrency(Number(stats?.totalMakingCharges ?? 0))}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="This Month Invoices"
            value={statsLoading ? null : String(stats?.thisMonthInvoices ?? 0)}
            icon={<FileText className="h-5 w-5" />}
          />
          <StatCard
            label="This Month Sales"
            value={statsLoading ? null : formatIndianCurrency(Number(stats?.thisMonthSales ?? 0))}
            icon={<IndianRupee className="h-5 w-5" />}
          />
        </div>

        {/* Monthly GST Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly GST Breakdown ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            {gstLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No GST data yet. Create your first invoice.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    formatter={(value: number) => formatIndianCurrency(value)}
                  />
                  <Bar dataKey="GST Jewel" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="GST Making" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="text-primary">
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !recentInvoices || recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-primary hover:underline">Create your first invoice</Link>
              </div>
            ) : (
              <div className="divide-y">
                {recentInvoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between py-3 hover:bg-accent/40 px-2 -mx-2 rounded transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{inv.customerName}</p>
                        <p className="text-xs text-muted-foreground">{inv.invoiceNumber} &middot; {formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatIndianCurrency(Number(inv.totalAmount))}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">View</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="text-primary bg-primary/10 p-2 rounded-md">{icon}</div>
        </div>
        <div className="mt-3">
          {value === null ? (
            <Skeleton className="h-7 w-24 mb-1" />
          ) : (
            <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
