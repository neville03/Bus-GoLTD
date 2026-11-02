import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create an account" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ as?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="page"><div className="narrow card stack">
      <h1>Create your Bus&amp;Go account</h1>
      <SignupForm initialRole={sp.as === "school" ? "school" : "customer"} next={sp.next ?? ""} />
    </div></main>
  );
}
