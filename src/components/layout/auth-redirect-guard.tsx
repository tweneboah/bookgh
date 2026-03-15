"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#5a189a]" />
    </div>
  );
}

export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const redirect = searchParams.get("redirect");
    // Full page navigation to leave auth pages cleanly
    window.location.href = redirect || "/dashboard";
  }, [isLoading, isAuthenticated, searchParams]);

  // Show loading until we know auth state, or while redirecting after login
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
