export function DateControl({
  value,
  onChange,
  label = '日期',
  min = '1900-01-01',
  max = '2100-12-31',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="date-control">
      {label}
      <input
        type="date"
        required
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </label>
  );
}
