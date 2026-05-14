import { Link } from "wouter";
import { Building2, FileText, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <div className="bg-primary/10 p-1.5 rounded-md text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <span className="font-bold text-lg">S.S. Jewellers</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">S.S. Jewellers Invoicing</h1>
            <p className="text-muted-foreground text-lg">
              GST-compliant invoicing for your jewellery business. Create, manage, and download professional invoices in seconds.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <FileText className="h-5 w-5 text-primary mx-auto" />
              <p className="font-medium">GST Invoices</p>
              <p className="text-muted-foreground text-xs">Auto-calculate CGST, SGST &amp; making charges</p>
            </div>
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <BarChart3 className="h-5 w-5 text-primary mx-auto" />
              <p className="font-medium">Dashboard</p>
              <p className="text-muted-foreground text-xs">Monthly sales &amp; GST summaries</p>
            </div>
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <Download className="h-5 w-5 text-primary mx-auto" />
              <p className="font-medium">PDF Export</p>
              <p className="text-muted-foreground text-xs">Download invoices as professional PDFs</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="w-full sm:w-auto min-w-[140px]">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[140px]">Create Account</Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        S.S. Jewellers &mdash; Delhi &mdash; GST Invoicing System
      </footer>
    </div>
  );
}
