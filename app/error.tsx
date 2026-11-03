"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page"><div className="narrow card stack">
      <h1>Something went wrong</h1>
      <p className="muted">Please try again. If it keeps happening, the site may not be fully set up yet.</p>
      <div className="row"><button className="btn primary" onClick={reset}>Try again</button><Link className="btn" href="/setup">Run the setup check</Link></div>
    </div></main>
  );
}
