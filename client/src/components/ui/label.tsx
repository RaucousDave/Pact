import type { ComponentProps } from "react";

// shadcn/ui Label, using the app's typography.
export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return <label data-slot="label" className={`pact-label ${className}`} {...props} />;
}
