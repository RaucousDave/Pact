import type { ComponentProps } from "react";

// shadcn/ui Button adapted to Pact's existing button tokens.
export function Button({ className = "", variant = "default", type = "button", ...props }: ComponentProps<"button"> & { variant?: "default" | "outline" }) {
  return <button data-slot="button" type={type} className={`button ${variant === "outline" ? "button-outline" : "button-primary"} ${className}`} {...props} />;
}
