import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Pill } from "@/components/Icon";
import { Submit } from "@/components/Submit";
import { adminBooking, reviewBus, reviewSchool, saveSettings } from "./actions";
import { BOOKING_LABEL, BUS_LABEL, DOC_LABEL, fmtDate, fmtRange, SCHOOL_LABEL, todayKampala, ugx, whatsapp } from "@/lib/format";
import type { Booking, Bus, Doc, Profile, School, SchoolPrivate } from "@/lib/types";

export const metadata = { title: "Admin" };
type SRow = School & { school_private: SchoolPrivate | null; owner: Pick<Profile, "full_name" | "email" | "phone"> | null };
type BusRow = Bus & { schools: { name: string; status: string } | null };
type BkRow = Booking & { buses: { plate: string; seats: number; schools: { name: string } | null } | null };

const TABS = [["review", "To review"], ["bookings", "Bookings"], ["schools", "Schools"], ["buses", "Buses"], ["people", "People"], ["settings", "Settings"]] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "review";
  const settings = await getSettings();

  const [{ data: schools }, { data: buses }, { data: bookings }, { data: docs }] = await Promise.all([
    supabase.from("schools").select("*, school_private(*), owner:profiles!schools_owner_id_fkey(full_name, email, phone)").order("created_at", { ascending: false }).returns<SRow[]>(),
    supabase.from("buses").select("*, schools(name, status)").order("created_at", { ascending: false }).returns<BusRow[]>(),
    supabase.from("bookings").select("*, buses(plate, seats, schools(name))").order("created_at", { ascending: false }).limit(300).returns<BkRow[]>(),
    supabase.from("documents").select("*").returns<Doc[]>(),
  ]);
  const S = schools ?? [], B = buses ?? [], K = bookings ?? [], D = docs ?? [];
  const pendingSchools = S.filter((s) => s.status === "submitted"), pendingBuses = B.filter((b) => b.status === "submitted");
  const awaitingPay = K.filter((k) => k.status === "accepted"), newReq = K.filter((k) => k.status === "requested");

  // Short-lived links so the team can open private documents.
  const signed = new Map<string, string>();
  const need = tab === "review" ? D.filter((d) => pendingSchools.some((s) => s.id === d.school_id) || pendingBuses.some((b) => b.id === d.bus_id)) : tab === "schools" || tab === "buses" ? D : [];
  if (need.length) {
    const { data } = await supabase.storage.from("documents").createSignedUrls(need.map((d) => d.path), 3600);
    data?.forEach((x, i) => x.signedUrl && signed.set(need[i].path, x.signedUrl));
  }
  const docLinks = (list: Doc[]) => list.length ? <div className="chips">{list.map((d) => signed.get(d.path)
    ? <a key={d.id} className="chip" href={signed.get(d.path)} target="_blank" rel="noreferrer">{DOC_LABEL[d.kind]}</a>
    : <span key={d.id} className="chip">{DOC_LABEL[d.kind]}</span>)}</div> : <span className="small" style={{ color: "var(--bad)" }}>No documents uploaded</span>;

  const schoolCard = (s: SRow) => {
    const [l, t] = SCHOOL_LABEL[s.status], p = s.school_private;
    return (
      <div key={s.id} className="card stack s">
        <div className="row between"><h3>{s.name}</h3><Pill label={l} tone={t} dot /></div>
        <span className="small muted">{[s.area, s.district].filter(Boolean).join(", ")} · applied {fmtDate(s.created_at.slice(0, 10), true)}</span>
        <span className="small">Contact: <b>{p?.contact_name}</b> · {p?.contact_phone} {p?.contact_phone ? <a href={whatsapp(p.contact_phone)}>WhatsApp</a> : null} · {p?.contact_email || s.owner?.email}</span>
        <span className="small">Account: {s.owner?.full_name} · {s.owner?.email} · {s.owner?.phone}</span>
        <span className="small">Payout: {p?.payout_method?.toUpperCase()} {p?.payout_account || "—"} ({p?.payout_name || "no name"})</span>
        {docLinks(D.filter((d) => d.school_id === s.id && !d.bus_id))}
        <form className="row">
          <input type="hidden" name="id" value={s.id} />
          <input className="inp" name="admin_note" placeholder="Note to the school (required to reject)" aria-label="Note to the school" style={{ flex: 1, minWidth: 220 }} defaultValue={s.admin_note} />
          {s.status !== "verified" ? <Submit className="btn sm ok" formAction={reviewSchool.bind(null, "verified")} pendingText="…">Approve</Submit> : null}
          {s.status === "submitted" ? <Submit className="btn sm danger" formAction={reviewSchool.bind(null, "rejected")} pendingText="…">Ask for changes</Submit> : null}
          {s.status === "verified" ? <Submit className="btn sm danger" formAction={reviewSchool.bind(null, "suspended")} pendingText="…" confirm={`Suspend ${s.name}? Their buses disappear from search.`}>Suspend</Submit> : null}
        </form>
      </div>
    );
  };
  const busCard = (b: BusRow) => {
    const [l, t] = BUS_LABEL[b.status];
    return (
      <div key={b.id} className="card stack s">
        <div className="row between"><h3>{b.plate} · {b.seats}-seat {b.make_model}</h3><Pill label={l} tone={t} dot /></div>
        <span className="small muted">{b.schools?.name} {b.schools?.status !== "verified" ? <b style={{ color: "var(--warn)" }}>(school not verified)</b> : null} · {ugx(b.daily_ugx)}/day · {b.year ?? "year ?"} · insurer {b.insurer || "?"}{b.insurance_expiry ? ` to ${fmtDate(b.insurance_expiry, true)}` : ""}</span>
        {b.photos.length ? <div className="thumbs">{b.photos.map((p) => /* eslint-disable-next-line @next/next/no-img-element */ <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" /></a>)}</div> : <span className="small" style={{ color: "var(--bad)" }}>No photos</span>}
        {docLinks(D.filter((d) => d.bus_id === b.id))}
        <form className="stack s">
          <input type="hidden" name="id" value={b.id} />
          <div className="row">
            <label className="f" htmlFor={`io-${b.id}`}>Inspected on<input className="inp" type="date" id={`io-${b.id}`} name="inspected_on" defaultValue={b.inspected_on ?? todayKampala()} /></label>
            <label className="f" htmlFor={`ib-${b.id}`}>Inspected by (garage)<input className="inp" id={`ib-${b.id}`} name="inspected_by" defaultValue={b.inspected_by} /></label>
            <label className="f" htmlFor={`an-${b.id}`} style={{ flex: 1, minWidth: 200 }}>Note to the school<input className="inp" id={`an-${b.id}`} name="admin_note" defaultValue={b.admin_note} /></label>
          </div>
          <div className="row">
            {b.status !== "listed" ? <Submit className="btn sm ok" formAction={reviewBus.bind(null, "listed")} pendingText="…">Inspection passed: go live</Submit> : null}
            {b.status === "submitted" ? <Submit className="btn sm danger" formAction={reviewBus.bind(null, "rejected")} pendingText="…">Ask for changes</Submit> : null}
            {["listed", "paused"].includes(b.status) ? <Submit className="btn sm danger" formAction={reviewBus.bind(null, "rejected")} pendingText="…" confirm="Take this bus offline until the school fixes it?">Take offline</Submit> : null}
          </div>
        </form>
      </div>
    );
  };
  const bookingRow = (k: BkRow) => {
    const [l, t] = BOOKING_LABEL[k.status];
    return (
      <div key={k.id} className="li"><div className="main">
        <div className="row"><b>{k.ref}</b><Pill label={l} tone={t} dot /><span className="small muted">{k.buses?.plate} · {k.buses?.schools?.name}</span></div>
        <span className="small">{k.contact_name} · {k.contact_phone} <a href={whatsapp(k.contact_phone, `Hello, this is Bus&Go about booking ${k.ref}.`)}>WhatsApp</a></span>
        <span className="small">{fmtRange(k.start_date, k.end_date)} · {k.pickup} → {k.destination} · {k.passengers} people · {k.purpose}</span>
        <span className="small muted">Total {ugx(k.quote_ugx)} · deposit {ugx(k.deposit_ugx)} · commission {k.commission_pct}% = {ugx(k.quote_ugx * k.commission_pct / 100)}{k.payment_ref ? ` · paid ref ${k.payment_ref}` : ""}</span>
        {k.school_note ? <span className="small">School: “{k.school_note}”</span> : null}
      </div>
        <form className="stack s" style={{ minWidth: 260 }}>
          <input type="hidden" name="id" value={k.id} />
          {k.status === "accepted" ? <input className="inp" name="payment_ref" placeholder="MoMo transaction ID" aria-label="Payment reference" required /> : null}
          <input className="inp" name="admin_note" placeholder="Internal note" aria-label="Internal note" defaultValue={k.admin_note} />
          <div className="row">
            {k.status === "accepted" ? <Submit className="btn sm ok" formAction={adminBooking.bind(null, "deposit_paid")} pendingText="…">Deposit received</Submit> : null}
            {k.status === "deposit_paid" ? <Submit className="btn sm" formAction={adminBooking.bind(null, "completed")} pendingText="…">Mark completed</Submit> : null}
            {["requested", "accepted", "deposit_paid"].includes(k.status) ? <Submit className="btn sm danger" formAction={adminBooking.bind(null, "cancelled")} pendingText="…" confirm={`Cancel ${k.ref}?`}>Cancel</Submit> : null}
            <Submit className="btn sm" formAction={adminBooking.bind(null, "note")} pendingText="…">Save note</Submit>
          </div>
        </form>
      </div>
    );
  };

  const gmv = K.filter((k) => ["deposit_paid", "completed"].includes(k.status)).reduce((a, k) => a + k.quote_ugx, 0);
  const comm = K.filter((k) => k.status === "completed").reduce((a, k) => a + k.quote_ugx * k.commission_pct / 100, 0);
  const statusFilter = sp.status && BOOKING_LABEL[sp.status] ? sp.status : "";

  return (
    <main className="page">
      <div className="section-h"><h1>Admin</h1><span className="small muted">Bus&amp;Go operations</span></div>
      <div className="grid g4">
        <div className="tile"><span className="l">Verified schools</span><span className="v">{S.filter((s) => s.status === "verified").length}</span></div>
        <div className="tile"><span className="l">Buses live</span><span className="v">{B.filter((b) => b.status === "listed").length}</span></div>
        <div className="tile"><span className="l">Confirmed booking value</span><span className="v">{ugx(gmv)}</span></div>
        <div className="tile"><span className="l">Commission earned</span><span className="v">{ugx(comm)}</span></div>
      </div>
      <div className="tabs">{TABS.map(([k, l]) => {
        const n = k === "review" ? pendingSchools.length + pendingBuses.length + awaitingPay.length : k === "bookings" ? newReq.length : 0;
        return <Link key={k} className="tab" href={`/admin?tab=${k}`} aria-selected={tab === k}>{l}{n ? <span className="count">{n}</span> : null}</Link>;
      })}</div>

      {tab === "review" ? <>
        <section className="stack s"><h2>Schools waiting for approval</h2>{pendingSchools.length ? pendingSchools.map(schoolCard) : <p className="small muted">None.</p>}</section>
        <section className="stack s"><h2>Buses waiting for inspection</h2><p className="small muted">Arrange the inspection with a partner garage, then record it here to put the bus live.</p>{pendingBuses.length ? pendingBuses.map(busCard) : <p className="small muted">None.</p>}</section>
        <section className="stack s"><h2>Deposits to collect</h2><p className="small muted">The school accepted. Send the hirer payment details, then record the transaction ID when it arrives.</p>{awaitingPay.length ? <div className="list">{awaitingPay.map(bookingRow)}</div> : <p className="small muted">None.</p>}</section>
      </> : null}

      {tab === "bookings" ? <section className="stack s">
        <div className="chips"><Link className="chip" href="/admin?tab=bookings" aria-pressed={!statusFilter}>All</Link>{Object.entries(BOOKING_LABEL).map(([k, [l]]) => <Link key={k} className="chip" href={`/admin?tab=bookings&status=${k}`} aria-pressed={statusFilter === k}>{l}</Link>)}</div>
        {K.filter((k) => !statusFilter || k.status === statusFilter).length ? <div className="list">{K.filter((k) => !statusFilter || k.status === statusFilter).map(bookingRow)}</div> : <p className="small muted">No bookings.</p>}
      </section> : null}

      {tab === "schools" ? <section className="stack s">{S.length ? S.map(schoolCard) : <p className="small muted">No schools yet.</p>}</section> : null}
      {tab === "buses" ? <section className="stack s">{B.length ? B.map(busCard) : <p className="small muted">No buses yet.</p>}</section> : null}
      {tab === "people" ? <People /> : null}

      {tab === "settings" && settings ? (
        <form action={saveSettings} className="card form" style={{ maxWidth: 720 }}>
          <div className="grid g3">
            <label className="f" htmlFor="commission_pct">Commission %<input className="inp num" type="number" step="0.5" id="commission_pct" name="commission_pct" defaultValue={settings.commission_pct} /></label>
            <label className="f" htmlFor="deposit_pct">Deposit %<input className="inp num" type="number" step="1" id="deposit_pct" name="deposit_pct" defaultValue={settings.deposit_pct} /></label>
            <label className="f" htmlFor="driver_bonus_ugx">Driver bonus per day (UGX)<input className="inp num" type="number" id="driver_bonus_ugx" name="driver_bonus_ugx" defaultValue={settings.driver_bonus_ugx} /></label>
            <label className="f" htmlFor="support_phone">Support phone<input className="inp" id="support_phone" name="support_phone" defaultValue={settings.support_phone} /></label>
            <label className="f" htmlFor="support_whatsapp">WhatsApp number<input className="inp" id="support_whatsapp" name="support_whatsapp" defaultValue={settings.support_whatsapp} /></label>
            <label className="f" htmlFor="support_email">Support email<input className="inp" type="email" id="support_email" name="support_email" defaultValue={settings.support_email} /></label>
          </div>
          <label className="f" htmlFor="payment_instructions">How hirers pay the deposit (shown after a school accepts)<textarea className="inp" id="payment_instructions" name="payment_instructions" defaultValue={settings.payment_instructions} /></label>
          <p className="tiny muted">New commission and deposit rates apply to new bookings only. Contact details appear in the site footer.</p>
          <Submit pendingText="Saving…">Save settings</Submit>
        </form>
      ) : null}
    </main>
  );
}

async function People() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(300).returns<(Profile & { created_at: string })[]>();
  return (
    <div className="tbl-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Organisation</th><th>Type</th><th>Joined</th></tr></thead>
      <tbody>{(data ?? []).map((p) => <tr key={p.id}><td>{p.full_name}</td><td>{p.email}</td><td>{p.phone} {p.phone ? <a href={whatsapp(p.phone)}>WA</a> : null}</td><td>{p.org_name}</td><td>{p.role}</td><td>{fmtDate(p.created_at.slice(0, 10), true)}</td></tr>)}</tbody>
    </table></div>
  );
}
