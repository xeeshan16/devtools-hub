import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * No `"use client"` here on purpose — this renders fine in a Server Component
 * as long as the consumer that attaches handlers is a Client Component.
 */
const button = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        accent:
          "border-transparent bg-accent text-accent-fg hover:bg-accent-hover",
        outline:
          "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-2",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-foreground",
        danger:
          "border-transparent bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-7 px-2 text-xs",
        md: "h-9 px-3 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
}

export { button as buttonVariants };
