import Link from "next/link";
export default function NotFound() {
  return <main className="page"><div className="narrow stack"><h1>Page not found</h1><p className="muted">This bus or page isn&apos;t available any more.</p><Link className="btn primary" href="/buses">Find a bus</Link></div></main>;
}
