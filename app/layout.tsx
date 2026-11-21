import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sod Pay - Private Payment Links on Tari Ootle",
  description: "Amount stays hidden until mutual reveal; only a claim badge unlocks funds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
