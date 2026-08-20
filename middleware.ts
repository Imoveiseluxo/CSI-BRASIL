import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Renova a sessão a cada navegação.
 *
 * ⚠️ Sem isto, a sessão do usuário expira no meio do uso e ele é jogado para o
 * login sem entender por quê — o token de acesso vive minutos, e quem o renova é
 * este middleware.
 *
 * ⚠️ Ele **não decide acesso**. Quem decide são as guardas (`lib/auth/guards`) e,
 * antes delas, a RLS no banco. Middleware que autoriza é middleware que alguém
 * esquece de aplicar numa rota nova.
 */
export async function middleware(req: NextRequest) {
  let resposta = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Basta chamar: é isto que renova o token quando ele está perto de vencer.
  await supabase.auth.getUser();

  return resposta;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e as rotas que se defendem sozinhas por
    // token próprio (entrada de dado e diagnóstico não têm sessão de pessoa).
    "/((?!_next/static|_next/image|favicon.ico|api/entrada|api/diagnostico).*)",
  ],
};
