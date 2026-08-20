import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgMember } from "@/lib/auth/guards";
import {
  empresaDeReferencia,
  ligacoesPorCnpj,
  procedenciaDaBase,
  raizDoCnpj,
  sociosDaEmpresa,
} from "@/lib/rede/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rede de ligações — CSI Brasil" };

type Props = {
  params: Promise<{ orgSlug: string; cnpj: string }>;
  searchParams: Promise<{ saltos?: string }>;
};

const ROTULO_CERTEZA: Record<string, string> = {
  confirmada: "confirmada",
  provavel: "provável",
  possivel: "possível",
};

/**
 * A rede de ligações de uma empresa.
 *
 * ⚠️ **Cada linha abre**, e é isso que separa esta tela de um relatório: quem
 * investiga precisa ver o que sustenta a ligação antes de levá-la adiante. A
 * expansão usa `<details>` do próprio navegador — funciona sem JavaScript, e
 * numa tela que existe para ser confiável isso não é detalhe.
 *
 * ⚠️ **A certeza aparece em toda ligação.** Sócio pessoa jurídica traz o CNPJ
 * inteiro; sócio pessoa física traz CPF mascarado, e a ligação é PROVÁVEL. Num
 * produto de inteligência, ligação errada é pior que ligação ausente.
 */
