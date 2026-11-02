"use client";
import { useActionState } from "react";
import { saveSchool } from "../actions";
import { FormMessage, Submit } from "@/components/Submit";
import { DISTRICTS } from "@/lib/format";
import type { School, SchoolPrivate } from "@/lib/types";

export function SchoolForm({ school, priv, defaults }: { school: School | null; priv: SchoolPrivate | null; defaults: { name: string; contact: string; phone: string; email: string } }) {
  const [state, action] = useActionState(saveSchool, undefined);
  const kv = (k: string, d: string) => state?.values?.[k] ?? d;
  return (
    <form action={action} className="form">
      <div className="grid g2">
        <label className="f" htmlFor="name">School name<input className="inp" id="name" name="name" defaultValue={kv("name", school?.name ?? defaults.name)} required /></label>
        <label className="f" htmlFor="district">District<select className="inp" id="district" name="district" defaultValue={kv("district", school?.district ?? "Kampala")}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label className="f" htmlFor="area">Area or neighbourhood<input className="inp" id="area" name="area" defaultValue={kv("area", school?.area ?? "")} placeholder="e.g. Ntinda" /></label>
        <label className="f" htmlFor="contact_name">Contact person (bursar or transport officer)<input className="inp" id="contact_name" name="contact_name" defaultValue={kv("contact_name", priv?.contact_name ?? defaults.contact)} required /></label>
        <label className="f" htmlFor="contact_phone">Contact phone<input className="inp" id="contact_phone" name="contact_phone" type="tel" defaultValue={priv?.contact_phone ?? defaults.phone} required /></label>
        <label className="f" htmlFor="contact_email">Contact email<input className="inp" id="contact_email" name="contact_email" type="email" defaultValue={priv?.contact_email ?? defaults.email} /></label>
      </div>
      <h3>Where we pay you</h3>
      <div className="grid g3">
        <label className="f" htmlFor="payout_method">Method<select className="inp" id="payout_method" name="payout_method" defaultValue={kv("payout_method", priv?.payout_method ?? "mtn")}><option value="mtn">MTN Mobile Money</option><option value="airtel">Airtel Money</option><option value="bank">Bank account</option></select></label>
        <label className="f" htmlFor="payout_account">Number or account<input className="inp" id="payout_account" name="payout_account" defaultValue={kv("payout_account", priv?.payout_account ?? "")} placeholder="0772… or bank + account no." /></label>
        <label className="f" htmlFor="payout_name">Registered name<input className="inp" id="payout_name" name="payout_name" defaultValue={kv("payout_name", priv?.payout_name ?? "")} placeholder="Name on the account" /></label>
      </div>
      <p className="tiny muted">Only you and the Bus&amp;Go team can see these contact and payout details. Hirers see your contact only after their deposit is paid.</p>
      <FormMessage state={state} />
      <Submit className="btn primary" pendingText="Saving…">{school ? "Save details" : "Save and continue"}</Submit>
    </form>
  );
}
