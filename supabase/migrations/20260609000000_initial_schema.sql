-- EasyInvoice initial schema

CREATE TYPE document_kind AS ENUM ('proforma', 'invoice', 'receipt');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'MYR',
  invoice_prefix text NOT NULL DEFAULT 'INV',
  proforma_prefix text NOT NULL DEFAULT 'PRO',
  receipt_prefix text NOT NULL DEFAULT 'RCP',
  next_invoice_number int NOT NULL DEFAULT 1,
  next_proforma_number int NOT NULL DEFAULT 1,
  next_receipt_number int NOT NULL DEFAULT 1,
  default_tax_rate numeric NOT NULL DEFAULT 0,
  seller_name text NOT NULL DEFAULT '',
  seller_address text NOT NULL DEFAULT '',
  seller_email text NOT NULL DEFAULT '',
  seller_phone text NOT NULL DEFAULT '',
  seller_tax_id text NOT NULL DEFAULT '',
  logo_path text
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind document_kind NOT NULL,
  number text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'MYR',
  notes text NOT NULL DEFAULT '',
  template_id text NOT NULL DEFAULT 'classic',
  buyer_name text NOT NULL DEFAULT '',
  buyer_address text NOT NULL DEFAULT '',
  buyer_email text NOT NULL DEFAULT '',
  valid_until date,
  due_date date,
  payment_terms text,
  paid_at timestamptz,
  payment_method text,
  amount_paid numeric,
  source_document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  discount_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate_percent numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0
);

CREATE INDEX documents_org_idx ON documents(organization_id);
CREATE INDEX documents_updated_idx ON documents(updated_at DESC);
CREATE INDEX line_items_doc_idx ON line_items(document_id);

-- Assign document number atomically
CREATE OR REPLACE FUNCTION assign_document_number(p_org_id uuid, p_kind document_kind)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_num int;
  v_result text;
BEGIN
  IF p_kind = 'invoice' THEN
    UPDATE organization_settings
    SET next_invoice_number = next_invoice_number + 1
    WHERE organization_id = p_org_id
    RETURNING invoice_prefix, next_invoice_number - 1 INTO v_prefix, v_num;
  ELSIF p_kind = 'proforma' THEN
    UPDATE organization_settings
    SET next_proforma_number = next_proforma_number + 1
    WHERE organization_id = p_org_id
    RETURNING proforma_prefix, next_proforma_number - 1 INTO v_prefix, v_num;
  ELSE
    UPDATE organization_settings
    SET next_receipt_number = next_receipt_number + 1
    WHERE organization_id = p_org_id
    RETURNING receipt_prefix, next_receipt_number - 1 INTO v_prefix, v_num;
  END IF;

  v_result := v_prefix || '-' || lpad(v_num::text, 4, '0');
  RETURN v_result;
END;
$$;

-- Onboarding trigger for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
BEGIN
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    split_part(NEW.email, '@', 1) || '''s Business'
  );

  INSERT INTO organizations (name) VALUES (v_org_name) RETURNING id INTO v_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  INSERT INTO organization_settings (organization_id, seller_email, seller_name)
  VALUES (v_org_id, COALESCE(NEW.email, ''), v_org_name);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "Members read own orgs"
  ON organizations FOR SELECT
  USING (id IN (SELECT user_org_ids()));

CREATE POLICY "Members read memberships"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Owners/admins manage members"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members read settings"
  ON organization_settings FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Owners/admins update settings"
  ON organization_settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members read documents"
  ON documents FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Members insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT user_org_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "Members update documents"
  ON documents FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Members delete documents"
  ON documents FOR DELETE
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Members read line items"
  ON line_items FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE organization_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Members insert line items"
  ON line_items FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE organization_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Members update line items"
  ON line_items FOR UPDATE
  USING (
    document_id IN (
      SELECT id FROM documents WHERE organization_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Members delete line items"
  ON line_items FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM documents WHERE organization_id IN (SELECT user_org_ids())
    )
  );

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_org_ids())
  );

CREATE POLICY "Members update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_org_ids())
  );

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');
