import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSchoolOwner } from "@/lib/auth";
import { BusForm } from "@/components/BusForm";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Add a bus" };
export default async function NewBus() {
  const { school } = await requireSchoolOwner("/school/buses/new");
  if (!school) redirect("/school/onboarding");
  return (
    <main className="page">
      <Link className="link" href="/school"><Icon name="back" />Dashboard</Link>
      <h1>Add a bus</h1>
      <div className="card"><BusForm /></div>
    </main>
  );
}
