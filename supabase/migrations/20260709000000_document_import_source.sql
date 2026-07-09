ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS import_source text;
