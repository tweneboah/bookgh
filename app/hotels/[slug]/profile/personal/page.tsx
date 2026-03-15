"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePersonalRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/hotels/${slug}/profile?tab=personal`);
  }, [slug, router]);

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center text-slate-600 font-sans">
      Redirecting to profile…
    </div>
  );
}
