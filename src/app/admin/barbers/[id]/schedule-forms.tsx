"use client";

import { useActionState, useState } from "react";
import { minToTime } from "@/lib/time";
import { addTimeOff, saveSchedule, type ScheduleState, type TimeOffState } from "./actions";

type Shift = { weekday: number; startMin: number; endMin: number };

export function ScheduleForm({
  barberId,
  schedule,
  weekdays,
  closedWeekdays,
  times,
}: {
  barberId: number;
  schedule: Shift[];
  weekdays: string[];
  closedWeekdays: number[];
  times: number[];
}) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(saveSchedule, {});
  const [on, setOn] = useState(() => new Set(schedule.map((s) => s.weekday)));

  // เริ่มสัปดาห์ที่วันจันทร์ ตามที่คนไทยคุ้นเคย
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="barberId" value={barberId} />
      <ul className="divide-y divide-line">
        {order.map((d) => {
          const shift = schedule.find((s) => s.weekday === d);
          const shopClosed = closedWeekdays.includes(d);
          const working = on.has(d) && !shopClosed;
          return (
            <li key={d} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name={`on_${d}`}
                  checked={working}
                  disabled={shopClosed}
                  onChange={(e) => {
                    const next = new Set(on);
                    if (e.target.checked) next.add(d);
                    else next.delete(d);
                    setOn(next);
                  }}
                  className="size-4 accent-brass"
                />
                {weekdays[d]}
              </label>
              {shopClosed ? (
                <span className="text-sm text-muted">ร้านปิด</span>
              ) : working ? (
                <div className="flex items-center gap-2 text-sm">
                  <TimeSelect name={`start_${d}`} times={times.slice(0, -1)} value={shift?.startMin ?? times[0]} />
                  <span className="text-muted">ถึง</span>
                  <TimeSelect name={`end_${d}`} times={times.slice(1)} value={shift?.endMin ?? times.at(-1)!} />
                </div>
              ) : (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-muted">วันหยุดช่าง</span>
              )}
            </li>
          );
        })}
      </ul>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.warning && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠ บันทึกแล้ว แต่{state.warning}</p>
      )}
      {state.ok && !state.warning && !pending && <p className="text-sm text-emerald-700">บันทึกตารางงานเรียบร้อย ✓</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึกตารางงาน"}
      </button>
    </form>
  );
}

function TimeSelect({ name, times, value }: { name: string; times: number[]; value: number }) {
  return (
    <select name={name} defaultValue={value} className="input w-auto py-1.5 tabular-nums">
      {times.map((t) => (
        <option key={t} value={t}>
          {minToTime(t)}
        </option>
      ))}
    </select>
  );
}

export function TimeOffForm({ barberId, today }: { barberId: number; today: string }) {
  const [state, action, pending] = useActionState<TimeOffState, FormData>(addTimeOff, {});
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  // คำเตือนใช้ได้เฉพาะกับช่วงวันที่ที่ตรวจไปแล้ว ถ้าแก้วันต้องตรวจใหม่
  const hasConflicts = !!state.conflicts?.length && state.checked === `${startDate}|${endDate}`;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="barberId" value={barberId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">ตั้งแต่วันที่</span>
          <input
            type="date"
            name="startDate"
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
            className="input"
          />
        </label>
        <label>
          <span className="label">ถึงวันที่</span>
          <input
            type="date"
            name="endDate"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">เหตุผล (ไม่บังคับ)</span>
        <input
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น ลาพักร้อน, ลาป่วย"
          className="input"
        />
      </label>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {hasConflicts && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">⚠ มีคิวค้างอยู่ในช่วงนี้ {state.conflicts!.length} คิว</div>
          <ul className="mt-1 list-disc pl-5">
            {state.conflicts!.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">ถ้ายืนยัน คิวเหล่านี้จะยังอยู่ ต้องติดต่อลูกค้าเพื่อย้ายหรือยกเลิกเอง</p>
        </div>
      )}
      {state.ok && !pending && <p className="text-sm text-emerald-700">บันทึกวันลาเรียบร้อย ✓</p>}

      {hasConflicts && <input type="hidden" name="force" value={state.checked} />}
      <button type="submit" className={hasConflicts ? "btn-brass" : "btn-primary"} disabled={pending}>
        {pending ? "กำลังบันทึก..." : hasConflicts ? "ยืนยันบันทึกวันลา" : "บันทึกวันลา"}
      </button>
    </form>
  );
}
