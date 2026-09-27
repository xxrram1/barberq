import { and, asc, eq, gte } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/feedback";
import { SubmitButton } from "@/components/ui";
import { db } from "@/db";
import { barberSchedules, barberTimeOff, barbers } from "@/db/schema";
import { SHOP } from "@/lib/config";
import { timeOptions, WEEKDAY_NAMES } from "@/lib/schedule";
import { formatThaiDate, shopNow } from "@/lib/time";
import { deleteTimeOff } from "./actions";
import { ScheduleForm, TimeOffForm } from "./schedule-forms";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ตารางงานช่าง" };

export default async function BarberSchedulePage({ params }: PageProps<"/admin/barbers/[id]">) {
  await requireAdmin();
  const barberId = Number((await params).id);
  if (!Number.isInteger(barberId)) notFound();

  const today = shopNow().date;
  const [barber, schedule, leaves] = await Promise.all([
    db.query.barbers.findFirst({ where: eq(barbers.id, barberId) }),
    db.select().from(barberSchedules).where(eq(barberSchedules.barberId, barberId)),
    db
      .select()
      .from(barberTimeOff)
      .where(and(eq(barberTimeOff.barberId, barberId), gte(barberTimeOff.endDate, today)))
      .orderBy(asc(barberTimeOff.startDate)),
  ]);
  if (!barber) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/barbers" className="text-sm text-muted hover:text-ink">
          ← กลับไปหน้าช่าง
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">ตารางงาน: {barber.name}</h1>
        <p className="text-sm text-muted">ลูกค้าจะจองช่างคนนี้ได้เฉพาะในเวลาทำงาน และไม่ตรงกับวันลา</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">เวลาทำงานประจำสัปดาห์</h2>
          <ScheduleForm
            barberId={barber.id}
            schedule={schedule}
            weekdays={WEEKDAY_NAMES}
            closedWeekdays={SHOP.closedWeekdays}
            times={timeOptions()}
          />
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">บันทึกวันลา</h2>
            <TimeOffForm barberId={barber.id} today={today} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">วันลาที่กำลังจะถึง</h2>
            {leaves.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">ยังไม่มีวันลา</p>
            ) : (
              <ul className="divide-y divide-line">
                {leaves.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-sm font-medium">
                        {formatThaiDate(l.startDate, "short")}
                        {l.endDate !== l.startDate && ` – ${formatThaiDate(l.endDate, "short")}`}
                      </div>
                      {l.reason && <div className="text-xs text-muted">{l.reason}</div>}
                    </div>
                    <ActionForm
                      action={deleteTimeOff}
                      success="ลบวันลาแล้ว"
                      confirm={{
                        title: "ลบวันลานี้?",
                        message: `${barber.name}จะกลับมารับคิวในช่วง ${formatThaiDate(l.startDate, "short")}${
                          l.endDate !== l.startDate ? ` – ${formatThaiDate(l.endDate, "short")}` : ""
                        } ตามตารางงานปกติ`,
                        confirmLabel: "ลบวันลา",
                        danger: true,
                      }}
                    >
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="barberId" value={barber.id} />
                      <SubmitButton className="btn-danger btn-sm" pendingText="...">
                        ลบ
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
