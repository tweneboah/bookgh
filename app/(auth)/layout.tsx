"use client";

import { AuthRedirectGuard } from "@/components/layout/auth-redirect-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirectGuard>
      <div className="flex min-h-screen w-full items-center justify-center bg-white">
        {children}
      </div>
    </AuthRedirectGuard>
  );
}
