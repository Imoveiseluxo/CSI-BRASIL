import { destinoPermitido } from "./destino-permitido";

/**
 * Provedores de consulta de CNPJ.
 *
 * **Decisão do dono, 19/08/2026:** todas as fontes **gratuitas** agora; CDL e
 * outras pagas depois, com o caminho já preparado.
 *
 * ⚠️ O que "preparado" significa aqui, concretamente: acrescentar um provedor é
 * acrescentar **uma entrada nesta lista** e um host em `HOSTS_PERMITIDOS`. O
 * conector, a evidência e a procedência não mudam — porque a procedência guarda
 * **qual provedor respondeu**, não "Receita Federal".
 *
 * ⚠️ Essa distinção não é preciosismo: se a intermediária estiver desatualizada,
 * a diferença entre *"veio da Receita"* e *"veio da API X que diz vir da
 * Receita"* é a diferença entre uma evidência e uma suposição.
 */

export type Provedor = {
  /** Nome que vai para `sources.name` e aparece na procedência. */
  nome: string;
  /** Gratuito hoje, ou contratado. Só muda o que se espera de limite e suporte. */
  custo: "gratuito" | "pago";
  /** Monta o endereço da consulta para um CNPJ só de dígitos. */
  url: (cnpj: string) => string;
};

export const PROVEDORES_CNPJ: readonly Provedor[] = [
  {
    nome: "BrasilAPI - CNPJ",
    custo: "gratuito",
    url: (cnpj) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  },
  {
    nome: "Minha Receita",
    custo: "gratuito",
    url: (cnpj) => `https://minhareceita.org/${cnpj}`,
  },
  // ⚠️ Provedor pago (CDL e outros) entra AQUI quando houver contrato — e antes
  // disso a cláusula de finalidade precisa estar lida e registrada. Ver
  // pendência 18: credencial não é base legal.
];

/**
 * Os provedores utilizáveis, na ordem de tentativa.
 *
 * ⚠️ Cada endereço passa pela trava de destino **na hora de montar**, não só na
 * hora de chamar. Provedor cuja URL não passa é removido da lista com aviso, em
 * vez de falhar no meio de uma coleta — falha na configuração tem que aparecer
 * antes de virar falha de coleta.
 */
export function provedoresUtilizaveis(cnpj: string): { provedor: Provedor; url: string }[] {
  const utilizaveis: { provedor: Provedor; url: string }[] = [];
  for (const provedor of PROVEDORES_CNPJ) {
    const url = provedor.url(cnpj);
    const veredito = destinoPermitido(url);
    if (veredito.ok) utilizaveis.push({ provedor, url });
  }
  return utilizaveis;
}
