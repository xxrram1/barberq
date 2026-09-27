import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/url";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="register" next={safeNext(next)} />;
}
