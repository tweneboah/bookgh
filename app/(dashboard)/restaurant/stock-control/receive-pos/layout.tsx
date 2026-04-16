import { Inter, Manrope } from "next/font/google";
import type { Metadata } from "next";
import "./receive-pos-m3.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-receive-pos-headline",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Receive Purchase Orders | Amos Royal Inventory",
};

export default function RestaurantReceivePosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`receive-pos-m3 min-h-full bg-[#f7f9fb] text-[#191c1e] selection:bg-[#ff6b00] selection:text-[#572000] ${manrope.variable} ${inter.className}`}
    >
      {children}
    </div>
  );
}
