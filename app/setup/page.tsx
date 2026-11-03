import Link from "next/link";
import { isConfigured } from "@/lib/auth";

export const metadata = { title: "Setup check" };
export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; detail: string };

async function runChecks(): Promise<Check[]> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const url = rawUrl.trim().replace(/\/+$/, ""), key = rawKey.trim();
  const out: Check[] = [];
  out.push({ label: "Supabase address is set", ok: !!url, detail: url ? "Found NEXT_PUBLIC_SUPABASE_URL." : "Add NEXT_PUBLIC_SUPABASE_URL in Vercel → Settings → Environment Variables, then redeploy." });
  out.push({ label: "Supabase key is set", ok: !!key, detail: key ? "Found NEXT_PUBLIC_SUPABASE_ANON_KEY." : "Add NEXT_PUBLIC_SUPABASE_ANON_KEY (the anon public key), then redeploy." });
  if (!url || !key) return out;

  let host = "";
  try { const u = new URL(url); host = u.hostname; out.push({ label: "Address looks right", ok: u.protocol === "https:" && host.endsWith(".supabase.co") && (u.pathname === "/" || u.pathname === ""),
    detail: `It points to ${host}${u.pathname !== "/" ? u.pathname : ""}. It should look exactly like https://abcdefgh.supabase.co with nothing after it.` }); }
  catch { out.push({ label: "Address looks right", ok: false, detail: "It isn't a valid web address. Copy the Project URL from Supabase → Project Settings → API." }); return out; }
  out.push({ label: "No stray spaces or quotes", ok: rawUrl === rawUrl.trim() && rawKey === rawKey.trim() && !/["']/.test(rawUrl + rawKey),
    detail: "Remove any spaces, line breaks or quote marks around the values in Vercel." });
  out.push({ label: "Key looks like a Supabase public key", ok: key.startsWith("eyJ") || key.startsWith("sb_publishable_"),
    detail: key.startsWith("sb_secret_") || key.includes("service_role") ? "This looks like a SECRET key. Never put it in the website. Use the anon public / publishable key instead." : "Use the anon public key (starts with eyJ) or the publishable key (starts with sb_publishable_)." });

  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
    out.push({ label: "Supabase accepts the key", ok: r.ok, detail: r.ok ? "Connected." : r.status === 401 ? "Supabase rejected the key. Copy the anon public key again." : `Supabase answered ${r.status}.` });
  } catch { out.push({ label: "Supabase accepts the key", ok: false, detail: `Couldn't reach ${host}. Check the address, and that the Supabase project isn't paused.` }); return out; }

  try {
    const r = await fetch(`${url}/rest/v1/settings?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
    const body = r.ok ? "" : await r.text();
    out.push({ label: "Database tables are set up", ok: r.ok, detail: r.ok ? "Found the Bus&Go tables." : /does not exist|schema cache|PGRST/.test(body) ? "The tables aren't there yet. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor." : `Database answered ${r.status}.` });
  } catch { out.push({ label: "Database tables are set up", ok: false, detail: "Couldn't check the database." }); }
  return out;
}

export default async function Setup() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.ok);
  return (
    <main className="page"><div className="narrow card stack">
      <h1>{allOk ? "Bus&Go is connected" : isConfigured() ? "Setup check" : "Bus&Go is almost ready"}</h1>
      <p className="small muted">{allOk ? "Everything checks out." : "Accounts, listings and bookings open once every line below is green. After changing anything in Vercel, redeploy."}</p>
      <div className="list">{checks.map((c) => (
        <div key={c.label} className="li"><div className="main"><b>{c.label}</b>{!c.ok ? <span className="small muted">{c.detail}</span> : null}</div>
          <span className={`pill ${c.ok ? "ok" : "bad"} dot`}>{c.ok ? "OK" : "Fix"}</span></div>))}</div>
      <div className="row">{allOk ? <Link className="btn primary" href="/buses">Find a bus</Link> : null}<Link className="btn" href="/">Home page</Link></div>
    </div></main>
  );
}
