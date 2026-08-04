import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { requireStaff } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  await requireStaff();
  return <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#050506] px-5 py-12"><div className="pointer-events-none absolute left-1/2 top-[-24rem] -z-10 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" /><section className="glass-panel mx-auto w-full max-w-md rounded-[2rem] p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Primeiro acesso</p><h1 className="mt-3 text-3xl font-semibold text-white">Defina sua senha</h1><p className="mb-8 mt-3 text-sm leading-6 text-zinc-400">Use pelo menos 8 caracteres e guarde a senha em local seguro.</p><SetPasswordForm /></section></main>;
}
