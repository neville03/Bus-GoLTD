"use client";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MonthGrid, Legend, nextMonths, type DayState } from "./Calendar";
import { addDays, toDate } from "@/lib/format";

/** Tap or drag across days to block them for school use, or open them again. */
export function AvailabilityEditor({ busId, today, blocked, booked }: { busId: string; today: string; blocked: string[]; booked: string[] }) {
  const [set, setSet] = useState(() => new Set(blocked));
  const [offset, setOffset] = useState(0);
  const [msg, setMsg] = useState("");
  const drag = useRef<{ mode: "block" | "open"; days: Set<string> } | null>(null);
  const bookedSet = new Set(booked);
  const stateOf = (d: string): DayState => (d <= today ? "past" : bookedSet.has(d) ? "booked" : set.has(d) ? "school" : "open");

  async function commit(mode: "block" | "open", days: string[]) {
    if (!days.length) return;
    const sb = supabaseBrowser();
    const { error } = mode === "block"
      ? await sb.from("blackouts").upsert(days.map((day) => ({ bus_id: busId, day })), { ignoreDuplicates: true })
      : await sb.from("blackouts").delete().eq("bus_id", busId).in("day", days);
    setMsg(error ? "Couldn't save. Check your connection and try again." : `${days.length} day${days.length > 1 ? "s" : ""} ${mode === "block" ? "kept for school use" : "opened for hire"}.`);
  }
  function paint(d: string) {
    const g = drag.current; if (!g || g.days.has(d) || stateOf(d) === "past" || stateOf(d) === "booked") return;
    g.days.add(d);
    setSet((s) => { const n = new Set(s); g.mode === "block" ? n.add(d) : n.delete(d); return n; });
  }
  function start(e: React.PointerEvent) {
    const d = (e.target as HTMLElement).closest<HTMLElement>("[data-day]")?.dataset.day; if (!d) return;
    const s = stateOf(d); if (s === "past" || s === "booked") return;
    e.preventDefault();
    drag.current = { mode: s === "school" ? "open" : "block", days: new Set() };
    paint(d);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-day]");
    if (el?.dataset.day) paint(el.dataset.day);
  }
  function end() { const g = drag.current; drag.current = null; if (g) commit(g.mode, [...g.days]); }

  async function quick(kind: "weekdays" | "clear") {
    const all: string[] = []; for (let d = addDays(today, 1); d <= addDays(today, 90); d = addDays(d, 1)) all.push(d);
    if (kind === "weekdays") {
      const days = all.filter((d) => { const w = toDate(d).getDay(); return w >= 1 && w <= 5 && !bookedSet.has(d) && !set.has(d); });
      setSet((s) => new Set([...s, ...days])); await commit("block", days);
    } else {
      const days = all.filter((d) => set.has(d));
      setSet((s) => { const n = new Set(s); days.forEach((d) => n.delete(d)); return n; }); await commit("open", days);
    }
  }
  const months = nextMonths(today, 4).slice(offset, offset + 2);
  return (
    <div className="stack">
      <div className="row between">
        <p className="small muted">Tap or drag across days to keep them for school use. Free days can be booked.</p>
        <div className="row"><button type="button" className="btn sm" disabled={offset === 0} onClick={() => setOffset(0)} aria-label="Earlier months">‹</button><button type="button" className="btn sm" disabled={offset === 2} onClick={() => setOffset(2)} aria-label="Later months">›</button></div>
      </div>
      <div className="cals" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} style={{ touchAction: "none" }}>
        {months.map(([y, m]) => <MonthGrid key={`${y}-${m}`} year={y} month={m} stateOf={stateOf} dayProps={(d, s) => (s === "past" || s === "booked" ? {} : { "data-day": d, className: `day ${s === "school" ? "blk" : ""} ed` })} />)}
      </div>
      <Legend />
      <div className="row"><button type="button" className="btn sm" onClick={() => quick("weekdays")}>Keep all weekdays for school (next 90 days)</button><button type="button" className="btn sm" onClick={() => quick("clear")}>Open every day</button></div>
      {msg ? <p className="small" role="status">{msg}</p> : null}
    </div>
  );
}
