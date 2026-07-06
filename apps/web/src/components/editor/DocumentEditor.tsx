import type { ReactNode } from "react";
import type { DocumentFormData } from "@easy-invoice/shared";
import { KIND_LABELS } from "@easy-invoice/shared";
import { CURRENCIES } from "@/lib/localSettings";
import { LineItemsTable } from "./LineItemsTable";
import { NotesEditor } from "./NotesEditor";
import { Switch } from "@/components/Switch";
import { hasNotesContent } from "@easy-invoice/shared";
import {
  notePresetLabel,
  type SavedBusiness,
  type SavedBuyer,
  type SavedLineItemPreset,
  type SavedNotePreset,
  type SellerInfo,
} from "@/lib/localCatalog";

type Props = {
  form: DocumentFormData;
  seller: SellerInfo;
  onChange: (form: DocumentFormData) => void;
  localMode?: boolean;
  businesses?: SavedBusiness[];
  activeBusinessId?: string;
  onSelectBusiness?: (id: string) => void;
  onAddBusiness?: () => void;
  onSellerChange?: (seller: SellerInfo) => void;
  buyers?: SavedBuyer[];
  onSelectBuyer?: (buyer: SavedBuyer) => void;
  lineItemPresets?: SavedLineItemPreset[];
  notePresets?: SavedNotePreset[];
  onSelectNote?: (note: SavedNotePreset) => void;
  onSaveNote?: (text: string) => void;
  nextNumberPreview?: string;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm";

export function DocumentEditor({
  form,
  seller,
  onChange,
  localMode,
  businesses = [],
  activeBusinessId,
  onSelectBusiness,
  onAddBusiness,
  onSellerChange,
  buyers = [],
  onSelectBuyer,
  lineItemPresets = [],
  notePresets = [],
  onSelectNote,
  onSaveNote,
  nextNumberPreview,
}: Props) {
  const patch = (p: Partial<DocumentFormData>) => onChange({ ...form, ...p });

  const patchSeller = (p: Partial<SellerInfo>) => {
    onSellerChange?.({ ...seller, ...p });
  };

  const handleBuyerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const buyer = buyers.find((b) => b.id === id);
    if (buyer) onSelectBuyer?.(buyer);
  };

  const handleNoteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const note = notePresets.find((n) => n.id === id);
    if (note) onSelectNote?.(note);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="bg-brand text-white text-xs font-bold px-2 py-1 rounded uppercase">
          {KIND_LABELS[form.kind]}
        </span>
        {form.number && (
          <span className="text-sm text-slate-500">#{form.number}</span>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">From (Seller)</h3>
          {localMode && onAddBusiness && (
            <button
              type="button"
              onClick={onAddBusiness}
              className="text-xs text-brand font-medium hover:text-brand-dark"
            >
              + New business
            </button>
          )}
        </div>

        {localMode && businesses.length > 0 && onSelectBusiness && (
          <Field label="Saved business">
            <select
              className={inputClass}
              value={activeBusinessId ?? ""}
              onChange={(e) => onSelectBusiness(e.target.value)}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Unnamed business"}
                </option>
              ))}
            </select>
          </Field>
        )}

        {localMode && onSellerChange ? (
          <div className="space-y-3">
            <Field label="Business name">
              <input
                className={inputClass}
                value={seller.seller_name}
                onChange={(e) => patchSeller({ seller_name: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <textarea
                className={inputClass}
                rows={2}
                value={seller.seller_address}
                onChange={(e) => patchSeller({ seller_address: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={seller.seller_email}
                  onChange={(e) => patchSeller({ seller_email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={seller.seller_phone}
                  onChange={(e) => patchSeller({ seller_phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Tax ID">
              <input
                className={inputClass}
                value={seller.seller_tax_id}
                onChange={(e) => patchSeller({ seller_tax_id: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
            <p className="font-medium text-slate-800">{seller.seller_name || "—"}</p>
            <p>{seller.seller_address}</p>
            <p>{seller.seller_email}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-slate-800">Buyer</h3>

        {localMode && buyers.length > 0 && onSelectBuyer && (
          <Field label="Saved buyer">
            <select
              className={inputClass}
              defaultValue=""
              onChange={handleBuyerSelect}
            >
              <option value="">— Enter new buyer —</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.email ? ` (${b.email})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.buyer_name}
              onChange={(e) => patch({ buyer_name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.buyer_email}
              onChange={(e) => patch({ buyer_email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Address">
          <textarea
            className={inputClass}
            rows={2}
            value={form.buyer_address}
            onChange={(e) => patch({ buyer_address: e.target.value })}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-slate-800">Details</h3>
        <Field label="Document number">
          <input
            className={inputClass}
            value={form.number}
            onChange={(e) => patch({ number: e.target.value })}
            placeholder={
              nextNumberPreview
                ? `Auto: ${nextNumberPreview}`
                : "Leave blank to auto-assign"
            }
          />
          {nextNumberPreview && !form.number && (
            <p className="text-xs text-slate-400 mt-1">
              Next number: {nextNumberPreview}. Change prefix in Settings → Defaults.
            </p>
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Issue Date">
            <input
              type="date"
              className={inputClass}
              value={form.issue_date}
              onChange={(e) => patch({ issue_date: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              className={inputClass}
              value={form.currency}
              onChange={(e) => patch({ currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Template">
            <select
              className={inputClass}
              value={form.template_id}
              onChange={(e) =>
                patch({
                  template_id: e.target.value as DocumentFormData["template_id"],
                })
              }
            >
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
              <option value="modern">Modern</option>
            </select>
          </Field>
        </div>

        {form.kind === "invoice" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Due date & payment terms
                </p>
                <p className="text-xs text-slate-400">
                  Show on invoice preview and PDF
                </p>
              </div>
              <Switch
                label="Due date and payment terms"
                checked={form.show_due_info === true}
                onChange={(checked) => patch({ show_due_info: checked })}
              />
            </div>
            {form.show_due_info === true && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Due Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.due_date ?? ""}
                    onChange={(e) => patch({ due_date: e.target.value })}
                  />
                </Field>
                <Field label="Payment Terms">
                  <input
                    className={inputClass}
                    value={form.payment_terms ?? ""}
                    onChange={(e) => patch({ payment_terms: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {form.kind === "proforma" && (
          <Field label="Valid Until">
            <input
              type="date"
              className={inputClass}
              value={form.valid_until ?? ""}
              onChange={(e) => patch({ valid_until: e.target.value })}
            />
          </Field>
        )}

        {form.kind === "receipt" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid On">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.paid_at?.slice(0, 16) ?? ""}
                onChange={(e) =>
                  patch({ paid_at: new Date(e.target.value).toISOString() })
                }
              />
            </Field>
            <Field label="Payment Method">
              <select
                className={inputClass}
                value={form.payment_method ?? "transfer"}
                onChange={(e) =>
                  patch({
                    payment_method: e.target.value as DocumentFormData["payment_method"],
                  })
                }
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Amount Paid">
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={form.amount_paid ?? 0}
                onChange={(e) => patch({ amount_paid: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}
      </section>

      <LineItemsTable
        items={form.line_items}
        currency={form.currency}
        onChange={(line_items) => patch({ line_items })}
        lineItemPresets={localMode ? lineItemPresets : undefined}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Notes
          </span>
          {localMode && onSaveNote && (
            <button
              type="button"
              onClick={() => onSaveNote(form.notes)}
              disabled={!hasNotesContent(form.notes)}
              className="text-xs text-brand font-medium hover:text-brand-dark disabled:opacity-40"
            >
              Save note
            </button>
          )}
        </div>
        {localMode && notePresets.length > 0 && onSelectNote && (
          <select
            className={inputClass}
            defaultValue=""
            onChange={handleNoteSelect}
          >
            <option value="">— Select saved note —</option>
            {notePresets.map((n) => (
              <option key={n.id} value={n.id}>
                {notePresetLabel(n.text)}
              </option>
            ))}
          </select>
        )}
        <NotesEditor
          value={form.notes}
          onChange={(notes) => patch({ notes })}
          placeholder="Thank you for your business!"
        />
      </div>
    </div>
  );
}
