import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EarningsCalc } from "@/components/EarningsCalc";
import { Footer } from "@/components/Footer";
import { getSettings } from "@/lib/settings";
import { addDays, todayKampala } from "@/lib/format";

const USES = [
  ["Churches", "Retreats, conventions, weekend services", "33–60 seats"],
  ["Schools", "Trips, sports days, competitions", "25–60 seats"],
  ["Weddings and funerals", "Move family and guests together", "14–60 seats"],
  ["Companies and SACCOs", "Staff trips, team days, AGMs", "18–60 seats"],
  ["Tour operators", "Day trips and safaris across Uganda", "25–60 seats"],
  ["NGOs and field programmes", "Outreach by the week or month", "14–45 seats"],
];
const SAFE = [
  ["wrench", "Inspected before listing", "A partner mechanic checks every bus before it goes live on Bus&Go."],
  ["shield", "Insurance checked", "Schools upload their insurance certificate and we confirm it before approval."],
  ["users", "Known drivers", "Each bus comes with the school's own experienced driver, named on the listing."],
  ["doc", "Clear agreement", "Prices, dates and terms are agreed in writing before any money moves."],
  ["money", "Deposit through Bus&Go", "You pay a deposit to Bus&Go, not to a stranger. The school is paid after the trip."],
];
const AREAS = ["Ntinda", "Kololo", "Bugolobi", "Muyenga", "Naalya", "Kira", "Nansana", "Kawempe", "Rubaga", "Makindye", "Wakiso", "Mukono", "Entebbe", "Kajjansi"];

