import { iso } from "@/lib/format";

export type DayState = "open" | "school" | "booked" | "past";

/** Month grids starting Monday. `stateOf` decides how each day looks. */
export function MonthGrid({ year, month, stateOf, selected, dayProps }: {
  year: number; month: number;
  stateOf: (d: string) => DayState;
  selected?: [string, string];
  dayProps?: (d: string, s: DayState) => Record<string, string | undefined>;
}) {
  const first = new Date(year, month, 1), pad = (first.getDay() + 6) % 7, nd = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push(<div key={`p${i}`} />);
  for (let i = 1; i <= nd; i++) {
    const d = iso(new Date(year, month, i)), s = stateOf(d);
    const cls = ["day", s === "school" ? "blk" : s === "booked" ? "bkd" : s === "past" ? "past" : "", selected && d >= selected[0] && d <= selected[1] ? "sel" : ""].join(" ");
    cells.push(<div key={d} className={cls} title={d} {...(dayProps?.(d, s) ?? {})}>{i}</div>);
  }
  return (
    <div>
      <div className="cal-h">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
      <div className="cal-g">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="dow">{d}</div>)}{cells}</div>
    </div>
  );
}

export function Legend({ selected }: { selected?: boolean }) {
  return (
    <div className="legend">
      <span><i style={{ background: "var(--ok-soft)", border: "1px solid #bfe2cc" }} />Free</span>
      <span><i style={{ background: "repeating-linear-gradient(135deg,#dfe2e6 0 3px,#f6f7f9 3px 6px)" }} />School use</span>
      <span><i style={{ background: "var(--ink)" }} />Booked</span>
      {selected ? <span><i style={{ outline: "2px solid var(--accent)", outlineOffset: -2 }} />Your dates</span> : null}
    </div>
  );
}

export function nextMonths(fromIso: string, n: number) {
  const [y, m] = fromIso.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => { const d = new Date(y, m - 1 + i, 1); return [d.getFullYear(), d.getMonth()] as [number, number]; });
}
