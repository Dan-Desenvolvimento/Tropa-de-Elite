import { PageHeader } from "@/components/admin/page-header";
import { InviteStaffForm } from "@/features/team/components/invite-staff-form";
import { TeamStatusButton } from "@/features/team/components/team-status-button";
import { requireGlobalAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string;
  global_role: string;
  active: boolean;
  created_at: string;
};

export default async function TeamPage() {
  await requireGlobalAdmin();

  const supabase = createAdminClient();

  const [{ data: profiles }, { data: events }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,global_role,active,created_at",
        )
        .order("full_name"),
      supabase
        .from("events")
        .select("id,name")
        .order("start_at", { ascending: false }),
    ]);

  return (
    <main>
      <PageHeader
        eyebrow="Acessos"
        title="Equipe"
        description="Crie acessos para administradores e operadores de check-in."
      />

      <div className="space-y-8 p-5 sm:p-8 lg:p-10">
        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Adicionar integrante
          </h2>
          <p className="mb-5 text-sm leading-6 text-zinc-500">
            Defina uma senha inicial. Depois de entrar, o integrante
            poderá alterá-la pela opção “Minha senha”.
          </p>

          <InviteStaffForm
            events={
              (events ?? []) as Array<{
                id: string;
                name: string;
              }>
            }
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/8">
          <div className="border-b border-white/8 bg-white/[0.025] px-5 py-4">
            <h2 className="font-semibold text-white">
              Usuários cadastrados
            </h2>
          </div>

          <div className="divide-y divide-white/8">
            {((profiles ?? []) as ProfileRow[]).map(
              (profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-zinc-200">
                      {profile.full_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Criado em{" "}
                      {new Date(
                        profile.created_at,
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium text-red-400">
                      {profile.global_role === "admin"
                        ? "Administrador"
                        : "Operador"}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        profile.active
                          ? "text-emerald-500"
                          : "text-zinc-600"
                      }`}
                    >
                      {profile.active ? "Ativo" : "Inativo"}
                    </p>

                    <TeamStatusButton
                      userId={profile.id}
                      active={profile.active}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
