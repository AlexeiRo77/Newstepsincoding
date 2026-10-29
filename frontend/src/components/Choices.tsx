// A row of toggle buttons, one pressed: the option pickers of the interactive pages.
export default function Choices<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [T, string][]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="lp-choices" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}
