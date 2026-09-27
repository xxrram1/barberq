import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <div className="font-display text-7xl font-bold text-brass">404</div>
        <h1 className="mt-2 font-display text-2xl font-semibold">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-muted">ลิงก์อาจผิด หรือคุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <Link href="/" className="btn-primary mt-6">
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
