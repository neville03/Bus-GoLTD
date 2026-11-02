import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSchoolOwner } from "@/lib/auth";
import { BusPhoto } from "@/components/BusCard";
import { Icon, Pill } from "@/components/Icon";
import { Submit } from "@/components/Submit";
import { respondBooking } from "./actions";
import { BOOKING_LABEL, BUS_LABEL, daysBetween, fmtDate, fmtRange, SCHOOL_LABEL, todayKampala, ugx } from "@/lib/format";
import type { Booking, Bus } from "@/lib/types";

export const metadata = { title: "School dashboard" };
type BRow = Booking & { buses: { plate: string; make_model: string; seats: number } | null };

export default async function SchoolHome({ searchParams }: { searchParams: Promise<{ submitted?: string; err?: string }> }) {
  const { supabase, profile, school } = await requireSchoolOwner("/school");
  if (profile.role === "customer" && !school) redirect("/account");
  if (!school) redirect("/school/onboarding");
  const sp = await searchParams;
  const today = todayKampala();
  const { data: buses } = await supabase.from("buses").select("*").eq("school_id", school.id).order("created_at").returns<Bus[]>();
  const busIds = (buses ?? []).map((b) => b.id);
  const { data: bks } = busIds.length
    ? await supabase.from("bookings").select("*, buses(plate, make_model, seats)").in("bus_id", busIds).order("start_date").returns<BRow[]>()
    : { data: [] as BRow[] };
  const all = bks ?? [];
  const requests = all.filter((b) => b.status === "requested");
  const upcoming = all.filter((b) => ["accepted", "deposit_paid"].includes(b.status) && b.end_date >= today);
  const toClose = all.filter((b) => b.status === "deposit_paid" && b.end_date < today);
  const past = all.filter((b) => !requests.includes(b) && !upcoming.includes(b) && !toClose.includes(b)).reverse().slice(0, 15);
  const earned = all.filter((b) => b.status === "completed").reduce((a, b) => a + b.quote_ugx * (1 - b.commission_pct / 100), 0);
  const [sl, st] = SCHOOL_LABEL[school.status];
  const insuranceSoon = (buses ?? []).filter((b) => b.insurance_expiry && daysBetween(today, b.insurance_expiry) <= 30);

  const row = (b: BRow, actions?: React.ReactNode) => {
    const [l, t] = BOOKING_LABEL[b.status];
    return (
      <div key={b.id} className="li"><div className="main">
        <div className="row"><b>{b.contact_name}</b><Pill label={l} tone={t} dot /><span className="tiny muted">{b.ref}</span></div>
        <span className="small">{fmtRange(b.start_date, b.end_date)} · {b.pickup} → {b.destination} · {b.passengers} people · {b.purpose}</span>
        <span className="small muted">{b.buses?.plate} · Phone {b.contact_phone} · Trip {ugx(b.quote_ugx)} · You receive about <b style={{ color: "var(--ink)" }}>{ugx(b.quote_ugx * (1 - b.commission_pct / 100))}</b></span>
        {b.note ? <span className="small">“{b.note}”</span> : null}
      </div>{actions}</div>
    );
  };

  return (
    <main className="page">
      <div className="section-h">
        <div className="stack s" style={{ gap: 2 }}><h1>{school.name}</h1><span className="small muted">{[school.area, school.district].filter(Boolean).join(", ")}</span></div>
        <Pill label={sl} tone={st} dot />
      </div>
      {sp.submitted ? <div className="okmsg">Application sent. We review within two working days.</div> : null}
      {sp.err ? <div className="err">{sp.err}</div> : null}
      {school.status !== "verified" ? (
        <div className={`notice ${school.status === "rejected" ? "bad" : "info"}`}><div className="stack s">
          <b>{school.status === "draft" ? "Finish your application to start earning." : school.status === "submitted" ? "We're reviewing your application." : school.status === "rejected" ? "Your application needs changes." : "Your school is suspended. Contact Bus&Go."}</b>
          {school.admin_note ? <span>{school.admin_note}</span> : null}
          {["draft", "rejected"].includes(school.status) ? <Link className="btn sm primary" style={{ alignSelf: "flex-start" }} href="/school/onboarding">Continue application</Link> : null}
        </div></div>
      ) : null}
      {insuranceSoon.map((b) => <div key={b.id} className="notice warn"><Icon name="alert" size={18} /><div>Insurance for {b.plate} expires {fmtDate(b.insurance_expiry, true)}. Upload the renewal on the bus page to stay listed.</div></div>)}

      <div className="grid g4">
        <div className="tile"><span className="l">Requests waiting</span><span className="v">{requests.length}</span></div>
        <div className="tile"><span className="l">Upcoming trips</span><span className="v">{upcoming.length}</span></div>
        <div className="tile"><span className="l">Buses live</span><span className="v">{(buses ?? []).filter((b) => b.status === "listed").length} of {(buses ?? []).length}</span></div>
        <div className="tile"><span className="l">Earned so far</span><span className="v">{ugx(earned)}</span></div>
      </div>

      <section className="stack s">
        <h2>Booking requests</h2>
        {requests.length ? <div className="list">{requests.map((b) => row(b,
          <form className="stack s" style={{ minWidth: 240 }}>
            <input type="hidden" name="id" value={b.id} />
            <input className="inp" name="school_note" placeholder="Note to the hirer (optional)" aria-label="Note to the hirer" />
            <div className="row"><Submit className="btn sm danger" formAction={respondBooking.bind(null, "declined")} pendingText="…">Decline</Submit><Submit className="btn sm ok" formAction={respondBooking.bind(null, "accepted")} pendingText="…">Accept</Submit></div>
          </form>))}</div> : <p className="small muted">No requests waiting. New requests appear here.</p>}
      </section>
      {toClose.length ? <section className="stack s"><h2>Trips to close</h2><p className="small muted">Mark a trip done once the bus is back, so we can pay you.</p>
        <div className="list">{toClose.map((b) => row(b, <form action={respondBooking.bind(null, "completed")}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm primary" pendingText="…">Trip done</Submit></form>))}</div></section> : null}
      <section className="stack s"><h2>Upcoming trips</h2>
        {upcoming.length ? <div className="list">{upcoming.map((b) => row(b, b.status === "accepted" ? <form action={respondBooking.bind(null, "cancelled")}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm danger" pendingText="…" confirm="Cancel this trip? The hirer gets a full refund.">Cancel</Submit></form> : null))}</div>
          : <p className="small muted">No upcoming trips.</p>}
        <p className="tiny muted">“Accepted” trips are waiting for the hirer&apos;s deposit. “Confirmed” trips are paid; don&apos;t take other work on those days.</p>
      </section>

      <section className="stack s">
        <div className="row between"><h2>Your buses</h2><Link className="btn primary" href="/school/buses/new"><Icon name="plus" />Add a bus</Link></div>
        {(buses ?? []).length ? <div className="results">{(buses ?? []).map((b) => { const [l, t] = BUS_LABEL[b.status]; return (
          <Link key={b.id} className="bus" href={`/school/buses/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <BusPhoto bus={b} /><div className="body"><div className="row between"><h3>{b.plate}</h3><Pill label={l} tone={t} dot /></div>
            <span className="small muted">{b.seats}-seat {b.make_model} · {ugx(b.daily_ugx)} / day</span></div>
          </Link>); })}</div> : <div className="empty">Add your first bus. You can do it now, even while we review your school.</div>}
      </section>

      {past.length ? <details className="box"><summary>Past bookings</summary><div className="list" style={{ marginTop: 10 }}>{past.map((b) => row(b))}</div></details> : null}
    </main>
  );
}
