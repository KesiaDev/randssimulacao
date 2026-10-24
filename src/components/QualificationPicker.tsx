import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUALIFICATIONS, qualificationValue, type Qualification } from "@/lib/proposal-qualification";

export function QualificationPicker({ value, onChange, disabled, label }: {
  value: string | undefined;
  onChange?: (value: Qualification) => void;
  disabled?: boolean;
  label: string;
}) {
  const selected = qualificationValue(value);
  const option = QUALIFICATIONS.find((item) => item.value === selected) ?? QUALIFICATIONS[0];
  if (!onChange) return <span className="inline-flex items-center gap-2 text-sm"><span aria-hidden>{option.symbol}</span>{option.label}</span>;
  return (
    <Select value={selected} onValueChange={(next) => onChange(qualificationValue(next))} disabled={disabled === true}>
      <SelectTrigger aria-label={label} className="h-9 w-full sm:w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        {QUALIFICATIONS.map((item) => <SelectItem key={item.value} value={item.value}><span aria-hidden>{item.symbol}</span> {item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}