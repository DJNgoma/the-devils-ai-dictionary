ALTER TABLE push_installations
  ADD COLUMN preferred_delivery_hour INTEGER;

ALTER TABLE push_installations
  ADD COLUMN time_zone TEXT;
