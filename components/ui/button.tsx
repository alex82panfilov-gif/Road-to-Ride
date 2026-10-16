import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const styles = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "bg-canvas-secondary text-ink hover:opacity-80",
  ghost: "bg-transparent text-ink hover:bg-canvas-secondary",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "primary", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-opacity duration-150 disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
