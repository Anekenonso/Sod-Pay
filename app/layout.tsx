import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TariProvider } from "@/lib/tari/provider";
import { WalletProvider } from "@/components/wallet/WalletContext";
import { ToastProvider } from "@/components/ui/Toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sod Pay — Private Payment Links on Tari Ootle",
  description: "Amount stays hidden until mutual reveal; only a claim badge unlocks funds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-[#F7F7F5] text-[#111111]">
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
