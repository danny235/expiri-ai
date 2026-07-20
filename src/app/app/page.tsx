"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item, ScanResult, Settings } from "@/lib/types";

type Urgency = "expired" | "expiring_soon" | "return_window" | "ok";

const META: Record<Urgency, { label: string; badge: string; dot: string; blurb: string }> = {
  expired: { label: "Expired", badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", blurb: "Remove from shelf now" },
  expiring_soon: { label: "Expiring soon", badge: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500", blurb: "Sell-through / discount / use first" },
  return_window: { label: "Return window", badge: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", blurb: "Return to supplier for credit" },
  ok: { label: "Safe", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", blurb: "No action needed" }
};

function daysUntil(expiryDate: string): number {
  const exp = new Date(expiryDate + "T00:00:00");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exp.getTime() - start.getTime()) / 86400000);
}

function urgencyOf(item: Item, s: Settings): Urgency {
  const d = daysUntil(item.expiryDate);
  if (d < 0) return "expired";
  if (d <= s.nearExpiryDays) return "expiring_soon";
  if (d <= s.returnWindowDays) return "return_window";
  return "ok";
}

const emptyForm: ScanResult & { location: string; supplier: string } = {
  name: "",
  category: "",
  expiryDate: "",
  quantity: 1,
  batchLot: "",
  confidence: "high",
  location: "",
  supplier: ""
};

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<{ storage?: string; scan?: string }>({});
  const [usage, setUsage] = useState<{ count: number; limit: number | null; plan: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [digestPreview, setDigestPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data.items);
    setSettings(data.settings);
    if (data.mode) setMode(data.mode);
    setUsage(data.usage ?? null);
    setLoading(false);
  }, []);

  const atLimit = Boolean(usage && usage.limit !== null && usage.count >= usage.limit);

  useEffect(() => {
    load();
  }, [load]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanNote(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      const r: ScanResult = data.result;
      setMode((m) => ({ ...m, scan: data.mode }));
      setForm({ ...emptyForm, ...r });
      setScanNote(data.mode === "mock" ? "Demo scan (no API key set) — edit the fields as needed." : r.note || null);
      setShowForm(true);
    } catch (err) {
      setScanNote(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveItem() {
    if (!form.name || !form.expiryDate) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        batchLot: form.batchLot,
        location: form.location,
        supplier: form.supplier
      })
    });
    if (res.status === 402) {
      const data = await res.json();
      setScanNote(data.error);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setScanNote(null);
    load();
  }

  async function removeItem(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    load();
  }

  async function saveSettings(next: Settings) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    const data = await res.json();
    setSettings(data.settings);
    load();
  }

  async function sendDigest() {
    const res = await fetch("/api/notify");
    const data = await res.json();
    setDigestPreview(data.preview + (data.emailed ? `\n\n✓ Emailed to ${data.to}` : "\n\n(no email sent — set RESEND_API_KEY + notify email)"));
  }

  const counts = { expired: 0, expiring_soon: 0, return_window: 0, ok: 0 };
  if (settings) for (const it of items) counts[urgencyOf(it, settings)]++;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <a href="/" className="text-xl font-bold tracking-tight">Expiri<span className="text-blue-600">.ai</span></a>
          <p className="text-sm text-slate-500">Inventory expiry dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          {mode.storage && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">storage: {mode.storage}</span>}
          <button onClick={() => setShowSettings(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Settings</button>
        </div>
      </header>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["expired", "expiring_soon", "return_window", "ok"] as Urgency[]).map((u) => (
          <div key={u} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${META[u].dot}`} />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{META[u].label}</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{counts[u]}</div>
          </div>
        ))}
      </div>

      {/* Upgrade banner at the free-plan cap */}
      {atLimit && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-900">
            <span className="font-semibold">Free plan full — {usage?.count}/{usage?.limit} items.</span>{" "}
            Upgrade to Business for unlimited tracking, return-window alerts and reports.
          </div>
          <a href="/#pricing" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Upgrade</a>
        </div>
      )}

      {/* Add */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning || atLimit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? "Scanning…" : "📷 Scan a product"}
          </button>
          <button
            onClick={() => { setForm(emptyForm); setShowForm((s) => !s); setScanNote(null); }}
            disabled={atLimit}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            + Add manually
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickImage} className="hidden" />
          {usage && usage.limit !== null && (
            <span className={`ml-auto text-xs font-medium ${atLimit ? "text-blue-700" : "text-slate-400"}`}>
              {usage.count}/{usage.limit} items · Free plan
            </span>
          )}
          {scanNote && <span className="w-full text-sm text-amber-700">{scanNote}</span>}
        </div>

        {showForm && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product name *"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amoxicillin 500mg" /></Field>
            <Field label="Category"><input className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Medication" /></Field>
            <Field label="Expiry date *"><input type="date" className={inp} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
            <Field label="Quantity"><input type="number" min={1} className={inp} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
            <Field label="Batch / lot no."><input className={inp} value={form.batchLot} onChange={(e) => setForm({ ...form, batchLot: e.target.value })} placeholder="AMX2394" /></Field>
            <Field label="Location"><input className={inp} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Shelf B2" /></Field>
            <Field label="Supplier"><input className={inp} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="MedSupply Co" /></Field>
            <div className="flex items-end gap-2">
              <button onClick={saveItem} disabled={!form.name || !form.expiryDate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Save item</button>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No items yet — scan a product or add one manually.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {settings && items.map((it) => {
                const u = urgencyOf(it, settings);
                const d = daysUntil(it.expiryDate);
                return (
                  <tr key={it.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-slate-400">
                        {it.category}{it.quantity ? ` · x${it.quantity}` : ""}{it.batchLot ? ` · lot ${it.batchLot}` : ""}{it.location ? ` · ${it.location}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{it.expiryDate}</div>
                      <div className="text-xs text-slate-400">{d < 0 ? `${-d}d ago` : `in ${d}d`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${META[u].badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${META[u].dot}`} />{META[u].label}
                      </span>
                      <div className="mt-1 text-xs text-slate-400">{META[u].blurb}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeItem(it.id)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4">
        <button onClick={sendDigest} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Preview daily alert digest
        </button>
        {digestPreview && (
          <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">{digestPreview}</pre>
        )}
      </div>

      {showSettings && settings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={saveSettings} />
      )}
    </div>
  );
}

const inp = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SettingsModal({ settings, onClose, onSave }: { settings: Settings; onClose: () => void; onSave: (s: Settings) => void }) {
  const [s, setS] = useState(settings);
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Notification settings</h2>
        <div className="space-y-3">
          <Field label="Notify email"><input className={inp} value={s.notifyEmail} onChange={(e) => setS({ ...s, notifyEmail: e.target.value })} placeholder="pharmacy@example.com" /></Field>
          <Field label="Alert when expiry is within (days)"><input type="number" min={1} className={inp} value={s.nearExpiryDays} onChange={(e) => setS({ ...s, nearExpiryDays: Number(e.target.value) })} /></Field>
          <Field label="Supplier return window (days before expiry)"><input type="number" min={1} className={inp} value={s.returnWindowDays} onChange={(e) => setS({ ...s, returnWindowDays: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => { onSave(s); onClose(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}
