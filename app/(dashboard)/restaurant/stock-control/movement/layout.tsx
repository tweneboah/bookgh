import { Inter, Manrope } from "next/font/google";
import "./movement-m3.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-stock-movement-headline",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function RestaurantStockMovementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`stock-movement-m3 min-h-full bg-[#f7f9fb] text-[#191c1e] ${manrope.variable} ${inter.className}`}
    >
      {children}
    </div>
  );
}
