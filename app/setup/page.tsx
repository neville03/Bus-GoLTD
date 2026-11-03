import Link from "next/link";
import { isConfigured } from "@/lib/auth";

export const metadata = { title: "Almost ready" };
export default function Setup() {
  const ready = isConfigured();
  return (
    <main className="page"><div className="narrow card stack">
      <h1>{ready ? "Bus&Go is connected" : "Bus&Go is almost ready"}</h1>
      {ready ? <p>The database is connected. <Link href="/buses">Find a bus</Link>.</p> : <>
        <p>Accounts, bus listings and bookings open as soon as the database is connected.</p>
        <p className="small muted">For the site owner: add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel (Settings → Environment Variables), then redeploy. See docs/LAUNCH.md in the repository.</p>
        <Link className="btn" href="/">Back to the home page</Link>
      </>}
    </div></main>
  );
}
