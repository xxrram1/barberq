/* eslint-disable @next/next/no-img-element -- รูปมาจาก route ของเราเอง มี cache แบบ immutable อยู่แล้ว */

const FALLBACK_COLORS = ["bg-ink", "bg-brass", "bg-stone-500"];

/** รูปโปรไฟล์ช่าง ถ้ายังไม่มีรูปจะแสดงตัวอักษรแรกของชื่อบนพื้นสี */
export function BarberAvatar({
  barber,
  className = "size-24 text-3xl",
  decorative = false,
}: {
  barber: { id: number; name: string; photoVersion: number };
  className?: string;
  /** true = มีชื่อช่างแสดงข้างๆ อยู่แล้ว ไม่ต้องให้ screen reader อ่านซ้ำ */
  decorative?: boolean;
}) {
  if (barber.photoVersion > 0) {
    return (
      <img
        src={`/api/barbers/${barber.id}/photo?v=${barber.photoVersion}`}
        alt={decorative ? "" : barber.name}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold text-white ${
        FALLBACK_COLORS[barber.id % FALLBACK_COLORS.length]
      } ${className}`}
    >
      {barber.name.replace("ช่าง", "").charAt(0)}
    </span>
  );
}
