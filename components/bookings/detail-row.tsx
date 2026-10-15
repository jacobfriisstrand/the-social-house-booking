// One label-and-value row of a booking read-back, inside a <dl>: the
// booking-complete page and the dialog's overview step share it.
export function DetailRow({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? "font-mono" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
