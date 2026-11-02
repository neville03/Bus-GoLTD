"use client";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn primary", pendingText = "Saving…", formAction, confirm }:
  { children: React.ReactNode; className?: string; pendingText?: string; formAction?: (fd: FormData) => void | Promise<void>; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} formAction={formAction}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}>
      {pending ? pendingText : children}
    </button>
  );
}
export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state) return null;
  if (state.error) return <div className="err" role="alert">{state.error}</div>;
  if (state.ok) return <div className="okmsg" role="status">{state.ok}</div>;
  return null;
}
