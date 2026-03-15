"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConferenceAccountingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reports/department?department=conference");
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center bg-white">
      <p className="text-sm text-slate-500">Redirecting to Conference accounting report…</p>
    </div>
  );
}
