import { BusCard } from "@/components/BusCard";
import { getSession } from "@/lib/auth";
import { addDays, fmtDate, SEAT_SIZES, todayKampala } from "@/lib/format";
import type { Bus } from "@/lib/types";
import Link from "next/link";

export const metadata = { title: "Find a bus" };
type Row = Bus & { schools: { name: string; district: string; area: string } | null };

export default async function Buses({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = todayKampala();
  const from = sp.from && sp.from > today ? sp.from : addDays(today, 7);
  const to = sp.to && sp.to >= from ? sp.to : from;
  const pax = Math.max(1, Number(sp.pax) || 1);
  const size = Number(sp.seats) || 0;
  const { supabase } = await getSession();
  let q = supabase.from("buses").select("*, schools!inner(name, district, area, status)").eq("status", "listed").eq("schools.status", "verified").gte("seats", pax).order("seats");
  if (size) q = q.eq("seats", size);
  if (sp.ac) q = q.eq("has_ac", true);
  const { data, error } = await q.returns<Row[]>();
  const buses = data ?? [];
  const taken = await Promise.all(buses.map(async (b) => {
    const { data: days } = await supabase.rpc("days_taken", { bid: b.id, d1: from, d2: to });
    const d = (days as { day: string; reason: string }[] | null)?.[0];
    return d ? `${d.reason === "school" ? "School use" : "Booked"} on ${fmtDate(d.day)}` : null;
  }));
  const rows = buses.map((b, i) => ({ b, t: taken[i] })).sort((x, y) => Number(!!x.t) - Number(!!y.t));
  const free = rows.filter((r) => !r.t).length;
  const qs = (o: Record<string, string | number>) => "?" + new URLSearchParams({ from, to, pax: String(pax), ...(sp.ac ? { ac: "1" } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }).toString();

  return (
    <main className="page">
      <h1>Find a bus</h1>
      <form className="search" style={{ gridTemplateColumns: "1fr 1fr .7fr auto" }} method="get">
        <label className="f" htmlFor="from">From<input className="inp" type="date" id="from" name="from" defaultValue={from} min={addDays(today, 1)} /></label>
        <label className="f" htmlFor="to">To<input className="inp" type="date" id="to" name="to" defaultValue={to} min={addDays(today, 1)} /></label>
        <label className="f" htmlFor="pax">People<input className="inp num" type="number" id="pax" name="pax" min={1} max={90} defaultValue={pax} /></label>
        <button className="btn primary lg go" type="submit">Search</button>
      </form>
      <div className="chips" role="group" aria-label="Bus size">
        <Link className="chip" href={qs({ seats: "" })} aria-pressed={!size}>Any size</Link>
        {SEAT_SIZES.filter((n) => n >= pax || n === size).map((n) => <Link key={n} className="chip" href={qs({ seats: n })} aria-pressed={size === n}>{n} seats</Link>)}
        <Link className="chip" href={"?" + new URLSearchParams({ from, to, pax: String(pax), ...(size ? { seats: String(size) } : {}), ...(sp.ac ? {} : { ac: "1" }) })} aria-pressed={!!sp.ac}>Air-conditioned</Link>
      </div>
      {error ? <div className="err">We couldn&apos;t load buses right now. Please refresh in a minute.</div> : null}
      <p className="small muted">{rows.length} bus{rows.length === 1 ? "" : "es"} for {pax} people · {free} free on your dates</p>
      {rows.length ? (
        <div className="results">{rows.map(({ b, t }) => <BusCard key={b.id} bus={b} schoolName={b.schools?.name ?? ""} taken={t} href={`/buses/${b.id}?from=${from}&to=${to}&pax=${pax}`} />)}</div>
      ) : (
        <div className="empty stack s"><b>No buses match yet.</b><span>We&apos;re adding schools every week. Try a smaller group or other dates, or message us and we&apos;ll find you a bus.</span></div>
      )}
    </main>
  );
}
