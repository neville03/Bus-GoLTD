import Link from "next/link";
import { Icon } from "./Icon";
import type { Settings } from "@/lib/types";

export function Footer({ settings }: { settings: Settings | null }) {
  return (
    <footer className="foot">
      <div className="wrap foot-g">
        <div className="stack s">
          <span className="logo"><span className="logo-mark"><Icon name="bus" size={18} /></span>Bus&amp;Go <small>Ltd</small></span>
          <span className="small muted">Kampala, Uganda</span>
          {settings?.support_phone ? <span className="small">Call {settings.support_phone}</span> : null}
          {settings?.support_whatsapp ? <span className="small">WhatsApp {settings.support_whatsapp}</span> : null}
          {settings?.support_email ? <span className="small">{settings.support_email}</span> : null}
        </div>
        <div className="stack s"><b className="small">Hire</b><Link className="small" href="/buses">Find a bus</Link><Link className="small" href="/#safety">Safety</Link><Link className="small" href="/terms">Hire terms</Link></div>
        <div className="stack s"><b className="small">Schools</b><Link className="small" href="/schools">List your bus</Link><Link className="small" href="/signup?as=school">Create a school account</Link></div>
        <div className="stack s"><b className="small">Company</b><Link className="small" href="/privacy">Privacy</Link><span className="small muted">&copy; {new Date().getFullYear()} Bus&amp;Go Ltd</span></div>
      </div>
    </footer>
  );
}
