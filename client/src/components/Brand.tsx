import { Link } from "react-router-dom";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand${light ? " brand-light" : ""}`}
      aria-label="Pact home"
    >
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      pact<span className="brand-dot">.</span>
    </Link>
  );
}

export function TestnetBadge({ light = false }: { light?: boolean }) {
  return (
    <span className={`testnet-badge${light ? " badge-light" : ""}`}>
      <span />
      Testnet demo
    </span>
  );
}
