"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Doc, DocKind } from "@/lib/types";

const MAX_MB = 10;
const safe = (n: string) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);

export function DocUpload({ schoolId, busId, kind, label, hint, docs }:
  { schoolId: string; busId?: string; kind: DocKind; label: string; hint?: string; docs: Doc[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const mine = docs.filter((d) => d.kind === kind && (busId ? d.bus_id === busId : !d.bus_id));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    const sb = supabaseBrowser();
    for (const f of Array.from(files)) {
      if (f.size > MAX_MB * 1024 * 1024) { setErr(`${f.name} is over ${MAX_MB} MB. Take a photo instead, or compress the PDF.`); continue; }
      const path = `${schoolId}/${busId ?? "school"}/${crypto.randomUUID()}-${safe(f.name)}`;
      const up = await sb.storage.from("documents").upload(path, f, { contentType: f.type || undefined });
      if (up.error) { setErr("Upload failed. Check your connection and try again."); continue; }
      const ins = await sb.from("documents").insert({ school_id: schoolId, bus_id: busId ?? null, kind, path, file_name: f.name });
      if (ins.error) setErr("Saved the file but couldn't record it. Try again.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }
  async function remove(d: Doc) {
    if (!window.confirm(`Remove ${d.file_name}?`)) return;
    const sb = supabaseBrowser();
    await sb.storage.from("documents").remove([d.path]);
    await sb.from("documents").delete().eq("id", d.id);
    router.refresh();
  }
  const id = `doc-${kind}-${busId ?? "s"}`;
  return (
    <div className="upload">
      <div className="row between"><div><b className="small">{label}</b>{hint ? <div className="tiny muted">{hint}</div> : null}</div>
        {mine.length ? <span className="pill ok dot">Uploaded</span> : <span className="pill warn dot">Needed</span>}</div>
      {mine.map((d) => <div key={d.id} className="row between small"><span>{d.file_name}</span><button type="button" className="link small" onClick={() => remove(d)}>Remove</button></div>)}
      <label className="btn sm" htmlFor={id} style={{ alignSelf: "flex-start" }}>{busy ? "Uploading…" : mine.length ? "Add another file" : "Upload photo or PDF"}</label>
      <input ref={input} id={id} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => upload(e.target.files)} disabled={busy} />
      {err ? <div className="err small">{err}</div> : null}
    </div>
  );
}
