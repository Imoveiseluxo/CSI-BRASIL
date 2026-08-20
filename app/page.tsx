import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";

/**
 * A raiz não tem conteúdo próprio: quem está logado vai para o workspace, quem
 * não está vai para o login. Página de "boas-vindas" sem função é tela que
 * alguém precisa manter sem ninguém usar.
 */
export default async function Home() {
  const usuario = await getCurrentUser();
  redirect(usuario ? "/app/csi-brasil" : "/entrar");
}
