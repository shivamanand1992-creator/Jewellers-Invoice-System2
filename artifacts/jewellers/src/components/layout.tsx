import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Receipt,
  PlusCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { clearAuth, getEmail } from "@/lib/auth";
import {
  getDashboardStats,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";

export default function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const email = getEmail();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Fetch stats for invoice count badge (cached, low cost)
  const { data: stats } = useQuery({
    queryKey: getGetDashboardStatsQueryKey(),
    queryFn: () => getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const handleLogout = () => {
    clearAuth();
    setLocation("/sign-in");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/invoices/new", label: "New Invoice", icon: PlusCircle },
    { href: "/invoices", label: "All Invoices", icon: Receipt },
    { href: "/profile", label: "Shop Profile", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <img
            src={`${basePath}/logo-brand.png`}
            alt="S.S. Jewellers"
            className="h-10 w-auto"
          />
          <p className="text-xs text-muted-foreground leading-tight">Invoicing System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/invoices" && stats?.totalInvoices ? (
                    <Badge
                      variant="secondary"
                      className="text-xs h-5 px-1.5 min-w-[1.25rem] justify-center"
                    >
                      {stats.totalInvoices}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold shrink-0">
              {email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden p-3 border-b bg-card flex items-center justify-between">
          <img
            src={`${basePath}/logo-brand.png`}
            alt="S.S. Jewellers"
            className="h-8 w-auto"
          />
        </div>

        {/* Page content — add bottom padding on mobile so bottom nav doesn't overlap */}
        <div className="p-4 pb-20 md:p-8 md:pb-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1"
            >
              <div
                className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/invoices" && stats?.totalInvoices ? (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] leading-none font-bold rounded-full px-1 py-0.5 min-w-[14px] text-center">
                      {stats.totalInvoices > 99 ? "99+" : stats.totalInvoices}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] leading-tight font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
