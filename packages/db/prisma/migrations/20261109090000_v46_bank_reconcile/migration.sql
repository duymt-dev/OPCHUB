-- Prisma create-only reviewed: retain all unrelated hand-written indexes and FK.
ALTER TYPE payment_match_status ADD VALUE 'short';
ALTER TABLE payment_transactions ADD COLUMN short_note TEXT, ADD COLUMN short_by TEXT;
CREATE TABLE bank_webhook_keys (
 id INTEGER NOT NULL DEFAULT 1 PRIMARY KEY CHECK(id=1),
 key_enc BYTEA NOT NULL, hint TEXT NOT NULL CHECK(length(hint)=4),
 rotated_by TEXT, rotated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
INSERT INTO app_settings(key,value,updated_at) VALUES ('bank','{"autoActivate":true}',now()) ON CONFLICT(key) DO NOTHING;
CREATE INDEX payment_transactions_bank_recent ON payment_transactions(received_at DESC,id DESC)
 INCLUDE(match_status) WHERE match_status<>'ignored';
