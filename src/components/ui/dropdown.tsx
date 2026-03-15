"use client";

import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

export interface DropdownItem {
  id: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "left",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMenuStyle(null);
  }, []);

  useLayoutEffect(() => {
    if (!open || !containerRef.current || typeof document === "undefined") return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth ?? 160;
    const left = align === "right" ? rect.right - menuWidth : rect.left;
    setMenuStyle({ top: rect.bottom + 4, left });
    const raf = requestAnimationFrame(() => {
      const m = menuRef.current;
      if (m) {
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - rect.bottom;
        const openUp = spaceBelow < m.offsetHeight && rect.top >= m.offsetHeight;
        setMenuStyle({
          top: openUp ? rect.top - m.offsetHeight - 4 : rect.bottom + 4,
          left: align === "right" ? rect.right - m.offsetWidth : rect.left,
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleClose]);

  const menuContent = open && menuStyle && (
    <ul
      ref={menuRef}
      role="listbox"
      className={cn(
        "fixed z-[100] min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      )}
      style={{ top: menuStyle.top, left: menuStyle.left }}
    >
      {items.map((item) => (
        <li key={item.id} role="option">
          <button
            type="button"
            onClick={() => {
              item.onClick?.();
              handleClose();
            }}
            disabled={item.disabled}
            className={cn(
              "w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
            )}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Open menu"
      >
        {trigger}
        <ChevronDown
          className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>
      {typeof document !== "undefined" && menuContent
        ? createPortal(menuContent, document.body)
        : open && (
            <ul
              role="listbox"
              className={cn(
                "absolute z-50 mt-2 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg",
                align === "left" ? "left-0" : "right-0"
              )}
            >
              {items.map((item) => (
                <li key={item.id} role="option">
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick?.();
                      handleClose();
                    }}
                    disabled={item.disabled}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  );
}
