import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Wire Clerk's session token into every API request
// This is set up before the app renders; the getter is called lazily per-request
setAuthTokenGetter(async () => {
  // Clerk attaches its session to window.__clerk_client
  const clerk = (window as any).__clerk_client ?? (window as any).Clerk;
  if (!clerk?.session) return null;
  try {
    return await clerk.session.getToken();
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