export default async function Home() {
  const settings = await getSettings();
  const start = addDays(todayKampala(), 7);
  return (
    <main className="landing">
      <section className="wrap l-hero">
        <div className="stack l">
          <span className="eyebrow"><span className="live"></span>Now onboarding schools and hirers in Kampala, Wakiso, Mukono and Entebbe</span>
          <h1>Hire a safe school bus in Kampala by the day, week or month</h1>
          <p className="lead">Bus&amp;Go connects churches, companies, tour groups and schools with inspected buses that schools aren&apos;t using. Pay your deposit with MTN or Airtel Mobile Money.</p>
          <form className="qs" action="/buses" method="get">
            <label className="f" htmlFor="l-from">From<input className="inp" type="date" id="l-from" name="from" defaultValue={start} /></label>
            <label className="f" htmlFor="l-to">To<input className="inp" type="date" id="l-to" name="to" defaultValue={start} /></label>
            <label className="f" htmlFor="l-pax">People<input className="inp num" type="number" id="l-pax" name="pax" min={1} max={90} defaultValue={30} /></label>
            <button className="btn primary lg" type="submit">Find a bus</button>
          </form>
          <div className="row small muted"><Icon name="check" size={14} />No booking fee <Icon name="check" size={14} />Driver included <Icon name="check" size={14} />Pay by mobile money</div>
        </div>
        <div className="photo" style={{ aspectRatio: "4/3" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/fleet.jpg" alt="Three coaches parked in a row" width={1800} height={822} />
          <div className="tag"><span style={{ color: "var(--ok)" }}><Icon name="shield" size={22} /></span><span><b>Inspected before listing</b>Every bus, every school</span></div>
        </div>
      </section>

      <section className="band" id="how">
        <div className="wrap l-two" style={{ alignItems: "start" }}>
          <div className="stack">
            <span className="eyebrow">How it works</span>
            <h2 className="l-h2">Book in minutes. Travel with the school&apos;s own driver.</h2>
            <div className="steps3">
              <div><b>Search by date and size</b><span className="muted">See buses that are free on your dates, from 14-seaters to 60-seat coaches.</span></div>
              <div><b>Send a request</b><span className="muted">The school confirms within a day. Then you pay a deposit by mobile money to Bus&amp;Go.</span></div>
              <div><b>Travel</b><span className="muted">The driver picks you up on the day. Pay the balance before the trip.</span></div>
            </div>
            <div className="row"><Link className="btn primary" href="/buses">Find a bus</Link></div>
          </div>
          <div className="stack" id="schools">
            <span className="eyebrow">For schools</span>
            <h2 className="l-h2">Your bus earns on the days it would stand still.</h2>
            <div className="steps3">
              <div><b>Create an account and add your buses</b><span className="muted">Upload the logbook, insurance and photos from your phone.</span></div>
              <div><b>We check and approve</b><span className="muted">We verify your documents and arrange an inspection with a partner mechanic.</span></div>
              <div><b>Accept the trips you want</b><span className="muted">Block term-time days. You approve every booking, and we pay you after each trip.</span></div>
            </div>
            <div className="row"><Link className="btn" href="/schools">List your bus</Link></div>
          </div>
        </div>
      </section>

      <section className="band soft">
        <div className="wrap l-two">
          <div className="photo" style={{ aspectRatio: "1/1" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/minibus.jpg" alt="A minibus carrying a group of passengers" width={1100} height={1100} loading="lazy" />
          </div>
          <div className="stack">
            <span className="eyebrow">Who hires on Bus&amp;Go</span>
            <h2 className="l-h2">One bus for the whole group, whatever the occasion.</h2>
            <div className="uses">{USES.map(([t, d, s]) => <div key={t}><b>{t}</b><span className="small muted">{d}</span><span className="tiny" style={{ fontWeight: 600 }}>{s}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section className="band" id="safety">
        <div className="wrap stack l">
          <div className="stack s"><span className="eyebrow">Safety</span><h2 className="l-h2">Every trip starts with a checked bus.</h2></div>
          <div className="safe">{SAFE.map(([i, t, d]) => <div key={t}><span className="ico"><Icon name={i} size={20} /></span><b>{t}</b><span className="small muted">{d}</span></div>)}</div>
        </div>
      </section>

      <section className="band soft">
        <div className="wrap l-two">
          <div className="stack">
            <span className="eyebrow">For bursars and head teachers</span>
            <h2 className="l-h2">See what your idle bus could earn.</h2>
            <p className="muted">After our {settings?.commission_pct ?? 15}% commission and the driver&apos;s trip bonus. School runs always come first: you choose which days are open.</p>
            <div className="row"><Link className="btn primary" href="/signup?as=school">List your bus</Link><span className="small muted">No listing fee</span></div>
          </div>
          <EarningsCalc commission={Number(settings?.commission_pct ?? 15)} driverBonus={settings?.driver_bonus_ugx ?? 30000} />
        </div>
      </section>

      <section className="band">
        <div className="wrap l-two">
          <div className="stack">
            <span className="eyebrow">Coming soon</span>
            <h2 className="l-h2">Holiday trips and special projects.</h2>
            <p className="muted">Educational day trips with transport included, holiday pickup for working parents, and month-long bus conversions such as mobile classrooms and studios. Tell us what you need and we&apos;ll be in touch.</p>
            {settings?.support_whatsapp ? <div className="row"><a className="btn" href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "").replace(/^0/, "256")}`}>Message us on WhatsApp</a></div> : null}
          </div>
          <div className="photo" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/coaches.jpg" alt="Two coaches parked for a group tour" width={1400} height={1003} loading="lazy" />
          </div>
        </div>
      </section>

      <section className="band soft">
        <div className="wrap stack">
          <div className="section-h"><h2 className="l-h2" style={{ maxWidth: "none" }}>Where we pick up</h2><span className="small muted">More districts as schools join</span></div>
          <div className="areas">{AREAS.map((a) => <span key={a} className="pill" style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "7px 14px", fontSize: 14, color: "var(--ink)" }}><Icon name="pin" size={14} />{a}</span>)}</div>
        </div>
      </section>
      <Footer settings={settings} />
    </main>
  );
}
