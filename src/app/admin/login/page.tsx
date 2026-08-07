import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentStaff } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const staff = await getCurrentStaff();
  if (staff) redirect("/admin");

  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#050506] px-5 py-12">
      <div className="pointer-events-none absolute left-1/2 top-[-24rem] -z-10 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
      <section className="glass-panel mx-auto w-full max-w-md rounded-[2rem] p-7 sm:p-9">
        <div className="relative mx-auto mb-6 h-20 w-60 overflow-hidden">
          <Image
            src="/Tropa-de-elite-branca-para-fundo-preto.png"
            alt="Tropa de Elite"
            fill
            priority
            sizes="240px"
            className="object-contain object-center"
          />
        </div>
        <h1 className="text-center text-3xl font-semibold tracking-tight text-white">Acesso da equipe</h1>
        <p className="mb-8 mt-3 text-center text-sm leading-6 text-zinc-400">
          Área exclusiva para administradores e operadores de check-in.
        </p>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/5" />}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
