"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp } from "../auth/actions";
import { FormMessage, Submit } from "@/components/Submit";

export function SignupForm({ initialRole, next }: { initialRole: "customer" | "school"; next: string }) {
  const [state, action] = useActionState(signUp, undefined);
  const [role, setRole] = useState(initialRole);
  const kv = (k: string) => state?.values?.[k] ?? "";
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="form">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next} />
      <div className="grid g2" role="radiogroup" aria-label="Account type">
        <button type="button" className="chip" style={{ justifyContent: "center", padding: 12 }} aria-pressed={role === "customer"} onClick={() => setRole("customer")}>I want to hire a bus</button>
        <button type="button" className="chip" style={{ justifyContent: "center", padding: 12 }} aria-pressed={role === "school"} onClick={() => setRole("school")}>My school has buses</button>
      </div>
      <label className="f" htmlFor="full_name">Your full name<input className="inp" id="full_name" name="full_name" defaultValue={kv("full_name")} autoComplete="name" required /></label>
      <label className="f" htmlFor="phone">Phone (WhatsApp if possible)<input className="inp" id="phone" name="phone" defaultValue={kv("phone")} type="tel" autoComplete="tel" placeholder="0772 123 456" required /></label>
      <label className="f" htmlFor="org_name">{role === "school" ? "School name" : "Organisation (optional)"}
        <input className="inp" id="org_name" name="org_name" defaultValue={kv("org_name")} required={role === "school"} placeholder={role === "school" ? "e.g. St. Mary's Primary School" : "Church, company, group…"} /></label>
      <label className="f" htmlFor="email">Email<input className="inp" id="email" name="email" defaultValue={kv("email")} type="email" autoComplete="email" required /></label>
      <label className="f" htmlFor="password">Password (8+ characters)<input className="inp" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
      <FormMessage state={state} />
      <Submit className="btn primary lg block" pendingText="Creating account…">Create account</Submit>
      <p className="small muted">By creating an account you agree to the <Link href="/terms">hire terms</Link> and <Link href="/privacy">privacy notice</Link>. Already have an account? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
