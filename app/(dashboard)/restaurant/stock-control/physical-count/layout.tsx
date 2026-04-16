import { Inter, Manrope } from "next/font/google";
import type { Metadata } from "next";
import "./physical-count-m3.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-physical-count-headline",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Physical Stock Count - Amos Royal Inventory",
};

export default function PhysicalStockCountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`physical-count-m3 min-h-full bg-[#f7f9fb] text-[#191c1e] selection:bg-[#ff6b00] selection:text-[#572000] ${manrope.variable} ${inter.className}`}
    >
      {children}
    </div>
  );
}
