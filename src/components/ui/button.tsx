import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * One button for the whole app. Every variant shares the same motion:
 * hover lifts 1px, press scales down, focus shows the ring. `outline` inverts
 * on hover (ink fills the button), so secondary actions still feel responsive.
 */
const buttonVariants = cva(
  [
    "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]",
    "[&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-elev-1 hover:bg-primary/90 hover:shadow-elev-2 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-elev-1",
        outline:
          "border border-input bg-card text-foreground shadow-elev-1 hover:border-foreground hover:bg-foreground hover:text-background hover:shadow-elev-2 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background",
        ghost:
          "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white shadow-elev-1 hover:bg-destructive/90 hover:shadow-elev-2",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      // Default to type="button" so buttons inside forms never submit by accident.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
