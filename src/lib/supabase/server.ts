import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Sunucu tarafı Supabase istemcisi (Server Component / Server Action / Route Handler).
 * Kullanıcının oturumu ile çalışır — RLS her zaman devrededir.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldığında cookie yazılamaz.
            // middleware oturumu zaten tazelediği için sorun değil.
          }
        },
      },
    },
  );
}

/**
 * service_role istemcisi — RLS'i BYPASS EDER.
 * Sadece webhook, cron ve admin bakım işlerinde kullanılır.
 * ASLA kullanıcı girdisiyle doğrudan sorgu kurma.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil");

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/**
 * Çerez KULLANMAYAN salt-okunur istemci.
 *
 * `generateStaticParams`, `sitemap` gibi istek bağlamı DIŞINDA çalışan yerlerde
 * `cookies()` çağrılamaz ("cookies was called outside a request scope" hatası).
 * Bu istemci anon anahtarla çalışır, oturum taşımaz — yalnızca herkese açık
 * veriyi okumak için kullanılır. RLS yine devrededir.
 */
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
