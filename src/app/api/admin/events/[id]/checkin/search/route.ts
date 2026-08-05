import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!(await hasEventPermission(id, "checkin"))) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED" },
      { status: 403 },
    );
  }

  const query =
    request.nextUrl.searchParams.get("q")?.trim() ??
    "";

  if (query.length < 2) {
    return NextResponse.json({
      success: true,
      data: [],
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "search_event_registrations",
    {
      target_event_id: id,
      search_term: query,
      result_limit: 20,
    },
  );

  if (error) {
    return NextResponse.json(
      { success: false, code: "SEARCH_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
  });
}
