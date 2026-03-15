"use client";

import { Suspense } from "react";
import { AuthRedirectGuard } from "@/components/layout/auth-redirect-guard";

export default function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirectGuard>
      <Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center bg-white">Loading…</div>}>
        <div className="flex min-h-screen w-full items-center justify-center bg-white">
          {children}
        </div>
      </Suspense>
    </AuthRedirectGuard>
  );
}
