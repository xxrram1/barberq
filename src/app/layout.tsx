import type { Metadata } from "next";
import { Noto_Sans_Thai, Prompt } from "next/font/google";
import { FeedbackProvider } from "@/components/feedback";
import { Footer } from "@/components/footer";
import { Suspense } from "react";
import { Navbar, NavbarSkeleton } from "@/components/navbar";
import { SHOP } from "@/lib/config";
import "./globals.css";

const body = Noto_Sans_Thai({
  variable: "--font-body",
  subsets: ["thai", "latin"],
});

const heading = Prompt({
  variable: "--font-heading",
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: `${SHOP.name} · จองคิวร้านตัดผมออนไลน์`, template: `%s · ${SHOP.name}` },
  description: "จองคิวตัดผมออนไลน์ เลือกช่าง เลือกเวลา ไม่ต้องรอคิวหน้าร้าน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <FeedbackProvider>
        {/* navbar/footer อ่าน cookie เพื่อดูว่าใครล็อกอิน: แยกเป็น Suspense ไว้ ไม่ให้หน้าหลักต้องรอ */}
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<div className="h-72 bg-ink" />}>
          <Footer />
        </Suspense>
        </FeedbackProvider>
      </body>
    </html>
  );
}
