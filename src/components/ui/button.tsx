"use client";

import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

const buttonVariants = {
  default:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 bg-transparent hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost: "hover:bg-slate-100 focus-visible:ring-slate-400",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-base rounded-md",
  icon: "h-10 w-10 rounded-md p-0 [&>svg]:h-4 [&>svg]:w-4",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      const mergedProps = {
        ref,
        className: cn(
          baseStyles,
          buttonVariants[variant],
          buttonSizes[size],
          child.props.className,
          className
        ),
        disabled: isDisabled,
        "aria-busy": loading,
        children: (
          <>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {(child.props as { children?: ReactNode }).children}
          </>
        ),
      };
      return cloneElement(child, mergedProps as Record<string, unknown>);
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(baseStyles, buttonVariants[variant], buttonSizes[size], className)}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
