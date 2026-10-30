import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-soft hover:bg-accent hover:border-border-strong hover:text-accent-foreground",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent hover:border-border-strong",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        ai: "bg-gradient-ai text-ai-contrast shadow-ai hover:brightness-105 hover:-translate-y-px active:translate-y-0 transition-all",
        "ai-outline":
          "border border-ai/40 bg-ai-soft text-ai-foreground hover:bg-ai-soft/60 hover:border-ai/70",
        "ai-ghost": "text-ai-foreground hover:bg-ai-soft",
        "ghost-danger": "text-muted-foreground hover:bg-destructive-soft hover:text-destructive",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 rounded-md px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
