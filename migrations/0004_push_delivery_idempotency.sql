ALTER TABLE push_installations
  ADD COLUMN last_success_date_key TEXT;

ALTER TABLE push_installations
  ADD COLUMN delivery_claim_date_key TEXT;

ALTER TABLE push_installations
  ADD COLUMN delivery_claimed_at TEXT;
