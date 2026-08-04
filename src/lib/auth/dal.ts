import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  fullName: string;
  globalRole: "admin" | "checkin_operator";
};

export const getCurrentStaff = cache(async (): Promise<StaffProfile | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (claimsError || !userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,global_role,active")
    .eq("id", userId)
    .maybeSingle<{
      id: string;
      full_name: string;
      global_role: StaffProfile["globalRole"];
      active: boolean;
    }>();

  if (error || !profile?.active) return null;
  return { id: profile.id, fullName: profile.full_name, globalRole: profile.global_role };
});

export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

export async function requireGlobalAdmin() {
  const staff = await requireStaff();
  if (staff.globalRole !== "admin") redirect("/admin");
  return staff;
}

export async function hasEventRole(
  eventId: string,
  allowedRoles: Array<"admin" | "checkin_operator">,
) {
  const staff = await getCurrentStaff();
  if (!staff) return false;
  if (staff.globalRole === "admin") return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", staff.id)
    .maybeSingle<{ role: "admin" | "checkin_operator" }>();

  return data ? allowedRoles.includes(data.role) : false;
}
