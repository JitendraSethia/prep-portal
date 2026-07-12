export interface RankedItem {
  label: string;
  value: number;
  display?: string;
}

/** A simple horizontal ranked-bar list (no chart dependency). */
export function RankedBars({ items }: { items: RankedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="line-clamp-1 text-foreground">{item.label}</span>
            <span className="shrink-0 text-muted-foreground">
              {item.display ?? item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
