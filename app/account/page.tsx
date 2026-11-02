import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { BOOKING_LABEL, daysBetween, fmtRange, todayKampala, ugx, whatsapp } from "@/lib/format";
import { Pill } from "@/components/Icon";
import { Submit } from "@/components/Submit";
import { cancelBooking, updateProfile } from "./actions";
import type { Booking } from "@/lib/types";

export const metadata = { title: "My bookings" };
type Row = Booking & { buses: { make_model: string; seats: number; schools: { name: string } | null } | null };

function refundText(start: string, today: string) {
  const d = daysBetween(today, start);
  if (d >= 14) return "Cancelling now refunds your full deposit.";
  if (d >= 7) return "Cancelling now refunds half your deposit.";
  return "Your trip is under 7 days away: the deposit is not refundable.";
}

export default async function Account({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { supabase, profile } = await requireUser("/account");
  const sp = await searchParams;
  const settings = await getSettings();
  const today = todayKampala();
  const { data } = await supabase.from("bookings").select("*, buses(make_model, seats, schools(name))").eq("customer_id", profile.id).order("created_at", { ascending: false }).returns<Row[]>();
  const bookings = data ?? [];
  const contacts = Object.fromEntries(await Promise.all(bookings.filter((b) => ["deposit_paid", "completed"].includes(b.status)).map(async (b) => {
    const { data: c } = await supabase.rpc("school_contact", { bk: b.id });
    return [b.id, (c as { school_name: string; contact_name: string; contact_phone: string }[] | null)?.[0]];
  })));

  return (
    <main className="page">
      <div className="section-h"><h1>My bookings</h1><Link className="btn primary" href="/buses">Find a bus</Link></div>
      {sp.sent ? <div className="okmsg">Request {sp.sent} sent. The school usually answers within a day. We&apos;ll update this page, and you can reach us any time{settings?.support_whatsapp ? ` on WhatsApp ${settings.support_whatsapp}` : ""}.</div> : null}
      {bookings.length === 0 ? <div className="empty">No bookings yet. <Link href="/buses">Find a bus</Link> to send your first request.</div> : (
        <div className="stack">{bookings.map((b) => {
          const [label, tone] = BOOKING_LABEL[b.status];
          const c = contacts[b.id];
          return (
            <div key={b.id} className="card stack">
              <div className="row between">
                <div className="stack s" style={{ gap: 2 }}>
                  <span className="tiny muted">{b.ref}</span>
                  <h3>{b.pickup} → {b.destination} · {fmtRange(b.start_date, b.end_date)}</h3>
                  <span className="small muted">{b.buses ? `${b.buses.seats}-seat ${b.buses.make_model} · ${b.buses.schools?.name ?? ""}` : "Bus"} · {b.passengers} people · {b.purpose}</span>
                </div>
                <Pill label={label} tone={tone} dot />
              </div>
              <div className="kv small"><span>Trip price</span><b className="num">{ugx(b.quote_ugx)}</b></div>
              {b.school_note ? <div className="notice info small"><div><b>Note from the school:</b> {b.school_note}</div></div> : null}
              {b.status === "requested" ? <p className="small muted">Waiting for the school to confirm. Nothing to pay yet.</p> : null}
              {b.status === "accepted" ? (
                <div className="notice acc small"><div className="stack s">
                  <b>The school accepted. Pay your deposit of {ugx(b.deposit_ugx)} to confirm.</b>
                  <span>{settings?.payment_instructions}</span>
                  <span>Use reference <b>{b.ref}</b>. The balance of {ugx(b.quote_ugx - b.deposit_ugx)} is due 48 hours before the trip.</span>
                  {settings?.support_whatsapp ? <a className="btn sm" style={{ alignSelf: "flex-start" }} href={whatsapp(settings.support_whatsapp, `Hello Bus&Go, I want to pay the deposit for booking ${b.ref}.`)}>Get payment details on WhatsApp</a> : null}
                </div></div>
              ) : null}
              {c ? <div className="notice ok small"><div>Confirmed. Your contact at {c.school_name}: <b>{c.contact_name}</b>, {c.contact_phone}. <a href={whatsapp(c.contact_phone, `Hello, this is about Bus&Go booking ${b.ref}.`)}>WhatsApp</a></div></div> : null}
              {b.status === "declined" ? <p className="small muted">The school can&apos;t take this trip. <Link href="/buses">Find another bus</Link>.</p> : null}
              {["requested", "accepted"].includes(b.status) ? (
                <form action={cancelBooking} className="row between">
                  <input type="hidden" name="id" value={b.id} />
                  <span className="tiny muted">{b.status === "accepted" ? refundText(b.start_date, today) : "You can cancel for free before paying."}</span>
                  <Submit className="btn sm danger" pendingText="Cancelling…" confirm={`Cancel booking ${b.ref}?`}>Cancel request</Submit>
                </form>
              ) : null}
            </div>
          );
        })}</div>
      )}
      <details className="box">
        <summary>Your details</summary>
        <form action={updateProfile} className="form" style={{ marginTop: 12, maxWidth: 520 }}>
          <label className="f" htmlFor="full_name">Full name<input className="inp" id="full_name" name="full_name" defaultValue={profile.full_name} required /></label>
          <label className="f" htmlFor="phone">Phone<input className="inp" id="phone" name="phone" defaultValue={profile.phone} required /></label>
          <label className="f" htmlFor="org_name">Organisation<input className="inp" id="org_name" name="org_name" defaultValue={profile.org_name} /></label>
          <Submit className="btn" pendingText="Saving…">Save details</Submit>
        </form>
      </details>
    </main>
  );
}
