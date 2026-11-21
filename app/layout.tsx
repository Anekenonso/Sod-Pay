import type { Metadata } from "next";
import "./globals.css";
import { TariProvider } from "@/lib/tari/provider";
import { WalletProvider } from "@/components/wallet/WalletContext";
import { ToastProvider } from "@/components/ui/Toast";
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
        <TariProvider>
          <WalletProvider>
            <ToastProvider>
              <Navbar />
              <div className="flex-1">{children}</div>
              <Footer />
            </ToastProvider>
          </WalletProvider>
        </TariProvider>
      </body>
    </html>
  );
}
