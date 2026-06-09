import { useId } from "react";

type Option = {
  value: string;
  label?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  listId?: string;
};

const defaultClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm";

export function ComboField({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  className = defaultClass,
  listId,
}: Props) {
  const autoId = useId();
  const datalistId = listId ?? `combo-${autoId.replace(/:/g, "")}`;

  const handleChange = (next: string) => {
    onChange(next);
    const match = options.find(
      (o) => o.value.toLowerCase() === next.trim().toLowerCase(),
    );
    if (match) onSelectOption?.(match.value);
  };

  const handleBlur = () => {
    const match = options.find(
      (o) => o.value.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) onSelectOption?.(match.value);
  };

  return (
    <>
      <input
        className={className}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        list={datalistId}
      />
      <datalist id={datalistId}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </datalist>
    </>
  );
}
