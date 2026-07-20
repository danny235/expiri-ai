import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";

const FEATURES = [
  { icon: "📷", title: "Scan, don't type", body: "Point your camera at any product. AI reads the name, expiry date and batch/lot number and logs it in seconds." },
  { icon: "🚦", title: "Know what to act on", body: "Every item is graded — Expired, Expiring soon, Return window, Safe — so staff act on the right stock first." },
  { icon: "💸", title: "Recover supplier credit", body: "Get flagged while stock is still inside the return window, so near-expiry goods go back for credit instead of the bin." },
  { icon: "🔔", title: "Alerts before it's too late", body: "A daily digest of what needs attention, on your schedule — 7, 30 or 90 days out. No more shelf-by-shelf date checks." }
];

const PERSONAS = [
  { who: "Pharmacies", pain: "Legal duty to pull expired meds, costly write-offs, audit exposure." },
  { who: "Supermarkets", pain: "Perishables spoiling unnoticed and margin lost to waste." },
  { who: "Hospitals", pain: "Medical-supply validity that must never lapse." },
  { who: "Procurement", pain: "Stock validity across many departments in one view." }
];

const STATS = [
  { value: "60s", label: "Scan to logged" },
  { value: "90d", label: "Return-window alerts" },
  { value: "4", label: "Urgency levels" },
  { value: "24/7", label: "Auto-monitoring" }
];

const PREVIEW_ROWS = [
  { name: "Amoxicillin 500mg", meta: "lot AMX2394 · Shelf B2", label: "Expired", dot: "bg-red-500", chip: "bg-red-500/15 text-red-300" },
  { name: "Paracetamol Syrup", meta: "lot PCM8821 · Shelf A1", label: "Expiring soon", dot: "bg-amber-400", chip: "bg-amber-400/15 text-amber-200" },
  { name: "Insulin Glargine", meta: "lot INS4410 · Fridge 1", label: "Return window", dot: "bg-blue-400", chip: "bg-blue-400/15 text-blue-200" }
];

