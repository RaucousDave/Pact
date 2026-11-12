import { useId, useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "./input";
import { Slider } from "./slider";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "./popover";

const swatches = [
  "#f8f7f2",
  "#fffefa",
  "#292c25",
  "#66685e",
  "#ff754a",
  "#245c46",
  "#e6eddf",
  "#cce87c",
  "#242037",
  "#c2a4ff",
  "#f5f0ff",
  "#706384",
];

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [hex, setHex] = useState(value);
  const invalid = !/^#[0-9a-f]{6}$/i.test(hex);
  const channels = [1, 3, 5].map((offset) =>
    parseInt(value.slice(offset, offset + 2), 16),
  );
  function choose(next: string) {
    setHex(next);
    onChange(next);
  }
  return (
    <div className="studio-color">
      <span id={id}>{label}</span>
      <Popover
        onOpenChange={(open) => {
          if (open) setHex(value);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="pact-color-trigger"
            aria-label={`Choose ${label.toLowerCase()}, current color ${value}`}
          >
            <code>{value.toUpperCase()}</code>
            <span style={{ background: value }} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          <div className="pact-picker-heading">
            <strong>{label}</strong>
            <PopoverClose
              className="pact-picker-close"
              aria-label="Close color picker"
            >
              <X size={16} />
            </PopoverClose>
          </div>
          <div className="pact-color-swatches" aria-label="Pact palette">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                aria-pressed={value.toLowerCase() === color}
                style={{ background: color }}
                onClick={() => choose(color)}
              >
                {value.toLowerCase() === color && <Check size={14} />}
              </button>
            ))}
          </div>
          <label className="pact-picker-label" htmlFor={`${id}-hex`}>
            Hex color
          </label>
          <Input
            id={`${id}-hex`}
            value={hex}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setHex(next);
              if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next);
            }}
          />
          {invalid && (
            <p id={`${id}-error`} className="pact-picker-error">
              Use # followed by six hex digits.
            </p>
          )}
          {(["Red", "Green", "Blue"] as const).map((channel, index) => (
            <div className="pact-color-channel" key={channel}>
              <label htmlFor={`${id}-${channel}`}>
                {channel}
                <span>{channels[index]}</span>
              </label>
              <Slider
                id={`${id}-${channel}`}
                aria-label={channel}
                min={0}
                max={255}
                step={1}
                value={[channels[index]]}
                onValueChange={([next]) => {
                  const updated = channels.map((v, i) =>
                    i === index ? next : v,
                  );
                  choose(
                    "#" +
                      updated
                        .map((v) => v.toString(16).padStart(2, "0"))
                        .join(""),
                  );
                }}
              />
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
