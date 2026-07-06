import { z } from "zod";
import type { DocumentKind } from "./types";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  tax_rate_percent: z.number().min(0).max(100),
  discount_percent: z.number().min(0).max(100),
  period_month: z.number().int().min(1).max(12).optional(),
  period_year: z.number().int().min(1900).max(2100).optional(),
});

const baseDocumentSchema = z.object({
  number: z.string(),
  issue_date: z.string().min(1, "Issue date is required"),
  currency: z.string().length(3),
  notes: z.string(),
  template_id: z.enum(["classic", "minimal", "modern"]),
  buyer_name: z.string().min(1, "Buyer name is required"),
  buyer_address: z.string(),
  buyer_email: z.string().email().or(z.literal("")),
  line_items: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
});

const proformaSchema = baseDocumentSchema.extend({
  kind: z.literal("proforma"),
  valid_until: z.string().optional(),
});

const invoiceSchema = baseDocumentSchema.extend({
  kind: z.literal("invoice"),
  show_due_info: z.boolean().optional(),
  due_date: z.string().optional(),
  payment_terms: z.string().optional(),
});

const receiptSchema = baseDocumentSchema.extend({
  kind: z.literal("receipt"),
  paid_at: z.string().min(1, "Payment date is required"),
  payment_method: z.enum(["cash", "card", "transfer", "check", "other"]),
  amount_paid: z.number().min(0),
  source_document_id: z.string().uuid().optional().or(z.literal("")),
});

export const documentSchema = z
  .discriminatedUnion("kind", [proformaSchema, invoiceSchema, receiptSchema])
  .superRefine((data, ctx) => {
    if (data.kind === "invoice" && data.show_due_info === true && !data.due_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date is required",
        path: ["due_date"],
      });
    }
  });

export function validateDocument(data: unknown, kind: DocumentKind) {
  const withKind = { ...(data as object), kind };
  return documentSchema.safeParse(withKind);
}
