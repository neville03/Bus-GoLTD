import Link from "next/link";
import { EarningsCalc } from "@/components/EarningsCalc";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "List your school bus" };
export default async function Schools() {
  const s = await getSettings();
  const commission = Number(s?.commission_pct ?? 15);
  return (
    <main className="landing">
      <section className="wrap l-hero">
        <div className="stack l">
          <span className="eyebrow">For schools</span>
          <h1>Earn from your school bus on the days it would stand still</h1>
          <p className="lead">List your bus for weekends and holidays. You choose the days, approve every booking, and get paid after each trip.</p>
          <div className="row"><Link className="btn primary lg" href="/signup?as=school">Create a school account</Link><Link className="btn lg" href="/login?next=/school">Sign in</Link></div>
        </div>
        <EarningsCalc commission={commission} driverBonus={s?.driver_bonus_ugx ?? 30000} />
      </section>
      <section className="band soft">
        <div className="wrap l-two" style={{ alignItems: "start" }}>
          <div className="stack">
            <h2 className="l-h2">What you&apos;ll need</h2>
            <p className="muted">Take photos with your phone. You can save and finish later.</p>
            <div className="list">
              {[["School registration certificate", "Or a letter from the head teacher on school letterhead"],
                ["Board or director approval", "A short letter allowing the school to hire out its buses"],
                ["ID of the person signing", "National ID or passport"],
                ["For each bus: logbook and insurance", "Plus 3–6 photos: outside, inside, seats"],
                ["Payout details", "MTN or Airtel Mobile Money number, or a bank account in the school's name"]].map(([t, d]) => (
                <div className="li" key={t}><div className="main"><b>{t}</b><span className="small muted">{d}</span></div><Icon name="doc" size={18} /></div>))}
            </div>
          </div>
          <div className="stack">
            <h2 className="l-h2">How payment works</h2>
            <div className="steps3">
              <div><b>Set your own prices</b><span className="muted">Daily, weekly and monthly rates. We suggest prices by bus size.</span></div>
              <div><b>The hirer pays Bus&amp;Go</b><span className="muted">A deposit when you accept, the balance before the trip.</span></div>
              <div><b>You&apos;re paid after the trip</b><span className="muted">The total minus our {commission}% commission, to your school&apos;s mobile money or bank account.</span></div>
            </div>
          </div>
        </div>
      </section>
      <Footer settings={s} />
    </main>
  );
}
