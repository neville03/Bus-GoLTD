"use client";
import { useActionState } from "react";
import { setPassword } from "../auth/actions";
import { FormMessage, Submit } from "@/components/Submit";

export default function Reset() {
  const [state, action] = useActionState(setPassword, undefined);
  return (
    <main className="page"><div className="narrow card stack">
      <h1>Choose a new password</h1>
      <form action={action} className="form">
        <label className="f" htmlFor="password">New password (8+ characters)<input className="inp" id="password" name="password" type="password" minLength={8} required /></label>
        <FormMessage state={state} />
        <Submit className="btn primary block">Save password</Submit>
      </form>
    </div></main>
  );
}