export default function Landing() {
  return (
    <main className="w-full overflow-x-hidden">
      {/* ================= HERO (dark, animated) ================= */}
      <section className="relative overflow-hidden bg-ink pb-24 pt-6 text-white">
        {/* animated background layers */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-pulse-slow absolute -left-24 top-6 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
          <div className="animate-pulse-slow absolute right-0 top-40 h-96 w-96 rounded-full bg-brandcyan/20 blur-3xl [animation-delay:1.5s]" />
          <div className="animate-pulse-slow absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl [animation-delay:3s]" />
          <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="bg-noise absolute inset-0 opacity-50" />
        </div>

        {/* nav */}
        <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">Expiri<span className="text-brandcyan">.ai</span></span>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden text-sm font-medium text-white/70 hover:text-white sm:block">Pricing</a>
            <Link href="/app" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Try the demo</Link>
          </div>
        </nav>

        {/* hero content */}
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pt-10 lg:grid-cols-2 lg:pt-16">
          <div>
            <div className="inline-flex animate-[fade-in_0.7s_ease-out_both] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brandcyan backdrop-blur">
              <span className="animate-blink">✦</span> AI expiry tracking for pharmacies, stores &amp; hospitals
            </div>
            <h1 className="mt-6 animate-[fade-in_0.7s_ease-out_0.1s_both] text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Scan your stock.<br />Never write off <span className="brand-gradient-text">expired product</span> again.
            </h1>
            <p className="mt-6 max-w-lg animate-[fade-in_0.7s_ease-out_0.2s_both] text-lg text-white/70">
              Expiri.ai reads expiry dates straight from the package, tracks every item, and warns you in time to sell
              it through — or return it to the supplier for credit before it becomes a loss.
            </p>
            <div className="mt-8 flex animate-[fade-in_0.7s_ease-out_0.3s_both] flex-wrap items-center gap-3">
              <Link href="/app" className="shimmer relative overflow-hidden rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Try the live demo →
              </Link>
              <a href="#how" className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
                See how it works
              </a>
            </div>
            <div className="mt-8 grid max-w-md animate-[fade-in_0.7s_ease-out_0.4s_both] grid-cols-4 gap-3">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white"><CountUp value={s.value} /></div>
                  <div className="mt-1 text-[11px] leading-tight text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* floating live-preview card with scan line */}
          <div className="relative animate-[fade-in_0.8s_ease-out_0.35s_both]">
            <div className="animate-float relative mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
              {/* scan line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden rounded-2xl">
                <div className="animate-scan absolute inset-x-3 h-16 rounded-full bg-gradient-to-b from-transparent via-brandcyan/25 to-transparent blur-md" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Today · action needed</div>
                <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-medium text-brandcyan">3</span>
              </div>
              <div className="relative mt-4 space-y-2.5">
                {PREVIEW_ROWS.map((r, i) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 animate-[fade-in_0.6s_ease-out_both]"
                    style={{ animationDelay: `${0.5 + i * 0.15}s` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
                      <div>
                        <div className="text-sm font-medium text-white">{r.name}</div>
                        <div className="text-[11px] text-white/40">{r.meta}</div>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.chip}`}>{r.label}</span>
                  </div>
                ))}
              </div>
              <div className="relative mt-4 flex items-center gap-2 text-[11px] text-white/40">
                <span className="animate-blink text-brandcyan">●</span> Scanning shelf inventory…
              </div>
            </div>
            {/* floating chips */}
            <div className="animate-float-delayed absolute -right-3 -top-3 rounded-xl border border-white/10 bg-ink2/80 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
              💸 $420 saved this week
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-900">Expired stock is a silent, recurring loss</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Pharmacies, supermarkets and hospitals lose money to product that quietly ages out on the shelf — and
              selling expired goods carries real legal risk. Today the check is manual: someone walks the aisles reading
              tiny dates. Things get missed. Expiri.ai makes that check automatic.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <Reveal><h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2></Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= PERSONAS ================= */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal><h2 className="text-center text-2xl font-bold text-slate-900">Built for anyone managing expiry-sensitive stock</h2></Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p, i) => (
              <Reveal key={p.who} delay={i * 100}>
                <div className="h-full rounded-2xl border border-slate-200 p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                  <h3 className="font-semibold text-slate-900">{p.who}</h3>
                  <p className="mt-2 text-sm text-slate-600">{p.pain}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-bold text-slate-900">Simple, per-location pricing</h2>
          <p className="mt-2 text-center text-slate-600">Start free. Pay when it&apos;s saving you money.</p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="font-semibold text-slate-900">Free</h3>
              <p className="mt-1 text-3xl font-bold text-slate-900">$0</p>
              <p className="mt-1 text-sm text-slate-500">Get started, prove the value.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>✓ Track up to 10 items</li>
                <li>✓ AI scan &amp; manual entry</li>
                <li>✓ Expiry status dashboard</li>
                <li>✓ Weekly alert digest</li>
              </ul>
              <Link href="/app" className="mt-6 block rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold hover:bg-slate-50">Try it free</Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-brand bg-white p-8">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Business</h3>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-brand">per location</span>
              </div>
              <p className="mt-1 text-3xl font-bold text-slate-900">$29–79<span className="text-base font-normal text-slate-500">/mo</span></p>
              <p className="mt-1 text-sm text-slate-500">Everything to run it for real.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>✓ Unlimited items</li>
                <li>✓ Return-window credit alerts</li>
                <li>✓ Daily email alerts &amp; custom timing</li>
                <li>✓ Batch/lot tracking &amp; reports</li>
              </ul>
              <Link href="/app" className="mt-6 block rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500">Start now</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-12 text-center text-white">
            <div className="bg-noise pointer-events-none absolute inset-0 opacity-40" />
            <div className="animate-pulse-slow pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-brand/25 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold">See your first expiry alert in 60 seconds</h2>
              <p className="mx-auto mt-2 max-w-xl text-white/70">Open the demo, scan a product (or use the sample stock), and watch it grade every item by urgency.</p>
              <Link href="/app" className="shimmer relative mt-6 inline-block overflow-hidden rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">Open the demo →</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        Expiri.ai — Scan. Track. Never write off expired stock again.
      </footer>
    </main>
  );
}
