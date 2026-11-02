"use client";
import { useActionState, useState } from "react";
import { createBus, updateBus } from "@/app/school/actions";
import { FormMessage, Submit } from "./Submit";
import { suggestedDaily, ugx } from "@/lib/format";
import type { Bus } from "@/lib/types";

export function BusForm({ bus }: { bus?: Bus }) {
  const [state, action] = useActionState(bus ? updateBus : createBus, undefined);
  const kv = (k: string, d: unknown) => state?.values?.[k] ?? (d == null ? "" : String(d));
  const [seats, setSeats] = useState(bus?.seats ?? 33);
  const [daily, setDaily] = useState(bus?.daily_ugx ? String(bus.daily_ugx) : "");
  const sug = suggestedDaily(seats || 33);
  const d = Number(daily) || 0;
  const chk = (name: keyof Bus, label: string, def: boolean) => (
    <label className="chk" htmlFor={name}><input type="checkbox" id={name} name={name} defaultChecked={state?.values ? state.values[name] === "on" : bus ? Boolean(bus[name]) : def} /><span>{label}</span></label>
  );
  return (
    <form action={action} className="form">
      {bus ? <input type="hidden" name="id" value={bus.id} /> : null}
      <div className="grid g3">
        <label className="f" htmlFor="make_model">Make and model<input className="inp" id="make_model" name="make_model" defaultValue={kv("make_model", bus?.make_model)} placeholder="e.g. Toyota Coaster" required /></label>
        <label className="f" htmlFor="plate">Number plate<input className="inp" id="plate" name="plate" defaultValue={kv("plate", bus?.plate)} placeholder="e.g. UBK 412F" required /></label>
        <label className="f" htmlFor="seats">Passenger seats<input className="inp num" type="number" id="seats" name="seats" min={7} max={90} value={seats || ""} onChange={(e) => setSeats(Number(e.target.value))} required /></label>
        <label className="f" htmlFor="year">Year<input className="inp num" type="number" id="year" name="year" min={1980} max={2100} defaultValue={kv("year", bus?.year ?? "")} /></label>
        <label className="f" htmlFor="insurer">Insurance company<input className="inp" id="insurer" name="insurer" defaultValue={kv("insurer", bus?.insurer)} /></label>
        <label className="f" htmlFor="insurance_expiry">Insurance valid until<input className="inp" type="date" id="insurance_expiry" name="insurance_expiry" defaultValue={kv("insurance_expiry", bus?.insurance_expiry ?? "")} /></label>
      </div>
      <div className="row" style={{ gap: 18 }}>{chk("has_seatbelts", "Seatbelts", true)}{chk("has_ac", "Air-conditioning", false)}{chk("has_gps", "GPS tracker", false)}{chk("driver_included", "Our driver comes with the bus", true)}</div>
      <label className="f" htmlFor="driver_name">Usual driver&apos;s name<input className="inp" id="driver_name" name="driver_name" defaultValue={kv("driver_name", bus?.driver_name)} /></label>
      <h3>Prices</h3>
      <div className="notice acc small"><div>Typical for {seats || 33} seats in Kampala: <b>{ugx(sug)}</b> a day. <button type="button" className="link" onClick={() => setDaily(String(sug))}>Use this</button></div></div>
      <div className="grid g3">
        <label className="f" htmlFor="daily_ugx">Per day (UGX)<input className="inp num" type="number" id="daily_ugx" name="daily_ugx" min={1} value={daily} onChange={(e) => setDaily(e.target.value)} required /></label>
        <label className="f" htmlFor="weekly_ugx">Per week (optional)<input className="inp num" type="number" id="weekly_ugx" name="weekly_ugx" min={1} defaultValue={kv("weekly_ugx", bus?.weekly_ugx ?? "")} placeholder={d ? String(d * 6) : ""} /></label>
        <label className="f" htmlFor="monthly_ugx">Per month (optional)<input className="inp num" type="number" id="monthly_ugx" name="monthly_ugx" min={1} defaultValue={kv("monthly_ugx", bus?.monthly_ugx ?? "")} placeholder={d ? String(d * 22) : ""} /></label>
      </div>
      <label className="f" htmlFor="description">Anything hirers should know (optional)<textarea className="inp" id="description" name="description" maxLength={1500} defaultValue={kv("description", bus?.description)} placeholder="e.g. Comfortable for long trips. Luggage space at the back." /></label>
      <FormMessage state={state} />
      <Submit className="btn primary" pendingText="Saving…">{bus ? "Save changes" : "Save and add photos"}</Submit>
    </form>
  );
}
