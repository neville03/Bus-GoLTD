"use client";
import { useActionState } from "react";
import { sendReset } from "../auth/actions";
import { FormMessage, Submit } from "@/components/Submit";

export default function Forgot() {
  const [state, action] = useActionState(sendReset, undefined);
  return (
    <main className="page"><div className="narrow card stack">
      <h1>Reset your password</h1>
      <form action={action} className="form">
        <label className="f" htmlFor="email">Email<input className="inp" id="email" name="email" type="email" required /></label>
        <FormMessage state={state} />
        <Submit className="btn primary block" pendingText="Sending…">Send reset link</Submit>
      </form>
    </div></main>
  );
}
