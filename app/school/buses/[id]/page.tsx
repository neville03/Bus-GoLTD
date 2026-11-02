import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSchoolOwner } from "@/lib/auth";
import { BusForm } from "@/components/BusForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DocUpload } from "@/components/DocUpload";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { Icon, Pill } from "@/components/Icon";
import { Submit } from "@/components/Submit";
import { deleteBus, setBusStatus } from "../../actions";
import { addDays, BUS_LABEL, DOC_LABEL, todayKampala } from "@/lib/format";
import type { Bus, Doc } from "@/lib/types";

export default async function EditBus({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; missing?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, school } = await requireSchoolOwner(`/school/buses/${id}`);
  if (!school) redirect("/school/onboarding");
  const { data: bus } = await supabase.from("buses").select("*").eq("id", id).eq("school_id", school.id).maybeSingle<Bus>();
  if (!bus) notFound();
  const { data: docs } = await supabase.from("documents").select("*").eq("bus_id", id).returns<Doc[]>();
  const today = todayKampala();
  const { data: bl } = await supabase.from("blackouts").select("day").eq("bus_id", id).gte("day", today);
  const { data: taken } = await supabase.rpc("days_taken", { bid: id, d1: today, d2: addDays(today, 130) });
  const booked = ((taken as { day: string; reason: string }[] | null) ?? []).filter((t) => t.reason === "booked").map((t) => t.day);
  const [label, tone] = BUS_LABEL[bus.status];
  const editable = ["draft", "rejected"].includes(bus.status);

  return (
    <main className="page">
      <Link className="link" href="/school"><Icon name="back" />Dashboard</Link>
      <div className="section-h"><h1>{bus.seats}-seat {bus.make_model} · {bus.plate}</h1><Pill label={label} tone={tone} dot /></div>
      {sp.new ? <div className="okmsg">Bus saved. Now add photos and documents, then send it for inspection.</div> : null}
      {sp.missing ? <div className="err">Before sending: add at least one photo, the logbook and the insurance certificate.</div> : null}
      {bus.status === "rejected" && bus.admin_note ? <div className="notice bad"><div><b>What to fix:</b> {bus.admin_note}</div></div> : null}
      {bus.status === "submitted" ? <div className="notice info"><div>We&apos;re reviewing this bus and will arrange an inspection with a partner mechanic. We&apos;ll call {school.name} to agree a time.</div></div> : null}
      {school.status !== "verified" ? <div className="notice warn"><div>Your school isn&apos;t verified yet. You can prepare buses now; they go live after we approve the school. <Link href="/school/onboarding">Check your application</Link></div></div> : null}

      <section className="card stack"><h2>Photos</h2><PhotoUpload schoolId={school.id} busId={bus.id} photos={bus.photos} /></section>
      <section className="card stack"><h2>Documents</h2>
        <div className="grid g3">
          <DocUpload schoolId={school.id} busId={bus.id} kind="logbook" label={DOC_LABEL.logbook} docs={docs ?? []} />
          <DocUpload schoolId={school.id} busId={bus.id} kind="insurance" label={DOC_LABEL.insurance} hint="Must cover hire to third parties" docs={docs ?? []} />
          <DocUpload schoolId={school.id} busId={bus.id} kind="inspection" label={DOC_LABEL.inspection} hint="Optional: latest inspection report" docs={docs ?? []} />
        </div>
      </section>
      <section className="card stack"><h2>Details and prices</h2><BusForm bus={bus} />
        {["listed", "paused"].includes(bus.status) ? <p className="tiny muted">Changing the plate or seats sends the bus back for review.</p> : null}</section>
      <section className="card stack"><h2>Availability</h2><AvailabilityEditor busId={bus.id} today={today} blocked={(bl ?? []).map((b) => b.day)} booked={booked} /></section>

      <section className="card row between">
        <div className="stack s" style={{ gap: 2 }}><b>{editable ? "Ready to go live?" : bus.status === "listed" ? "This bus is live" : bus.status === "paused" ? "This bus is paused" : "Under review"}</b>
          <span className="small muted">{editable ? "Send it for inspection. We approve it after a partner mechanic checks it." : bus.status === "listed" ? "Pause it to stop new requests for a while." : bus.status === "paused" ? "Hirers can't find it until you resume." : "No action needed."}</span></div>
        <div className="row">
          {editable ? <form action={deleteBus}><input type="hidden" name="id" value={bus.id} /><Submit className="btn danger" pendingText="Deleting…" confirm="Delete this bus?">Delete</Submit></form> : null}
          {editable || bus.status === "listed" || bus.status === "paused" ? (
            <form action={setBusStatus}><input type="hidden" name="id" value={bus.id} /><input type="hidden" name="to" value={editable ? "submitted" : bus.status === "listed" ? "paused" : "listed"} />
              <Submit className={editable ? "btn primary" : "btn"} pendingText="Saving…">{editable ? "Send for inspection" : bus.status === "listed" ? "Pause bus" : "Resume bus"}</Submit></form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
