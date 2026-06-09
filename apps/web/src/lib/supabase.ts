import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as SupabaseClient);

export type DbDocument = {
  id: string;
  organization_id: string;
  kind: "proforma" | "invoice" | "receipt";
  number: string;
  issue_date: string;
  currency: string;
  notes: string;
  template_id: string;
  buyer_name: string;
  buyer_address: string;
  buyer_email: string;
  valid_until: string | null;
  due_date: string | null;
  payment_terms: string | null;
  paid_at: string | null;
  payment_method: string | null;
  amount_paid: number | null;
  source_document_id: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbLineItem = {
  id: string;
  document_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate_percent: number;
  discount_percent: number;
};

export type OrganizationSettings = {
  organization_id: string;
  currency: string;
  invoice_prefix: string;
  proforma_prefix: string;
  receipt_prefix: string;
  next_invoice_number: number;
  next_proforma_number: number;
  next_receipt_number: number;
  default_tax_rate: number;
  seller_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  seller_tax_id: string;
  logo_path: string | null;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};
