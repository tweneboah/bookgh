"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BarInventoryItemsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pos/inventory?department=bar");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-slate-500">Loading BAR inventory…</p>
    </div>
  );
}
