import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatAmount, hasNotesContent } from "@easy-invoice/shared";
import { NotesContent } from "@/components/NotesContent";
import { NotesEditor } from "@/components/editor/NotesEditor";
import type { SavedLineItemPreset, SavedNotePreset } from "@/lib/localCatalog";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocalCatalog } from "@/hooks/useLocalCatalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/localSettings";
import type { OrganizationSettings } from "@/lib/supabase";

export function SettingsPage() {
  const { user } = useAuth();
  const { settings, orgId, updateSettings, loading } = useOrganization(user?.id);
  const catalog = useLocalCatalog();
  const localMode = !isSupabaseConfigured;

  const [form, setForm] = useState<Partial<OrganizationSettings>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"general" | "businesses" | "contacts">("general");
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [lineItemDraft, setLineItemDraft] = useState<SavedLineItemPreset | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = async (file: File) => {
    if (!orgId || orgId === "local") {
      toast.error("Logo upload requires Supabase");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    const path = `${orgId}/logo.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, {
      upsert: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await updateSettings({ logo_path: path });
    toast.success("Logo uploaded");
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm";

  const startEditLineItem = (preset: SavedLineItemPreset) => {
    setEditingLineItemId(preset.id);
    setLineItemDraft({ ...preset });
  };

  const cancelEditLineItem = () => {
    setEditingLineItemId(null);
    setLineItemDraft(null);
  };

  const saveLineItem = () => {
    if (!lineItemDraft?.description.trim()) {
      toast.error("Description is required");
      return;
    }
    catalog.saveLineItemPreset(lineItemDraft);
    cancelEditLineItem();
    toast.success("Line item updated");
  };

  const deleteLineItem = (id: string) => {
    if (!confirm("Delete this saved line item?")) return;
    if (editingLineItemId === id) cancelEditLineItem();
    catalog.removeLineItemPreset(id);
    toast.success("Line item removed");
  };

  const startEditNote = (note: SavedNotePreset) => {
    setEditingNoteId(note.id);
    setNoteDraft(note.text);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteDraft("");
  };

  const saveNote = () => {
    if (!editingNoteId) return;
    if (!hasNotesContent(noteDraft)) {
      toast.error("Note cannot be empty");
      return;
    }
    catalog.updateNotePreset(editingNoteId, noteDraft);
    cancelEditNote();
    toast.success("Note updated");
  };

  const deleteNote = (id: string) => {
    if (!confirm("Delete this saved note?")) return;
    if (editingNoteId === id) cancelEditNote();
    catalog.removeNotePreset(id);
    toast.success("Note removed");
  };

  const actionButtonClass = "text-xs font-medium shrink-0";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const tabs = localMode
    ? [
        { key: "general" as const, label: "Defaults" },
        { key: "businesses" as const, label: "Businesses" },
        { key: "contacts" as const, label: "Saved catalog" },
      ]
    : [{ key: "general" as const, label: "Business" }];

  const currency = form.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-slate-500 text-sm mb-6">
        {localMode
          ? "Manage defaults, businesses, and saved buyers, line items, and notes used when creating documents."
          : "Default seller info appears on every new document."}
      </p>

      {localMode && (
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "general" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {!localMode && (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-600">Business name</span>
                <input
                  className={inputClass}
                  value={form.seller_name ?? ""}
                  onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-600">Address</span>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.seller_address ?? ""}
                  onChange={(e) => setForm({ ...form, seller_address: e.target.value })}
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-600">Email</span>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.seller_email ?? ""}
                    onChange={(e) => setForm({ ...form, seller_email: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-600">Phone</span>
                  <input
                    className={inputClass}
                    value={form.seller_phone ?? ""}
                    onChange={(e) => setForm({ ...form, seller_phone: e.target.value })}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-600">Tax ID</span>
                <input
                  className={inputClass}
                  value={form.seller_tax_id ?? ""}
                  onChange={(e) => setForm({ ...form, seller_tax_id: e.target.value })}
                />
              </label>
            </>
          )}

          <div className={`grid sm:grid-cols-2 gap-4 ${localMode ? "" : "pt-4 border-t border-slate-100"}`}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-600">Default currency</span>
              <select
                className={inputClass}
                value={form.currency ?? DEFAULT_CURRENCY}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-600">Default tax rate (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form.default_tax_rate ?? 0}
                onChange={(e) =>
                  setForm({ ...form, default_tax_rate: Number(e.target.value) })
                }
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Document numbering</h3>
            {localMode ? (
              <p className="text-xs text-slate-400">
                Invoice, proforma, and receipt prefixes and counters are configured
                separately for each business under the Businesses tab.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Prefix and next number used when a document number is left blank.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Invoice prefix</span>
                    <input
                      className={inputClass}
                      value={form.invoice_prefix ?? "INV"}
                      onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
                      placeholder="INV"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Proforma prefix</span>
                    <input
                      className={inputClass}
                      value={form.proforma_prefix ?? "PRO"}
                      onChange={(e) => setForm({ ...form, proforma_prefix: e.target.value })}
                      placeholder="PRO"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Receipt prefix</span>
                    <input
                      className={inputClass}
                      value={form.receipt_prefix ?? "RCP"}
                      onChange={(e) => setForm({ ...form, receipt_prefix: e.target.value })}
                      placeholder="RCP"
                    />
                  </label>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Next invoice #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.next_invoice_number ?? 1}
                      onChange={(e) =>
                        setForm({ ...form, next_invoice_number: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Next proforma #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.next_proforma_number ?? 1}
                      onChange={(e) =>
                        setForm({ ...form, next_proforma_number: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-600">Next receipt #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.next_receipt_number ?? 1}
                      onChange={(e) =>
                        setForm({ ...form, next_receipt_number: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          {localMode && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Document editor</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Line items support multiline descriptions, an optional month and year
                (shown on the invoice as{" "}
                <span className="text-slate-600">Description (July 2026)</span>), and saved
                description presets. Notes support rich text formatting and can be saved for
                reuse from the document editor.
              </p>
            </div>
          )}

          {isSupabaseConfigured && (
            <label className="block space-y-1 pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-600">Logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogo(f);
                }}
                className="text-sm"
              />
            </label>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 mt-4"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      )}

      {localMode && tab === "businesses" && (
        <div className="space-y-4">
          <button
            onClick={() => {
              catalog.createBusiness("New Business");
              toast.success("Business added");
            }}
            className="text-sm text-brand font-medium"
          >
            + Add business
          </button>
          {catalog.businesses.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-4 space-y-3 ${
                b.id === catalog.activeBusinessId
                  ? "border-brand ring-1 ring-brand/20"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <input
                  className={inputClass}
                  value={b.name}
                  onChange={(e) =>
                    catalog.saveBusiness({ ...b, name: e.target.value })
                  }
                  placeholder="Business name"
                />
                <div className="flex gap-2 ml-2 shrink-0">
                  {b.id !== catalog.activeBusinessId && (
                    <button
                      onClick={() => catalog.selectBusiness(b.id)}
                      className="text-xs text-brand"
                    >
                      Use
                    </button>
                  )}
                  {catalog.businesses.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm("Delete this business?")) {
                          catalog.removeBusiness(b.id);
                          toast.success("Business removed");
                        }
                      }}
                      className="text-xs text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className={inputClass}
                rows={2}
                value={b.address}
                placeholder="Address"
                onChange={(e) =>
                  catalog.saveBusiness({ ...b, address: e.target.value })
                }
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  value={b.email}
                  placeholder="Email"
                  onChange={(e) =>
                    catalog.saveBusiness({ ...b, email: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  value={b.phone}
                  placeholder="Phone"
                  onChange={(e) =>
                    catalog.saveBusiness({ ...b, phone: e.target.value })
                  }
                />
              </div>
              <input
                className={inputClass}
                value={b.tax_id}
                placeholder="Tax ID"
                onChange={(e) =>
                  catalog.saveBusiness({ ...b, tax_id: e.target.value })
                }
              />
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Document numbering
                </p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Invoice prefix</span>
                    <input
                      className={inputClass}
                      value={b.invoice_prefix}
                      onChange={(e) =>
                        catalog.saveBusiness({ ...b, invoice_prefix: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Proforma prefix</span>
                    <input
                      className={inputClass}
                      value={b.proforma_prefix}
                      onChange={(e) =>
                        catalog.saveBusiness({ ...b, proforma_prefix: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Receipt prefix</span>
                    <input
                      className={inputClass}
                      value={b.receipt_prefix}
                      onChange={(e) =>
                        catalog.saveBusiness({ ...b, receipt_prefix: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Next invoice #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={b.next_invoice_number}
                      onChange={(e) =>
                        catalog.saveBusiness({
                          ...b,
                          next_invoice_number: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Next proforma #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={b.next_proforma_number}
                      onChange={(e) =>
                        catalog.saveBusiness({
                          ...b,
                          next_proforma_number: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Next receipt #</span>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={b.next_receipt_number}
                      onChange={(e) =>
                        catalog.saveBusiness({
                          ...b,
                          next_receipt_number: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              {b.id === catalog.activeBusinessId && (
                <span className="text-xs text-brand">Active business</span>
              )}
            </div>
          ))}
        </div>
      )}

      {localMode && tab === "contacts" && (
        <div className="space-y-8">
          <p className="text-sm text-slate-500">
            Edit or delete entries saved from documents. Line item month and year are set per
            document in the editor and are not stored here.
          </p>

          <section>
            <h2 className="font-semibold mb-1">Saved buyers</h2>
            <p className="text-xs text-slate-400 mb-3">
              Pick from the buyer dropdown when creating a document.
            </p>
            {catalog.buyers.length === 0 ? (
              <p className="text-sm text-slate-500">
                Buyers are saved when you save a document with buyer details.
              </p>
            ) : (
              <div className="space-y-2">
                {catalog.buyers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-slate-500">
                        {b.email}
                        {b.address ? ` · ${b.address}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => catalog.removeBuyer(b.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-1">Saved line items</h2>
            <p className="text-xs text-slate-400 mb-3">
              Stores description, price, and tax. Pick from the line item dropdown in the
              document editor. Add an optional month and year on each row when invoicing for a
              specific period.
            </p>
            {catalog.lineItemPresets.length === 0 ? (
              <p className="text-sm text-slate-500">
                Saved when you save a document, or use &quot;Pick saved description&quot; on a
                line item and save the document.
              </p>
            ) : (
              <div className="space-y-2">
                {catalog.lineItemPresets.map((p) => {
                  const isEditing = editingLineItemId === p.id;
                  const draft = isEditing && lineItemDraft ? lineItemDraft : p;

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-3"
                    >
                      {isEditing ? (
                        <>
                          <textarea
                            className={`${inputClass} min-h-[5rem] resize-y`}
                            value={draft.description}
                            rows={3}
                            onChange={(e) =>
                              setLineItemDraft({ ...draft, description: e.target.value })
                            }
                            placeholder="Description"
                          />
                          <div className="grid sm:grid-cols-2 gap-2">
                            <label className="block space-y-1">
                              <span className="text-xs text-slate-500">
                                Price ({currency})
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                className={inputClass}
                                value={draft.unit_price}
                                onChange={(e) =>
                                  setLineItemDraft({
                                    ...draft,
                                    unit_price: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs text-slate-500">Tax %</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className={inputClass}
                                value={draft.tax_rate_percent}
                                onChange={(e) =>
                                  setLineItemDraft({
                                    ...draft,
                                    tax_rate_percent: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveLineItem}
                              className={`${actionButtonClass} text-brand hover:text-brand-dark`}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditLineItem}
                              className={`${actionButtonClass} text-slate-500 hover:text-slate-700`}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium whitespace-pre-line">{p.description}</p>
                            <p className="text-slate-500 mt-1">
                              Price ({currency}): {formatAmount(p.unit_price)} · Tax{" "}
                              {p.tax_rate_percent}%
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditLineItem(p)}
                              className={`${actionButtonClass} text-brand hover:text-brand-dark`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteLineItem(p.id)}
                              className={`${actionButtonClass} text-red-400 hover:text-red-600`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-1">Saved notes</h2>
            <p className="text-xs text-slate-400 mb-3">
              Rich text notes saved from the document editor. Pick from the notes dropdown or
              use &quot;Save note&quot; while editing a document.
            </p>
            {catalog.notePresets.length === 0 ? (
              <p className="text-sm text-slate-500">
                No saved notes yet. Use &quot;Save note&quot; on a document or save a document
                that includes notes.
              </p>
            ) : (
              <div className="space-y-2">
                {catalog.notePresets.map((n) => {
                  const isEditing = editingNoteId === n.id;

                  return (
                    <div
                      key={n.id}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-3"
                    >
                      {isEditing ? (
                        <>
                          <NotesEditor value={noteDraft} onChange={setNoteDraft} />
                          <div className="flex gap-2">
                            <button
                              onClick={saveNote}
                              className={`${actionButtonClass} text-brand hover:text-brand-dark`}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditNote}
                              className={`${actionButtonClass} text-slate-500 hover:text-slate-700`}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <NotesContent notes={n.text} className="text-slate-600 line-clamp-3" />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditNote(n)}
                              className={`${actionButtonClass} text-brand hover:text-brand-dark`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteNote(n.id)}
                              className={`${actionButtonClass} text-red-400 hover:text-red-600`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
