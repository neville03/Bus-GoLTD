"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Shrinks photos on the phone before upload so they work on slow connections. */
async function shrink(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.82));
}

export function PhotoUpload({ schoolId, busId, photos }: { schoolId: string; busId: string; photos: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(next: string[]) {
    const { error } = await supabaseBrowser().from("buses").update({ photos: next }).eq("id", busId);
    if (error) setErr("Couldn't save the photo list. Try again.");
    router.refresh();
  }
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    const sb = supabaseBrowser(), urls: string[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      try {
        const blob = await shrink(f);
        const path = `${schoolId}/${busId}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("bus-photos").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        urls.push(sb.storage.from("bus-photos").getPublicUrl(path).data.publicUrl);
      } catch { setErr(`Couldn't upload ${f.name}. Try a different photo.`); }
    }
    if (urls.length) await save([...photos, ...urls]);
    setBusy(false);
  }
  async function remove(url: string) {
    const path = url.split("/bus-photos/")[1];
    if (path) await supabaseBrowser().storage.from("bus-photos").remove([decodeURIComponent(path)]);
    await save(photos.filter((p) => p !== url));
  }
  async function makeCover(url: string) { await save([url, ...photos.filter((p) => p !== url)]); }

  return (
    <div className="stack s">
      {photos.length ? (
        <div className="gallery">{photos.map((p, i) => (
          <div key={p} className="ph">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`Bus photo ${i + 1}`} />
            <button type="button" className="btn sm" onClick={() => remove(p)} aria-label="Remove photo">Remove</button>
            {i > 0 ? <button type="button" className="btn sm" style={{ top: "auto", bottom: 6, right: "auto", left: 6 }} onClick={() => makeCover(p)}>Make cover</button> : <span className="pill acc" style={{ position: "absolute", left: 6, bottom: 6 }}>Cover</span>}
          </div>))}
        </div>
      ) : <p className="small muted">Add 3 to 6 clear photos: the outside, the seats, and the driver area. The first photo is the cover.</p>}
      <label className="btn sm" htmlFor="photos" style={{ alignSelf: "flex-start" }}>{busy ? "Uploading…" : "Add photos"}</label>
      <input id="photos" type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => add(e.target.files)} />
      {err ? <div className="err small">{err}</div> : null}
    </div>
  );
}
