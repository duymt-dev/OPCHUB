CREATE TABLE regional_payee_banks (
  region region NOT NULL,
  user_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_no TEXT NOT NULL,
  bank_holder TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT regional_payee_banks_pkey PRIMARY KEY (region, user_id),
  CONSTRAINT regional_payee_banks_region_fkey FOREIGN KEY (region)
    REFERENCES regional_directors(region) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT regional_payee_banks_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX regional_payee_banks_user_id_idx ON regional_payee_banks(user_id);

-- No person currently owns an empty slot's account. Never guess for occupied slots.
UPDATE regional_directors SET bank_name=NULL, bank_no=NULL, bank_holder=NULL
WHERE user_id IS NULL;

-- Equality before newest-event range; the historical bank is projection payload.
CREATE INDEX regional_director_events_payee_bank ON regional_director_events
  (region, user_id, action, created_at DESC, id DESC) INCLUDE(bank_snapshot);
