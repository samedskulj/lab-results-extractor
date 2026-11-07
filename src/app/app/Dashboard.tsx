"use client";

import dynamic from "next/dynamic";
import { StrictMode } from "react";

// The dashboard is a browser-only app (local storage, Supabase session), so it renders on the client only.
const Shell = dynamic(
  async () => {
    const [{ App }, { AuthGate }] = await Promise.all([import("@/App"), import("@/auth/AuthGate")]);
    return function Shell() {
      return (
        <AuthGate>
          <App />
        </AuthGate>
      );
    };
  },
  { ssr: false },
);

export function Dashboard() {
  return (
    <StrictMode>
      <Shell />
    </StrictMode>
  );
}
