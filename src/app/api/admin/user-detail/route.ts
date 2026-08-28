import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

/**
 * Manuel sipariş formu için: seçilen kullanıcının çocukları ve adresleri.
 * Yetki kontrolü burada VE veritabanı politikalarında yapılır.
 */
export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "Geçersiz kullanıcı" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: children }, { data: addresses }] = await Promise.all([
    supabase.from("children").select("id,first_name,last_name,birth_date")
      .eq("user_id", userId).eq("status", "active"),
    supabase.from("addresses").select("id,title,recipient_name,full_address")
      .eq("user_id", userId),
  ]);

  return NextResponse.json({
    children: children ?? [],
    addresses: addresses ?? [],
  });
}
