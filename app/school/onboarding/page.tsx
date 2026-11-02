import Link from "next/link";
import { requireSchoolOwner } from "@/lib/auth";
import { SchoolForm } from "./SchoolForm";
import { DocUpload } from "@/components/DocUpload";
import { Pill } from "@/components/Icon";
import { Submit } from "@/components/Submit";
import { submitSchool } from "../actions";
import { DOC_LABEL, SCHOOL_LABEL } from "@/lib/format";
import type { Doc, SchoolPrivate } from "@/lib/types";

export const metadata = { title: "School application" };
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const { supabase, user, profile, school } = await requireSchoolOwner("/school/onboarding");
  const sp = await searchParams;
  const { data: priv } = school ? await supabase.from("school_private").select("*").eq("school_id", school.id).maybeSingle<SchoolPrivate>() : { data: null };
  const { data: docs } = school ? await supabase.from("documents").select("*").eq("school_id", school.id).returns<Doc[]>() : { data: [] as Doc[] };
  const canEdit = !school || ["draft", "rejected"].includes(school.status);
  const [label, tone] = SCHOOL_LABEL[school?.status ?? "draft"];
  return (
    <main className="page">
      <div className="section-h"><h1>School application</h1>{school ? <Pill label={label} tone={tone} dot /> : null}</div>
      <p className="muted" style={{ maxWidth: "65ch" }}>Three steps: your school&apos;s details, a few documents, then send it to us. We review applications within two working days. After approval you can list your buses.</p>
      {school?.status === "rejected" && school.admin_note ? <div className="notice bad"><div><b>What we need from you:</b> {school.admin_note}</div></div> : null}
      {sp.missing ? <div className="err">Before sending, upload the registration certificate and the signer&apos;s ID, and add where we should pay you.</div> : null}
      <section className="card stack"><h2>1. School details</h2><SchoolForm school={school} priv={priv} defaults={{ name: profile.org_name, contact: profile.full_name, phone: profile.phone, email: user.email ?? "" }} /></section>
      <section className="card stack">
        <h2>2. Documents</h2>
        {school ? (
          <div className="grid g2">
            <DocUpload schoolId={school.id} kind="school_registration" label={DOC_LABEL.school_registration} hint="Or a letter from the head teacher on school letterhead" docs={docs ?? []} />
            <DocUpload schoolId={school.id} kind="id_document" label={DOC_LABEL.id_document} hint="National ID or passport" docs={docs ?? []} />
            <DocUpload schoolId={school.id} kind="board_resolution" label={DOC_LABEL.board_resolution} hint="Recommended. A short signed letter is fine." docs={docs ?? []} />
          </div>
        ) : <p className="small muted">Save your school details first.</p>}
      </section>
      <section className="card stack">
        <h2>3. Send for review</h2>
        {!school ? <p className="small muted">Save your school details first.</p> : canEdit ? (
          <form action={submitSchool} className="row between"><span className="small muted">You&apos;ll get an email when we approve your school.</span><Submit pendingText="Sending…">Send application</Submit></form>
        ) : <div className="row between"><span className="small">{school.status === "verified" ? "Your school is verified." : "We're reviewing your application."}</span><Link className="btn" href="/school">Go to dashboard</Link></div>}
      </section>
    </main>
  );
}
