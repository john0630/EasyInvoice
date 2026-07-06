import type { LineItemInput } from "@easy-invoice/shared";
import {
  formatAmount,
  LINE_ITEM_MONTHS,
  lineItemYearOptions,
} from "@easy-invoice/shared";
import {
  applyLineItemPreset,
  findLineItemPreset,
  notePresetLabel,
  type SavedLineItemPreset,
} from "@/lib/localCatalog";
import { defaultLineItem } from "@/lib/documentDefaults";

type Props = {
  items: LineItemInput[];
  currency: string;
  onChange: (items: LineItemInput[]) => void;
  lineItemPresets?: SavedLineItemPreset[];
};

const cellInput =
  "w-full px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30";

const descriptionInput = `${cellInput} resize-y min-h-[4.5rem] leading-snug`;

const yearOptions = lineItemYearOptions();

function descriptionRows(text: string) {
  const lines = text.split("\n").length;
  return Math.max(2, Math.min(lines, 8));
}

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
    onChange([...items, defaultLineItem(items[0]?.tax_rate_percent ?? 0)]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const descriptionOptions = lineItemPresets.map((p) => ({
    id: p.id,
    label: `${notePresetLabel(p.description)} (${formatAmount(p.unit_price)})`,
  }));

  const applyPreset = (index: number, preset: SavedLineItemPreset) => {
    update(index, applyLineItemPreset(items[index], preset));
  };

  const handlePresetSelect = (
    index: number,
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const id = e.target.value;
    if (!id) return;
    const preset = lineItemPresets.find((p) => p.id === id);
    if (preset) applyPreset(index, preset);
    e.target.value = "";
  };

  const handleDescriptionBlur = (index: number, description: string) => {
    const preset =
      findLineItemPreset(description) ??
      lineItemPresets.find(
        (p) => p.description.toLowerCase() === description.trim().toLowerCase(),
      );
    if (preset) applyPreset(index, preset);
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
          Pick a saved description from the dropdown — price and tax fill in automatically.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2 font-medium min-w-[12rem]">Description</th>
              <th className="p-2 font-medium w-16">Qty</th>
              <th className="p-2 font-medium w-24">Price ({currency})</th>
              <th className="p-2 font-medium w-16">Tax %</th>
              <th className="p-2 font-medium w-16">Disc %</th>
              <th className="p-2 font-medium w-24 text-right">Total ({currency})</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const lineTotal =
                item.quantity * item.unit_price * (1 - item.discount_percent / 100);
              return (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="p-1 min-w-[12rem]">
                    <div className="space-y-1">
                      {lineItemPresets.length > 0 && (
                        <select
                          className={`${cellInput} text-slate-500`}
                          defaultValue=""
                          onChange={(e) => handlePresetSelect(i, e)}
                        >
                          <option value="">— Pick saved description —</option>
                          {descriptionOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <textarea
                        className={descriptionInput}
                        value={item.description}
                        rows={descriptionRows(item.description)}
                        onChange={(e) => update(i, { description: e.target.value })}
                        onBlur={(e) => handleDescriptionBlur(i, e.target.value)}
                        placeholder="Item description"
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          className={`${cellInput} text-slate-500`}
                          value={item.period_month ?? ""}
                          onChange={(e) =>
                            update(i, {
                              period_month: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        >
                          <option value="">Month (optional)</option>
                          {LINE_ITEM_MONTHS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className={`${cellInput} text-slate-500`}
                          value={item.period_year ?? ""}
                          onChange={(e) =>
                            update(i, {
                              period_year: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        >
                          <option value="">Year (optional)</option>
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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
                    {formatAmount(lineTotal)}
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
