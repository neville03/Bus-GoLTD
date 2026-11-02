import Link from "next/link";
import { Icon } from "./Icon";
import { ugx } from "@/lib/format";
import type { Bus } from "@/lib/types";

export function BusPhoto({ bus, className = "bus-photo" }: { bus: Pick<Bus, "photos" | "make_model">; className?: string }) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bus.photos[0] ? <img src={bus.photos[0]} alt={bus.make_model} loading="lazy" /> : <Icon name="bus" size={40} />}
    </div>
  );
}

export function BusCard({ bus, schoolName, taken, href }: { bus: Bus; schoolName: string; taken?: string | null; href: string }) {
  const feats = [bus.has_ac && "AC", bus.has_seatbelts && "Seatbelts", bus.has_gps && "GPS tracked", bus.driver_included && "Driver included"].filter(Boolean) as string[];
  return (
    <Link className={`bus ${taken ? "off" : ""}`} href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <BusPhoto bus={bus} />
      <div className="body">
        <h3>{bus.seats}-seat {bus.make_model}</h3>
        <div className="small muted">{schoolName} <span className="verified"><Icon name="shield" size={13} />Verified</span></div>
        <div className="chips">{feats.map((f) => <span key={f} className="pill">{f}</span>)}</div>
        <div className="price num" style={{ marginTop: 4 }}>{ugx(bus.daily_ugx)} <span>/ day</span></div>
        {taken === undefined ? null : taken ? <div className="small muted">{taken}</div> : <div className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>Free on your dates</div>}
      </div>
    </Link>
  );
}
