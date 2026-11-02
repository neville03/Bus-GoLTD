"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "../auth/actions";
import { FormMessage, Submit } from "@/components/Submit";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <label className="f" htmlFor="email">Email<input className="inp" id="email" name="email" defaultValue={state?.values?.email ?? ""} type="email" autoComplete="email" required /></label>
      <label className="f" htmlFor="password">Password<input className="inp" id="password" name="password" type="password" autoComplete="current-password" required /></label>
      <FormMessage state={state} />
      <Submit className="btn primary lg block" pendingText="Signing in…">Sign in</Submit>
      <div className="row between small"><Link href="/forgot">Forgot your password?</Link><Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></div>
    </form>
  );
}
