"use client";

import { useActionState, useEffect, useState } from "react";
import { createStaffBooking, lookupCustomer } from "@/app/admin/bookings/new/actions";
import { BarberAvatar } from "@/components/barber-avatar";
import type { Barber, Service } from "@/db/schema";
import { SHOP } from "@/lib/config";
import { formatBaht, formatThaiDate, minToTime } from "@/lib/time";
import { createBooking, type BookingState } from "./actions";

type Day = { date: string; closed: boolean };
type SlotResult = { key: string; slots: number[]; message?: string };

const PERIODS = [
  { label: "ช่วงเช้า", test: (m: number) => m < 12 * 60 },
  { label: "ช่วงบ่าย", test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { label: "ช่วงเย็น", test: (m: number) => m >= 17 * 60 },
];

export function BookingForm({
  services,
  barbers,
  days,
  initialDate,
  initialServiceId,
  staff = false,
}: {
  services: Service[];
  barbers: Barber[];
  days: Day[];
  initialDate: string;
  initialServiceId: number | null;
  /** โหมดร้านจองให้ลูกค้า: มีช่องข้อมูลลูกค้า จองได้ทันที และไม่เก็บมัดจำ */
  staff?: boolean;
}) {
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId);
  const [barberId, setBarberId] = useState<number | "any">("any");
  const [date, setDate] = useState(initialDate);
  const [refresh, setRefresh] = useState(0);

  // ข้อมูลลูกค้า (โหมดร้าน)
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [member, setMember] = useState<string | null>(null);

  const [state, formAction, submitting] = useActionState<BookingState, FormData>(async (prev, formData) => {
    const result = await (staff ? createStaffBooking : createBooking)(prev, formData);
    if (result.conflict) setRefresh((n) => n + 1); // มีคนจองตัดหน้า → โหลดช่องเวลาใหม่
    return result;
  }, {});

  // key ของชุดข้อมูลช่องเวลา: เปลี่ยนเมื่อไหร่ให้ดึงใหม่ และใช้แยก "ข้อมูลเก่า" ออกจาก "ข้อมูลปัจจุบัน"
  const slotKey = serviceId ? `${serviceId}|${barberId}|${date}|${refresh}` : null;
  const [result, setResult] = useState<SlotResult | null>(null);
  const [picked, setPicked] = useState<{ key: string; startMin: number } | null>(null);

  useEffect(() => {
    if (!slotKey || !serviceId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ serviceId: String(serviceId), barberId: String(barberId), date });
    if (staff) params.set("staff", "1");
    fetch(`/api/slots?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { slots?: number[]; reason?: string; error?: string }) =>
        setResult({ key: slotKey, slots: data.slots ?? [], message: data.reason ?? data.error }),
      )
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err);
          setResult({ key: slotKey, slots: [], message: "โหลดช่องเวลาไม่สำเร็จ กรุณาลองใหม่" });
        }
      });
    return () => controller.abort();
  }, [slotKey, serviceId, barberId, date, staff]);

  const loading = slotKey !== null && result?.key !== slotKey;
  const slots = !loading && result ? result.slots : [];
  const startMin = picked && picked.key === slotKey ? picked.startMin : null;

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);
  const customerReady = !staff || (/^0\d{8,9}$/.test(customerPhone.replace(/[\s-]/g, "")) && customerName.trim().length >= 2);
  const ready = service && startMin !== null && customerReady;
  const step = (n: number) => n + (staff ? 1 : 0);
  const deposit = service ? Math.min(SHOP.depositAmount, service.price) : SHOP.depositAmount;

  return (
    <form action={formAction} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="serviceId" value={serviceId ?? ""} />
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startMin" value={startMin ?? ""} />

      <div className="min-w-0 space-y-8">
        {staff && (
          <Step n={1} title="ข้อมูลลูกค้า">
            <div className="card grid gap-4 p-4 sm:grid-cols-2">
              <label>
                <span className="label">เบอร์โทรศัพท์</span>
                <input
                  name="customerPhone"
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  placeholder="0812345678"
                  className="input"
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (member) {
                      setMember(null);
                      setCustomerName("");
                    }
                  }}
                  onBlur={async () => {
                    // ถ้าเบอร์นี้มีบัญชีอยู่แล้ว เติมชื่อให้เลย
                    const found = await lookupCustomer(customerPhone);
                    setMember(found?.name ?? null);
                    if (found) setCustomerName(found.name);
                  }}
                />
              </label>
              <label>
                <span className="label">ชื่อลูกค้า</span>
                <input
                  name="customerName"
                  value={customerName}
                  readOnly={!!member}
                  placeholder="เช่น คุณเอ"
                  className="input read-only:bg-stone-50"
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </label>
              <p className="text-xs text-muted sm:col-span-2" data-testid="member-hint">
                {member
                  ? `✓ ลูกค้ามีบัญชีอยู่แล้ว คิวจะไปแสดงในหน้า "คิวของฉัน" ของลูกค้าด้วย`
                  : "ถ้าเบอร์นี้เคยสมัครสมาชิก ระบบจะเติมชื่อให้อัตโนมัติ"}
              </p>
            </div>
          </Step>
        )}

        <Step n={step(1)} title="เลือกบริการ">
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setServiceId(s.id)}
                aria-pressed={serviceId === s.id}
                className="card p-4 text-left transition hover:border-stone-400 aria-pressed:border-brass aria-pressed:bg-brass-soft aria-pressed:ring-1 aria-pressed:ring-brass"
              >
                <div className="flex justify-between gap-2 font-medium">
                  <span>{s.name}</span>
                  <span className="text-brass-dark">{formatBaht(s.price)}</span>
                </div>
                <div className="mt-1 text-xs text-muted">⏱ {s.durationMin} นาที</div>
              </button>
            ))}
          </div>
        </Step>

        <Step n={step(2)} title="เลือกช่าง">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBarberId("any")}
              aria-pressed={barberId === "any"}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm transition hover:border-stone-400 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              ✨ ช่างคนไหนก็ได้
            </button>
            {barbers.map((b) => (
              <button
                type="button"
                key={b.id}
                onClick={() => setBarberId(b.id)}
                aria-pressed={barberId === b.id}
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-4 pl-1 text-sm transition hover:border-stone-400 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                <BarberAvatar barber={b} className="size-7 text-xs" decorative />
                {b.name}
              </button>
            ))}
          </div>
        </Step>

        <Step n={step(3)} title="เลือกวัน">
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
            {days.map((d) => {
              const dt = new Date(`${d.date}T00:00:00Z`);
              const fmt = (o: Intl.DateTimeFormatOptions) =>
                new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", ...o }).format(dt);
              return (
                <button
                  type="button"
                  key={d.date}
                  data-date={d.date}
                  disabled={d.closed}
                  onClick={() => setDate(d.date)}
                  aria-pressed={date === d.date}
                  className="flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border border-line bg-white py-2.5 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  <span className="text-xs">{fmt({ weekday: "short" })}</span>
                  <span className="font-display text-xl font-semibold">{dt.getUTCDate()}</span>
                  <span className="text-[11px] opacity-70">{d.closed ? "ปิด" : fmt({ month: "short" })}</span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={step(4)} title="เลือกเวลา">
          {!service ? (
            <Hint>เลือกบริการก่อน แล้วระบบจะแสดงเวลาว่าง</Hint>
          ) : loading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-200/70" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Hint>{result?.message ?? "วันนี้คิวเต็มแล้ว ลองเลือกวันอื่นหรือช่างคนอื่นดูนะ"}</Hint>
          ) : (
            <div className="space-y-4">
              {PERIODS.map((p) => {
                const list = slots.filter(p.test);
                if (list.length === 0) return null;
                return (
                  <div key={p.label}>
                    <div className="mb-2 text-xs font-medium text-muted">{p.label}</div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {list.map((m) => (
                        <button
                          type="button"
                          key={m}
                          data-slot={m}
                          onClick={() => setPicked({ key: slotKey!, startMin: m })}
                          aria-pressed={startMin === m}
                          className="rounded-lg border border-line bg-white py-2 text-sm font-medium tabular-nums transition hover:border-brass aria-pressed:border-brass aria-pressed:bg-brass aria-pressed:text-white"
                        >
                          {minToTime(m)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Step>

        <Step n={step(5)} title="หมายเหตุถึงช่าง (ไม่บังคับ)">
          <textarea
            name="note"
            rows={2}
            maxLength={200}
            placeholder="เช่น อยากได้ทรงรองทรงสูง ด้านข้างสั้น"
            className="input resize-none"
          />
        </Step>
      </div>

      {/* สรุปการจอง */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="barber-stripe h-1.5" />
          <div className="p-5">
            <h2 className="font-display text-lg font-semibold">สรุปการจอง</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {staff && <Row label="ลูกค้า" value={customerName.trim() || undefined} />}
              <Row label="บริการ" value={service?.name} />
              <Row label="ช่าง" value={barber?.name ?? "ช่างคนไหนก็ได้"} />
              <Row label="วันที่" value={formatThaiDate(date)} />
              <Row
                label="เวลา"
                value={service && startMin !== null ? `${minToTime(startMin)}–${minToTime(startMin + service.durationMin)} น.` : undefined}
              />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-4">
              <span className="text-sm text-muted">ราคา</span>
              <span className="font-display text-2xl font-semibold">{service ? formatBaht(service.price) : "–"}</span>
            </div>

            {state.error && (
              <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <button type="submit" className="btn-brass mt-5 w-full py-3" disabled={!ready || submitting}>
              {submitting ? "กำลังบันทึก..." : staff ? "บันทึกคิวให้ลูกค้า" : "ยืนยันการจอง"}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              {staff
                ? "คิวจะถูกยืนยันทันที ไม่เก็บมัดจำออนไลน์"
                : SHOP.depositAmount > 0
                  ? `มัดจำ ${formatBaht(deposit)} ผ่านพร้อมเพย์หลังจอง ส่วนที่เหลือชำระที่ร้าน`
                  : "ชำระเงินที่ร้านหลังรับบริการ"}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-paper">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="slot-hint"
      className="rounded-xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted"
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium ${value ? "" : "text-stone-300"}`}>{value ?? "ยังไม่ได้เลือก"}</dd>
    </div>
  );
}
