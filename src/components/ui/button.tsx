import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

/**
 * Button, following T3 Code's treatment (MIT, © 2026 T3 Tools Inc.).
 *
 * The thing that makes the primary button read as lit rather than flat is
 * three effects stacked, not a gradient:
 *
 *   1. `inset-shadow-[0_1px_…white/16%]` — a 1px specular highlight along the
 *      top edge, as if a light source is above it.
 *   2. `shadow-primary/24` — an ambient shadow tinted with the button's own
 *      colour instead of black, so it glows onto the surface beneath.
 *   3. `before:` — an inset ring one pixel inside the border, which keeps the
 *      edge crisp against both light and dark backgrounds.
 *
 * On press all three invert or drop: the highlight flips to a dark inset and
 * the shadow disappears, so the control reads as pushed in.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2",
    "whitespace-nowrap rounded-[var(--control-radius)] border font-medium",
    "outline-none transition-[box-shadow,background-color,scale,border-color]",
    "before:pointer-events-none before:absolute before:inset-0",
    "before:rounded-[calc(var(--control-radius)-1px)]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "focus-visible:ring-offset-background",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "h-8 px-[calc(--spacing(3)-1px)] text-sm",
        sm: "h-7 gap-1.5 px-[calc(--spacing(2.5)-1px)] text-sm",
        xs: "h-6 gap-1 px-[calc(--spacing(2)-1px)] text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 px-[calc(--spacing(3.5)-1px)] text-sm",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
      },
      variant: {
        default: [
          "border-primary bg-primary text-primary-foreground",
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)]",
          "shadow-primary/24 shadow-sm",
          "hover:bg-primary/90",
          "active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none",
        ],
        outline: [
          "border-input bg-popover text-foreground shadow-xs",
          "not-disabled:not-active:before:shadow-[0_1px_--theme(--color-black/4%)]",
          "hover:bg-accent/50",
          "dark:bg-input/32 dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/6%)]",
          "dark:hover:bg-input/50",
          "active:shadow-none",
        ],
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80",
        ghost:
          "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive: [
          "border-destructive bg-destructive text-white",
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)]",
          "shadow-destructive/24 shadow-sm",
          "hover:bg-destructive/90",
          "active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none",
        ],
        success: [
          "border-success bg-success text-white",
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)]",
          "shadow-success/24 shadow-sm",
          "hover:bg-success/90",
          "active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none",
        ],
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { buttonVariants };
