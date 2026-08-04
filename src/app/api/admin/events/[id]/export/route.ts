import { NextResponse } from "next/server";

import { getCurrentStaff, hasEventRole } from "@/lib/auth/dal";
import { createBrazilianCsv } from "@/lib/csv";
import { createAdminClient } from "@/lib/supabase/admin";

type ExportRow = {
  full_name: string; email: string; phone: string; city: string; status: string; registered_at: string;
  checked_in_at: string | null; custom_answers: Record<string, unknown>;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  if (!(await hasEventRole(id, ["admin"]))) return NextResponse.json({ success: false }, { status: 403 });

  const supabase = createAdminClient();
  const [{ data: event }, { data, error }] = await Promise.all([
    supabase.from("events").select("slug").eq("id", id).single<{ slug: string }>(),
    supabase.from("registrations").select("full_name,email,phone,city,status,registered_at,checked_in_at,custom_answers").eq("event_id", id).order("registered_at", { ascending: true }).limit(10000),
  ]);
  if (error || !event) return NextResponse.json({ success: false }, { status: 500 });

  const rows = (data ?? []) as ExportRow[];
  const headers = ["Nome", "E-mail", "Telefone", "Cidade", "Status", "Data da inscrição", "Presença", "Horário do check-in", "Respostas personalizadas"];
  const csvRows = rows.map((row) => [
    row.full_name, row.email, row.phone, row.city, row.status,
    new Date(row.registered_at).toLocaleString("pt-BR"),
    row.checked_in_at ? "Sim" : "Não",
    row.checked_in_at ? new Date(row.checked_in_at).toLocaleString("pt-BR") : "",
    JSON.stringify(row.custom_answers ?? {}),
  ]);
  const csv = createBrazilianCsv(headers, csvRows);

  await supabase.from("audit_logs").insert({ actor_id: staff.id, event_id: id, action: "registrations_exported", entity_type: "event", entity_id: id, metadata: { count: rows.length } });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscritos-${event.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
