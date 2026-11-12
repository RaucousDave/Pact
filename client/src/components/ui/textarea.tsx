import type { ComponentProps } from "react";
import "./controls.css";

// shadcn/ui Textarea adapted to Pact's shared control tokens.
export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={`pact-input pact-textarea ${className}`} {...props} />;
}
