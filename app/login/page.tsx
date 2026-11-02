import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="page"><div className="narrow card stack">
      <h1>Sign in</h1>
      {sp.error ? <div className="err">That link has expired or was already used. Sign in, or ask for a new link.</div> : null}
      {sp.reset ? <div className="okmsg">Password changed. Sign in with your new password.</div> : null}
      <LoginForm next={sp.next ?? ""} />
    </div></main>
  );
}
