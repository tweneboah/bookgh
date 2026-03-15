"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForbiddenProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export function Forbidden({
  title = "Access Denied",
  message = "You don't have permission to view this page. This area is restricted to authorized hotel staff only.",
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: ForbiddenProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-10 w-10 text-red-500" />
        </div>

        <h2 className="mt-6 text-2xl font-bold text-slate-900">{title}</h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {message}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={backHref}>
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Browse Hotels
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
