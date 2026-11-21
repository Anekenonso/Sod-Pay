import type { Metadata } from "next";
import "./globals.css";
import { DemoProvider } from "@/components/demo/DemoProvider";
import { WalletProvider } from "@/components/wallet/WalletContext";
import { ToastProvider } from "@/components/ui/Toast";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

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
      <body className="antialiased min-h-screen flex flex-col bg-[#F7F7F5] text-[#111111]">
        <DemoProvider>
          <WalletProvider>
            <ToastProvider>
              <DemoBanner />
              <Navbar />
              <div className="flex-1">{children}</div>
              <Footer />
            </ToastProvider>
          </WalletProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
