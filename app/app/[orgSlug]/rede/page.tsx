import { notFound, redirect } from "next/navigation";
import { requireOrgMember } from "@/lib/auth/guards";
import { raizDoCnpj } from "@/lib/rede/queries";

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ cnpj?: string }>;
};

/**
 * A porta de entrada da rede: recebe `?cnpj=…` do formulário e manda para
 * `/rede/<raiz>`.
 *
 * ⚠️ Existe para o formulário funcionar **sem JavaScript**. Um `<form>` com GET
 * só sabe pôr o campo na barra de endereço como parâmetro; a rede mora num
 * caminho. Esta tela faz a ponte no servidor — e o endereço final fica limpo e
 * pode ser guardado ou mandado para alguém.
 */
export default async function RedeEntradaPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { cnpj } = await searchParams;
  await requireOrgMember({ orgSlug });

  // ⚠️ Valida ANTES de redirecionar. Sem isto, qualquer texto na barra de
  // endereço viraria um caminho que a tela seguinte teria de recusar de novo.
  const raiz = cnpj ? raizDoCnpj(cnpj) : null;
  if (!raiz) notFound();

  redirect(`/app/${orgSlug}/rede/${raiz}`);
}
