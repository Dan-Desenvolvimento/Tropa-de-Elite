import { PageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requireStaff } from "@/lib/auth/dal";

export default async function MyAccountPage() {
  const staff = await requireStaff();

  return (
    <main>
      <PageHeader
        eyebrow="Segurança"
        title="Minha senha"
        description="Altere a senha usada para acessar o painel administrativo."
      />

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,560px)_1fr] lg:p-10">
        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">
            Alterar senha
          </h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-zinc-500">
            Informe a senha atual e escolha uma nova senha com pelo
            menos 8 caracteres.
          </p>

          <ChangePasswordForm />
        </section>

        <section className="h-fit rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
          <h2 className="font-semibold text-white">
            Dados do acesso
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
              <span className="text-zinc-600">Nome</span>
              <span className="text-right text-zinc-300">
                {staff.fullName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-600">
                Perfil
              </span>
              <span className="text-right text-zinc-300">
                {staff.globalRole === "admin"
                  ? "Administrador"
                  : "Operador de check-in"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
