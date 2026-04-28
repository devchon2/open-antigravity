import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open-Antigravity | Agent Manager",
  description: "The Open-Source Universal AI Gateway for Agentic Development",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen overflow-hidden flex flex-col">{children}</body>
    </html>
  );
}