export default async function RedePage({ params, searchParams }: Props) {
  const { orgSlug, cnpj } = await params;
  const { saltos } = await searchParams;
  await requireOrgMember({ orgSlug });

  const raiz = raizDoCnpj(cnpj);
  if (!raiz) notFound();

  // ⚠️ Teto de 3 saltos. Cada salto multiplica: um sócio de holding em 300
  // empresas vira dezenas de milhares de caminhos no terceiro. O limite é
  // honesto e está escrito na tela, não escondido.
  const nSaltos = Math.min(Math.max(Number(saltos ?? "1") || 1, 1), 3);

  const supabase = await createClient();
  const [empresa, socios, ligacoes, cargas] = await Promise.all([
    empresaDeReferencia(supabase, raiz),
    sociosDaEmpresa(supabase, raiz),
    ligacoesPorCnpj(supabase, raiz, nSaltos),
    procedenciaDaBase(supabase),
  ]);

  const base = cargas[0];
  const porDestino = new Map<string, typeof ligacoes>();
  for (const l of ligacoes) {
    const atual = porDestino.get(l.destinoCnpj) ?? [];
    atual.push(l);
    porDestino.set(l.destinoCnpj, atual);
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <h1>{empresa?.razaoSocial ?? `CNPJ raiz ${raiz}`}</h1>
          <p className="fraco">
            raiz {raiz}
            {empresa?.porte ? ` · porte ${empresa.porte}` : ""}
            {empresa?.capitalSocial ? ` · capital ${empresa.capitalSocial}` : ""}
          </p>
        </div>
        <Link href={`/app/${orgSlug}`} className="discreto-link">
          Voltar
        </Link>
      </header>

      {!empresa ? (
        <section className="bloco">
          {/* ⚠️ "Não está na base" ≠ "não existe". A diferença importa: a base é
              de um mês específico, e empresa nova ainda não entrou nela. */}
          <p className="fraco">
            Esta raiz de CNPJ <strong>não está na base carregada</strong> (
            {base?.mesBase ?? "base ainda não carregada"}). Isso não quer dizer que a empresa não
            exista — quer dizer que ela não estava no arquivo daquele mês, ou que a parte da base
            que a contém ainda não foi carregada.
          </p>
        </section>
      ) : null}

      <section className="bloco">
        <h2>Sócios ({socios.length})</h2>
        {socios.length === 0 ? (
          <p className="fraco">Nenhum sócio na base para esta raiz.</p>
        ) : (
          <ul className="lista">
            {socios.map((s) => (
              <li key={`${s.nome}-${s.entrada ?? ""}`} className="ficha">
                <details>
                  <summary>
                    <strong>{s.nome}</strong>
                    <span className="etiqueta">{s.tipo}</span>
                    {s.outrasEmpresas > 0 ? (
                      <span className="etiqueta destaque">
                        + {s.outrasEmpresas} outra{s.outrasEmpresas > 1 ? "s" : ""} empresa
                        {s.outrasEmpresas > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </summary>
                  <ul className="dados">
                    <li>
                      <span className="fraco">qualificação</span>
                      <strong>{s.qualificacao ?? "—"}</strong>
                    </li>
                    <li>
                      <span className="fraco">entrada na sociedade</span>
                      <strong>
                        {s.entrada ? new Date(s.entrada).toLocaleDateString("pt-BR") : "—"}
                      </strong>
                    </li>
                  </ul>
                  {/* ⚠️ O documento do sócio NÃO aparece aqui, nem mascarado.
                      Ele liga registros dentro do banco e não precisa ser
                      exibido — minimização, seção 20 do book. */}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bloco">
        <div className="ficha-cabeca">
          <h2>Empresas ligadas ({porDestino.size})</h2>
          <a
            href={`/app/${orgSlug}/rede/${raiz}/planilha`}
            className="discreto-link"
            // ⚠️ `<a>` e não `<Link>`: isto baixa um arquivo, não navega para
            // uma página. Com `<Link>` o Next tentaria buscar a rota como se
            // fosse tela e o download não aconteceria.
          >
            Baixar planilha
          </a>
        </div>

        <p className="fraco">
          Alcance de{" "}
          <strong>
            {nSaltos} salto{nSaltos > 1 ? "s" : ""}
          </strong>
          .{" "}
          {[1, 2, 3]
            .filter((n) => n !== nSaltos)
            .map((n) => (
              <Link key={n} href={`/app/${orgSlug}/rede/${raiz}?saltos=${n}`}>
                {`ver ${n} salto${n > 1 ? "s" : ""}  `}
              </Link>
            ))}
        </p>

        {porDestino.size === 0 ? (
          <p className="fraco">
            Nenhuma outra empresa ligada por sócio em comum, dentro do que já foi carregado.
          </p>
        ) : (
          <ul className="lista">
            {[...porDestino.entries()].map(([destino, ls]) => {
              const primeira = ls[0];
              if (!primeira) return null;
              return (
                <li key={destino} className="ficha">
                  <details>
                    <summary>
                      <strong>{primeira.destinoNome ?? `CNPJ raiz ${destino}`}</strong>
                      <span className={`etiqueta certeza-${primeira.certeza}`}>
                        {ROTULO_CERTEZA[primeira.certeza] ?? primeira.certeza}
                      </span>
                      <span className="etiqueta">
                        {primeira.salto === 0 ? "ligação direta" : `${primeira.salto + 1}º grau`}
                      </span>
                    </summary>

                    <ul className="dados">
                      <li>
                        <span className="fraco">CNPJ raiz</span>
                        <strong>{destino}</strong>
                      </li>
                      <li>
                        <span className="fraco">o que liga</span>
                        <strong>
                          {ls
                            .map((l) => l.socioNome)
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </strong>
                      </li>
                    </ul>

                    {/* ⚠️ O motivo por extenso, e não só um rótulo. Score sem a
                        conta ao lado é o que o book proíbe. */}
                    {ls.map((l) => (
                      <p key={`${l.socioNome}-${l.destinoCnpj}`} className="motivo">
                        {l.motivo}
                      </p>
                    ))}

                    <p>
                      <Link href={`/app/${orgSlug}/rede/${destino}`}>
                        Abrir a rede desta empresa
                      </Link>
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bloco">
        <h2>De onde vem este dado</h2>
        {!base ? (
          <p className="fraco">A base ainda não foi carregada.</p>
        ) : (
          <ul className="dados">
            <li>
              <span className="fraco">fonte</span>
              <strong>Base pública de CNPJ — Receita Federal</strong>
            </li>
            <li>
              <span className="fraco">mês da base</span>
              <strong>{base.mesBase}</strong>
            </li>
            <li>
              <span className="fraco">obtida de</span>
              <strong>{base.origemUrl}</strong>
            </li>
            <li>
              <span className="fraco">tipo da origem</span>
              <strong>{base.origemTipo}</strong>
            </li>
          </ul>
        )}
        {/* ⚠️ O limite fica na tela, não escondido na documentação. Quem lê a
            rede precisa saber o que ela NÃO viu. */}
        <p className="fraco" style={{ marginTop: "0.75rem" }}>
          A Receita publica o CPF do sócio <strong>mascarado</strong> — só seis dígitos do meio. Por
          isso a ligação entre empresas por sócio pessoa física é casada por{" "}
          <strong>nome + documento parcial</strong> e sai marcada como <strong>provável</strong>:
          homônimo com os mesmos seis dígitos é possível. Sócio pessoa jurídica traz o CNPJ inteiro,
          e aí a ligação é <strong>confirmada</strong>.
        </p>
      </section>
    </main>
  );
}
