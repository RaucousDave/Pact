-- Commission offers are separate from commissions, which stores escrow orders.
CREATE TABLE commission_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(60) NOT NULL,
    description VARCHAR(300) NOT NULL,
    price_usdc NUMERIC(12, 7) NOT NULL CHECK (price_usdc > 0 AND price_usdc <= 10000),
    delivery_days INTEGER NOT NULL CHECK (delivery_days BETWEEN 1 AND 90),
    review_days INTEGER NOT NULL DEFAULT 3 CHECK (review_days BETWEEN 1 AND 90),
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX commission_offers_creator_created_at_idx
    ON commission_offers (creator_id, created_at DESC);
