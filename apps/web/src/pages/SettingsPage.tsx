import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatMoney } from "@easy-invoice/shared";
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
        { key: "contacts" as const, label: "Buyers & Items" },
      ]
    : [{ key: "general" as const, label: "Business" }];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-slate-500 text-sm mb-6">
        {localMode
          ? "Manage defaults, saved businesses, buyers, and line items."
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
          </div>

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
              {b.id === catalog.activeBusinessId && (
                <span className="text-xs text-brand">Active business</span>
              )}
            </div>
          ))}
        </div>
      )}

      {localMode && tab === "contacts" && (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold mb-3">Saved buyers</h2>
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
            <h2 className="font-semibold mb-3">Saved line items</h2>
            {catalog.lineItemPresets.length === 0 ? (
              <p className="text-sm text-slate-500">
                Line item descriptions are saved when you save a document.
              </p>
            ) : (
              <div className="space-y-2">
                {catalog.lineItemPresets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{p.description}</p>
                      <p className="text-slate-500">
                        {formatMoney(p.unit_price, form.currency ?? DEFAULT_CURRENCY)} · Tax{" "}
                        {p.tax_rate_percent}%
                      </p>
                    </div>
                    <button
                      onClick={() => catalog.removeLineItemPreset(p.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
