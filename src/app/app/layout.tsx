import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../dashboard.css";
import "@/ui/styles.css";

export const metadata: Metadata = { title: "Worklist" };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
