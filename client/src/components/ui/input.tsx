// shadcn/ui Input adapted to Pact's CSS tokens.
import type { ComponentProps } from "react";
import "./controls.css";

export function Input({
  className = "",
  type,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={`pact-input ${className}`}
      {...props}
    />
  );
}
