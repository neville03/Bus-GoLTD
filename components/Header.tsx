import Link from "next/link";
import { getSession, isConfigured } from "@/lib/auth";
import { Icon } from "./Icon";

export async function Header() {
  let profile = null;
  try { profile = isConfigured() ? (await getSession()).profile : null; } catch { profile = null; } // never break the header
  const home = profile?.role === "admin" ? ["/admin", "Admin"] : profile?.role === "school" ? ["/school", "School dashboard"] : ["/account", "My bookings"];
  return (
    <header className="top">
      <div className="top-in">
        <div className="top-row">
          <Link className="logo" href="/" aria-label="Bus&Go home">
            <span className="logo-mark"><Icon name="bus" size={18} /></span>Bus&amp;Go <small>Ltd</small>
          </Link>
          <nav className="nav" aria-label="Main">
            <Link className="link hide-sm" href="/buses">Find a bus</Link>
            <Link className="link hide-sm" href="/schools">For schools</Link>
            {profile ? (
              <>
                <Link className="btn sm" href={home[0]}>{home[1]}</Link>
                <form action="/auth/signout" method="post"><button className="btn sm" type="submit">Sign out</button></form>
              </>
            ) : (
              <>
                <Link className="btn sm" href="/login">Sign in</Link>
                <Link className="btn sm primary" href="/buses">Hire a bus</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
