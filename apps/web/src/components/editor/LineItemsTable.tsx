import type { LineItemInput } from "@easy-invoice/shared";
import { formatMoney } from "@easy-invoice/shared";
import { ComboField } from "./ComboField";
import {
  applyLineItemPreset,
  findLineItemPreset,
  type SavedLineItemPreset,
} from "@/lib/localCatalog";

type Props = {
  items: LineItemInput[];
  currency: string;
  onChange: (items: LineItemInput[]) => void;
  lineItemPresets?: SavedLineItemPreset[];
};

const cellInput =
  "w-full px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30";

export function LineItemsTable({
  items,
  currency,
  onChange,
  lineItemPresets = [],
}: Props) {
  const update = (index: number, patch: Partial<LineItemInput>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    onChange([
      ...items,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate_percent: items[0]?.tax_rate_percent ?? 0,
        discount_percent: 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const descriptionOptions = lineItemPresets.map((p) => ({
    value: p.description,
    label: `${p.description} (${formatMoney(p.unit_price, currency)})`,
  }));

  const applyPreset = (index: number, description: string) => {
    const preset = findLineItemPreset(description) ??
      lineItemPresets.find(
        (p) => p.description.toLowerCase() === description.trim().toLowerCase(),
      );
    if (preset) {
      update(index, applyLineItemPreset(items[index], preset));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Line Items</h3>
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-brand hover:text-brand-dark font-medium"
        >
          + Add row
        </button>
      </div>
      {lineItemPresets.length > 0 && (
        <p className="text-xs text-slate-400">
          Type or pick a saved description — price and tax fill in automatically.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2 font-medium">Description</th>
              <th className="p-2 font-medium w-16">Qty</th>
              <th className="p-2 font-medium w-24">Price</th>
              <th className="p-2 font-medium w-16">Tax %</th>
              <th className="p-2 font-medium w-16">Disc %</th>
              <th className="p-2 font-medium w-24 text-right">Total</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const lineTotal =
                item.quantity * item.unit_price * (1 - item.discount_percent / 100);
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-1">
                    {lineItemPresets.length > 0 ? (
                      <ComboField
                        value={item.description}
                        onChange={(v) => update(i, { description: v })}
                        onSelectOption={(v) => applyPreset(i, v)}
                        options={descriptionOptions}
                        placeholder="Item description"
                        className={cellInput}
                        listId={`line-desc-${i}`}
                      />
                    ) : (
                      <input
                        className={cellInput}
                        value={item.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        placeholder="Item description"
                      />
                    )}
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={cellInput}
                      value={item.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={cellInput}
                      value={item.unit_price}
                      onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={cellInput}
                      value={item.tax_rate_percent}
                      onChange={(e) =>
                        update(i, { tax_rate_percent: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={cellInput}
                      value={item.discount_percent}
                      onChange={(e) =>
                        update(i, { discount_percent: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2 text-right font-medium text-slate-700">
                    {formatMoney(lineTotal, currency)}
                  </td>
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-slate-400 hover:text-red-500 px-1"
                      title="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
