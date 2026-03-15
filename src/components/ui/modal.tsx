"use client";

import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: keyof typeof modalSizes;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg animate-slide-in max-h-[90vh] flex flex-col",
          modalSizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== "" && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className={cn("overflow-y-auto", title !== "" ? "px-6 py-4" : "")}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
