import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { InviteStaffForm } from "@/features/team/components/invite-staff-form";
import { TeamStatusButton } from "@/features/team/components/team-status-button";
import { requireTeamManager } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string;
  global_role: string;
  active: boolean;
  created_at: string;
  is_owner: boolean;
  can_create_events: boolean;
  can_manage_team: boolean;
};

type EventStaffRow = {
  user_id: string;
  event_id: string;
};

export default async function TeamPage() {
  const staff = await requireTeamManager();
  const supabase = createAdminClient();

  const [
    { data: profiles },
    { data: events },
    { data: eventStaff },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,global_role,active,created_at,is_owner,can_create_events,can_manage_team",
      )
      .order("full_name"),
    supabase
      .from("events")
      .select("id,name")
      .order("start_at", { ascending: false }),
    supabase
      .from("event_staff")
      .select("user_id,event_id"),
  ]);

  const eventCount = new Map<string, number>();

  for (const access of
    (eventStaff ?? []) as EventStaffRow[]) {
    eventCount.set(
      access.user_id,
      (eventCount.get(access.user_id) ?? 0) + 1,
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Acessos"
        title="Equipe"
        description="Defina exatamente o que cada integrante pode visualizar ou alterar."
      />

      <div className="space-y-8 p-5 sm:p-8 lg:p-10">
        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Adicionar integrante
          </h2>
          <p className="mb-5 text-sm leading-6 text-zinc-500">
            Crie uma senha inicial e escolha um
            perfil de acesso. Proprietários possuem
            acesso total.
          </p>

          <InviteStaffForm
            canAssignOwner={staff.isOwner}
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
              (profile) => {
                const canManageProfile =
                  staff.isOwner ||
                  !profile.is_owner;

                return (
                  <div
                    key={profile.id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-200">
                          {profile.full_name}
                        </p>

                        {profile.is_owner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                            <ShieldCheck className="size-3" />
                            Proprietário
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-zinc-600">
                        Criado em{" "}
                        {new Date(
                          profile.created_at,
                        ).toLocaleDateString(
                          "pt-BR",
                        )}
                        {" · "}
                        {profile.is_owner
                          ? "Todos os eventos"
                          : `${eventCount.get(
                              profile.id,
                            ) ?? 0} evento(s)`}
                      </p>

                      {!profile.is_owner ? (
                        <p className="mt-1 text-xs text-zinc-700">
                          {[
                            profile.can_create_events
                              ? "Cria eventos"
                              : null,
                            profile.can_manage_team
                              ? "Gerencia equipe"
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Acesso por evento"}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <p
                          className={`text-xs ${
                            profile.active
                              ? "text-emerald-500"
                              : "text-zinc-600"
                          }`}
                        >
                          {profile.active
                            ? "Ativo"
                            : "Inativo"}
                        </p>

                        <TeamStatusButton
                          userId={profile.id}
                          active={profile.active}
                          disabled={
                            !canManageProfile
                          }
                        />
                      </div>

                      {canManageProfile ? (
                        <Link
                          href={`/admin/equipe/${profile.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
                        >
                          <UserCog className="size-4 text-red-500" />
                          Permissões
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/5 px-3 py-2 text-xs text-zinc-700">
                          <KeyRound className="size-4" />
                          Restrito
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
