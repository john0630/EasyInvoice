ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS period_month int,
  ADD COLUMN IF NOT EXISTS period_year int;
