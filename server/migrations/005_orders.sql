CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id UUID NOT NULL REFERENCES commission_offers(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    client_public_key TEXT NOT NULL,
    client_name VARCHAR(40) NOT NULL,
    client_contact VARCHAR(80),
    client_note VARCHAR(500),
    price_usdc NUMERIC(12, 7) NOT NULL CHECK (price_usdc > 0 AND price_usdc <= 10000),
    delivery_days INTEGER NOT NULL CHECK (delivery_days BETWEEN 1 AND 90),
    contract_id TEXT,
    expected_fund_hash TEXT,
    status TEXT NOT NULL DEFAULT 'preparing'
        CHECK (status IN ('preparing', 'deployed', 'funded', 'failed')),
    funded_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS expected_fund_hash TEXT;

CREATE INDEX IF NOT EXISTS orders_creator_created_at_idx
    ON orders (creator_id, created_at DESC);
