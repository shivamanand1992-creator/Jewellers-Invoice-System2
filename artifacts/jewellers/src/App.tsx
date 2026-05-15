import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import InvoicesList from "@/pages/invoices/list";
import InvoiceNew from "@/pages/invoices/new";
import InvoiceShow from "@/pages/invoices/show";
import Profile from "@/pages/profile";
import SignIn from "@/pages/sign-in";
import { isLoggedIn } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth";

// Wire JWT token to every API request
setAuthTokenGetter(() => getToken());

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  if (!isLoggedIn()) return <Redirect to="/sign-in" />;
  return <Component />;
}

function HomeRedirect() {
  if (isLoggedIn()) return <Redirect to="/dashboard" />;
  return <Home />;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/invoices/new" component={() => <ProtectedRoute component={InvoiceNew} />} />
        <Route path="/invoices/:id" component={() => <ProtectedRoute component={InvoiceShow} />} />
        <Route path="/invoices" component={() => <ProtectedRoute component={InvoicesList} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AppRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
