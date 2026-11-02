import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { addDays, fmtDate, todayKampala, ugx } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { BusPhoto } from "@/components/BusCard";
import { Legend, MonthGrid, nextMonths } from "@/components/Calendar";
import { BookingForm } from "./BookingForm";
import type { Bus } from "@/lib/types";

type Row = Bus & { schools: { name: string; district: string; area: string; status: string } | null };

export default async function BusPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const { data: bus } = await supabase.from("buses").select("*, schools(name, district, area, status)").eq("id", id).maybeSingle<Row>();
  if (!bus || bus.status !== "listed" || bus.schools?.status !== "verified") notFound();
  const settings = await getSettings();
  const today = todayKampala();
  const from = sp.from && sp.from > today ? sp.from : addDays(today, 7);
  const to = sp.to && sp.to >= from ? sp.to : from;
  const { data: takenRows } = await supabase.rpc("days_taken", { bid: bus.id, d1: today, d2: addDays(today, 120) });
  const taken = new Map((takenRows as { day: string; reason: string }[] | null ?? []).map((r) => [r.day, r.reason]));
  const stateOf = (d: string) => (d <= today ? "past" : taken.get(d) === "school" ? "school" : taken.has(d) ? "booked" : "open") as "past" | "school" | "booked" | "open";
  const feats: [string, string, boolean][] = [["snow", "Air-conditioning", bus.has_ac], ["belt", "Seatbelts", bus.has_seatbelts], ["gps", "GPS tracker", bus.has_gps], ["users", `${bus.seats} seats`, true]];
  const next = `/buses/${bus.id}?from=${from}&to=${to}&pax=${sp.pax ?? ""}`;

  return (
    <main className="page">
      <Link className="link" href={`/buses?from=${from}&to=${to}&pax=${sp.pax ?? ""}`}><Icon name="back" />All buses</Link>
      <div className="split">
        <div className="stack l">
          <div className="stack s">
            <BusPhoto bus={bus} className="hero-photo" />
            {bus.photos.length > 1 ? <div className="thumbs">{bus.photos.slice(1).map((p) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={p} src={p} alt="" loading="lazy" />)}</div> : null}
          </div>
          <div className="stack s">
            <h1>{bus.seats}-seat {bus.make_model}</h1>
            <div className="row small"><span>{bus.schools?.name}</span><span className="verified"><Icon name="shield" size={14} />Verified school</span><span className="muted">· {[bus.schools?.area, bus.schools?.district].filter(Boolean).join(", ")}</span></div>
          </div>
          <div className="chips">{feats.map(([i, l, on]) => <span key={l} className={`pill ${on ? "" : "bad"}`}><Icon name={on ? i : "x"} size={13} />{on ? l : `No ${l.toLowerCase()}`}</span>)}</div>
          {bus.description ? <p style={{ maxWidth: "65ch" }}>{bus.description}</p> : null}
          <div className="list">
            <div className="li"><div className="main"><b>Mechanic inspection</b><span className="small muted">{bus.inspected_on ? `Passed ${fmtDate(bus.inspected_on, true)}${bus.inspected_by ? ` · ${bus.inspected_by}` : ""}` : "Checked by Bus&Go before listing"}</span></div><span className="pill ok dot">Passed</span></div>
            <div className="li"><div className="main"><b>Insurance</b><span className="small muted">{bus.insurer || "Certificate on file"}{bus.insurance_expiry ? ` · valid until ${fmtDate(bus.insurance_expiry, true)}` : ""}</span></div><span className="pill ok dot">Checked</span></div>
            <div className="li"><div className="main"><b>Driver{bus.driver_name ? `: ${bus.driver_name}` : ""}</b><span className="small muted">{bus.driver_included ? "The school's own driver comes with the bus" : "Driver arranged with the school"}</span></div></div>
            {bus.year ? <div className="li"><div className="main"><b>Year</b><span className="small muted">{bus.year}</span></div></div> : null}
          </div>
          <div className="stack s">
            <h2>Availability</h2>
            <div className="cals">{nextMonths(today, 2).map(([y, m]) => <MonthGrid key={`${y}-${m}`} year={y} month={m} stateOf={stateOf} selected={[from, to]} />)}</div>
            <Legend selected />
          </div>
        </div>
        <aside className="card stack sticky">
          <div className="price num" style={{ fontSize: 22 }}>{ugx(bus.daily_ugx)} <span>/ day</span></div>
          {bus.weekly_ugx || bus.monthly_ugx ? <div>
            {bus.weekly_ugx ? <div className="kv small"><span className="muted">Per week</span><b className="num">{ugx(bus.weekly_ugx)}</b></div> : null}
            {bus.monthly_ugx ? <div className="kv small"><span className="muted">Per month</span><b className="num">{ugx(bus.monthly_ugx)}</b></div> : null}
          </div> : null}
          <hr className="sep" />
          {user ? (
            <BookingForm bus={bus} from={from} to={to} pax={Number(sp.pax) || 1} today={today} name={profile?.full_name ?? ""} phone={profile?.phone ?? ""} depositPct={Number(settings?.deposit_pct ?? 30)} />
          ) : (
            <div className="stack s">
              <p className="small">Create a free account to send a booking request. Nothing to pay until the school accepts.</p>
              <Link className="btn primary lg block" href={`/signup?next=${encodeURIComponent(next)}`}>Create account to book</Link>
              <Link className="btn block" href={`/login?next=${encodeURIComponent(next)}`}>I have an account</Link>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
