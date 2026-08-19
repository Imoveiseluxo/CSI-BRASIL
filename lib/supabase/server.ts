import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Cliente do USUÁRIO logado — respeita RLS.
 *
 * Extraído do Bahia Realty em 19/08/2026. É este que deve ser usado em toda
 * leitura de dado de domínio: se a consulta esquecer um filtro, a regra do banco
 * corta. O cliente de serviço (`service.ts`) ignora RLS e existe só para rotina.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Contexto de Server Component — ignorar (o middleware renova).
          }
        },
      },
    },
  );
}
