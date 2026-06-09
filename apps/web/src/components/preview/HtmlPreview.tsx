import {
  calculateTotals,
  DOCUMENT_TITLES,
  formatMoney,
  type DocumentFormData,
} from "@easy-invoice/shared";

type SellerInfo = {
  seller_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  seller_tax_id: string;
  logo_path?: string | null;
};

type Props = {
  form: DocumentFormData;
  seller: SellerInfo;
};

export function HtmlPreview({ form, seller }: Props) {
  const totals = calculateTotals(form.line_items);
  const title = DOCUMENT_TITLES[form.kind];
  const money = (n: number) => formatMoney(n, form.currency);

  const templateClass =
    form.template_id === "modern"
      ? "border-t-4 border-brand"
      : form.template_id === "minimal"
        ? "font-light"
        : "border border-slate-200";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-8 min-h-[600px] print:shadow-none ${templateClass}`}
      id="document-preview"
    >
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
          {form.number && (
            <p className="text-slate-500 mt-1">#{form.number}</p>
          )}
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Issue Date</p>
          <p className="font-medium text-slate-800">
            {new Date(form.issue_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-400 mb-1">From</p>
          <p className="font-semibold">{seller.seller_name}</p>
          <p className="text-slate-600 whitespace-pre-line">{seller.seller_address}</p>
          <p className="text-slate-600">{seller.seller_email}</p>
          {seller.seller_phone && <p className="text-slate-600">{seller.seller_phone}</p>}
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400 mb-1">Bill To</p>
          <p className="font-semibold">{form.buyer_name || "—"}</p>
          <p className="text-slate-600 whitespace-pre-line">{form.buyer_address}</p>
          <p className="text-slate-600">{form.buyer_email}</p>
        </div>
      </div>

      <KindMeta form={form} />

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-left">
            <th className="p-2 font-medium">Description</th>
            <th className="p-2 font-medium text-right">Qty</th>
            <th className="p-2 font-medium text-right">Price</th>
            <th className="p-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {form.line_items.map((item, i) => {
            const line =
              item.quantity * item.unit_price * (1 - item.discount_percent / 100);
            return (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{item.description || "—"}</td>
                <td className="p-2 text-right">{item.quantity}</td>
                <td className="p-2 text-right">{money(item.unit_price)}</td>
                <td className="p-2 text-right font-medium">{money(line)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-48 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          {totals.discount_total > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span>-{money(totals.discount_total)}</span>
            </div>
          )}
          {totals.tax_total > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{money(totals.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
            <span>{form.kind === "receipt" ? "Paid" : "Total"}</span>
            <span>
              {money(
                form.kind === "receipt"
                  ? (form.amount_paid ?? totals.grand_total)
                  : totals.grand_total,
              )}
            </span>
          </div>
        </div>
      </div>

      {form.notes && (
        <div className="mt-8 pt-4 border-t border-slate-100 text-sm text-slate-600">
          <p className="text-xs uppercase text-slate-400 mb-1">Notes</p>
          <p className="whitespace-pre-line">{form.notes}</p>
        </div>
      )}
    </div>
  );
}

function KindMeta({ form }: { form: DocumentFormData }) {
  if (form.kind === "invoice") {
    return (
      <div className="mb-4 text-sm text-slate-600">
        {form.due_date && (
          <p>
            Due: {new Date(form.due_date).toLocaleDateString()}
            {form.payment_terms ? ` · ${form.payment_terms}` : ""}
          </p>
        )}
      </div>
    );
  }
  if (form.kind === "proforma" && form.valid_until) {
    return (
      <div className="mb-4 text-sm text-slate-600">
        <p>Valid until: {new Date(form.valid_until).toLocaleDateString()}</p>
      </div>
    );
  }
  if (form.kind === "receipt") {
    return (
      <div className="mb-4 text-sm text-slate-600">
        {form.paid_at && (
          <p>Paid: {new Date(form.paid_at).toLocaleString()}</p>
        )}
        {form.payment_method && <p>Method: {form.payment_method}</p>}
      </div>
    );
  }
  return null;
}
