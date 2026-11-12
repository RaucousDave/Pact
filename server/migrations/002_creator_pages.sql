CREATE TABLE creator_pages (
    creator_id INTEGER PRIMARY KEY REFERENCES creators(id) ON DELETE CASCADE,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
