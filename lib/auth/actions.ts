"use server";

import { redirect } from "next/navigation";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type EstadoEntrar = { erro?: string } | null;

/**
 * Entrar com e-mail e senha.
 *
 * ⚠️ **A mensagem de erro é genérica de propósito.** Dizer "esse e-mail não
 * existe" entregaria quem tem conta aqui a quem estiver testando endereços — e
 * numa plataforma de inteligência corporativa, a lista de clientes é informação
 * sensível por si só.
 *
 * ⚠️ **E o motivo real vai para o log.** Foi a ausência disso que, no outro
 * projeto do dono, deixou dois corretores sem acesso por dias: a mensagem "não
 * foi possível completar a operação" servia para SMTP fora do ar, endereço de
 * retorno não autorizado e limite de envio **ao mesmo tempo**, e não havia como
 * saber qual era.
 */
export async function entrarAction(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    logError("auth.entrar", error);
    return { erro: "E-mail ou senha incorretos." };
  }
  redirect("/app/csi-brasil");
}

export async function sairAction(): Promise<never> {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    // ⚠️ Não engolir: se o encerramento falhou, a sessão continua válida no
    // servidor, e redirecionar daria a impressão falsa de ter saído.
    logError("auth.sair", err);
    throw err;
  }
  redirect("/entrar");
}
