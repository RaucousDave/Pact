// shadcn/ui Slider composition, with Pact's tokens and a single labelled thumb.
import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import "./controls.css";

export function Slider({
  className = "",
  id,
  "aria-label": label,
  "aria-labelledby": labelledBy,
  "aria-valuetext": valueText,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={`pact-slider ${className}`}
      {...props}
    >
      <SliderPrimitive.Track className="pact-slider-track">
        <SliderPrimitive.Range className="pact-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        id={id}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-valuetext={valueText}
        className="pact-slider-thumb"
      />
    </SliderPrimitive.Root>
  );
}
