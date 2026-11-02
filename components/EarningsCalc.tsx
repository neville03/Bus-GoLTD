"use client";
import { useState } from "react";
import { SEAT_SIZES, suggestedDaily, ugx } from "@/lib/format";

export function EarningsCalc({ commission, driverBonus }: { commission: number; driverBonus: number }) {
  const [seats, setSeats] = useState(33);
  const [days, setDays] = useState(8);
  const keep = suggestedDaily(seats) * days * (1 - commission / 100) - driverBonus * days;
  return (
    <div className="calc">
      <label className="f" htmlFor="c-seats">Bus size
        <select className="inp" id="c-seats" value={seats} onChange={(e) => setSeats(+e.target.value)}>
          {SEAT_SIZES.map((n) => <option key={n} value={n}>{n} seats</option>)}
        </select>
      </label>
      <label className="f" htmlFor="c-days">Days hired per month: <b style={{ color: "var(--ink)" }}>{days}</b>
        <input type="range" id="c-days" min={2} max={20} value={days} onChange={(e) => setDays(+e.target.value)} />
      </label>
      <hr className="sep" />
      <div>
        <span className="small muted">Your school keeps about</span>
        <div className="big num">{ugx(keep)}</div>
        <span className="small muted">per month · {ugx(keep * 12)} a year. Estimate based on typical Kampala day rates; you set your own prices.</span>
      </div>
    </div>
  );
}
