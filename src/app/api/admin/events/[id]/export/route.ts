import { NextResponse } from "next/server";

import { formatJobRole } from "@/features/registrations/job-roles";
import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createBrazilianCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/date-time";
import { createAdminClient } from "@/lib/supabase/admin";

type ExportRow = {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  company_name: string | null;
  job_role: string | null;
  job_role_other: string | null;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  custom_answers: Record<string, unknown>;
};

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      { success: false },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (
    !(await hasEventPermission(
      id,
      "view_reports",
    ))
  ) {
    return NextResponse.json(
      { success: false },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();

  const [
    { data: event },
    { data, error },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("slug,timezone")
      .eq("id", id)
      .single<{
        slug: string;
        timezone: string;
      }>(),
    supabase
      .from("registrations")
      .select(
        "full_name,email,phone,city,company_name,job_role,job_role_other,status,registered_at,checked_in_at,custom_answers",
      )
      .eq("event_id", id)
      .order("registered_at", {
        ascending: true,
      })
      .limit(10000),
  ]);

  if (error || !event) {
    return NextResponse.json(
      { success: false },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ExportRow[];
  const headers = [
    "Nome",
    "E-mail",
    "Telefone",
    "Cidade",
    "Empresa",
    "Cargo ou função",
    "Status",
    "Data da inscrição",
    "Presença",
    "Horário do check-in",
    "Respostas personalizadas",
  ];

  const csvRows = rows.map((row) => [
    row.full_name,
    row.email,
    row.phone,
    row.city,
    row.company_name ?? "",
    formatJobRole(
      row.job_role,
      row.job_role_other,
    ),
    row.status,
    formatDateTime(
      row.registered_at,
      event.timezone,
    ),
    row.checked_in_at ? "Sim" : "Não",
    row.checked_in_at
      ? formatDateTime(
          row.checked_in_at,
          event.timezone,
        )
      : "",
    JSON.stringify(row.custom_answers ?? {}),
  ]);

  const csv = createBrazilianCsv(
    headers,
    csvRows,
  );

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "registrations_exported",
    entity_type: "event",
    entity_id: id,
    metadata: { count: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="inscritos-${event.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
