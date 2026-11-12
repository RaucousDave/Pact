import type { ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import "./controls.css";

// shadcn/ui Checkbox, using the same Radix composition as the other controls.
export function Checkbox({ className = "", ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={`pact-checkbox ${className}`} {...props}>
    <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="pact-checkbox-indicator"><Check size={14} /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}
