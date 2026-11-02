"use client";
import { useActionState, useState } from "react";
import { requestBooking } from "./actions";
import { FormMessage, Submit } from "@/components/Submit";
import { addDays, daysBetween, estimate, PURPOSES, ugx } from "@/lib/format";
import type { Bus } from "@/lib/types";

export function BookingForm({ bus, from, to, pax, today, name, phone, depositPct }:
  { bus: Bus; from: string; to: string; pax: number; today: string; name: string; phone: string; depositPct: number }) {
  const [state, action] = useActionState(requestBooking, undefined);
  const val = (k: string, d: string | number = "") => state?.values?.[k] ?? String(d);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const total = end >= start ? estimate(bus, start, end) : 0;
  const days = end >= start ? daysBetween(start, end) + 1 : 0;
  return (
    <form action={action} className="form">
      <input type="hidden" name="bus_id" value={bus.id} />
      <div className="grid g2">
        <label className="f" htmlFor="start_date">First day<input className="inp" type="date" id="start_date" name="start_date" value={start} min={addDays(today, 1)} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} required /></label>
        <label className="f" htmlFor="end_date">Last day<input className="inp" type="date" id="end_date" name="end_date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required /></label>
        <label className="f" htmlFor="pickup">Pickup place<input className="inp" id="pickup" name="pickup" placeholder="e.g. Ntinda, Kampala" defaultValue={val("pickup")} required /></label>
        <label className="f" htmlFor="destination">Destination<input className="inp" id="destination" name="destination" placeholder="e.g. Jinja" defaultValue={val("destination")} required /></label>
        <label className="f" htmlFor="passengers">Number of people<input className="inp num" type="number" id="passengers" name="passengers" min={1} max={bus.seats} defaultValue={val("passengers", Math.min(pax, bus.seats))} required /></label>
        <label className="f" htmlFor="purpose">Trip purpose<select className="inp" id="purpose" name="purpose" defaultValue={val("purpose", PURPOSES[0])}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="f" htmlFor="contact_name">Contact on the day<input className="inp" id="contact_name" name="contact_name" defaultValue={val("contact_name", name)} required /></label>
        <label className="f" htmlFor="contact_phone">Their phone<input className="inp" type="tel" id="contact_phone" name="contact_phone" defaultValue={val("contact_phone", phone)} required /></label>
      </div>
      <label className="f" htmlFor="note">Anything else? (pickup time, stops, return time)<textarea className="inp" id="note" name="note" maxLength={1000} defaultValue={val("note")} /></label>
      {total ? (
        <div>
          <div className="kv"><span>{days} day{days > 1 ? "s" : ""} · driver included</span><b className="num">{ugx(total)}</b></div>
          <div className="kv"><span className="muted">Deposit after the school accepts ({depositPct}%)</span><span className="num">{ugx(Math.round(total * depositPct / 100 / 1000) * 1000)}</span></div>
          <p className="tiny muted" style={{ marginTop: 6 }}>Fuel for long trips and any extra stops are agreed with the school before you pay.</p>
        </div>
      ) : null}
      <FormMessage state={state} />
      <Submit className="btn primary lg block" pendingText="Sending request…">Send booking request</Submit>
      <p className="tiny muted">Nothing to pay yet. The school confirms first, usually within a day.</p>
    </form>
  );
}
