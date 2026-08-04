import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EventSummary } from "@/features/admin/types";

export async function getEventSummaries() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_dashboard_summaries");
  if (error) throw error;
  return (data ?? []) as EventSummary[];
}
