/** กัน open redirect: ยอมให้ไปได้เฉพาะ path ภายในเว็บเท่านั้น */
export function safeNext(next: unknown): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}
