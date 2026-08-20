import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Evidência — CSI Brasil" };

type Props = { params: Promise<{ orgSlug: string; id: string }> };

/**
 * A tela que torna a procedência **verificável** em vez de declarada.
 *
 * Sem ela, a ficha da empresa diz "veio da fonte X, com este hash" e ninguém
 * consegue conferir. Com ela, dá para abrir o artefato bruto e comparar.
 *
 * ⚠️ **Ela mostra o artefato CRU, e isso é deliberado.** Evidência que só pode
 * ser vista depois de interpretada não é evidência — é o resumo de alguém. O
 * book pede cadeia de evidência, e cadeia que ninguém consegue inspecionar não
 * prova nada.
 *
 * ⚠️ **Consequência assumida:** artefato cru pode conter dado pessoal (e-mail de
 * contato, sócio de MEI). Por isso esta tela exige pertencer à organização, a
 * RLS corta por baixo, e a **lista de busca não mostra conteúdo** — só esta,
 * onde a pessoa escolheu abrir um artefato específico.
 */
export default async function EvidenciaPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org } = await requireOrgMember({ orgSlug });

  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("evidence")
    .select(
      "id, content, content_hash, request_key, collected_at, collected_by_kind, source:sources(name, kind, endpoint)",
    )
    .eq("organization_id", org.id)
    .eq("id", id)
    .maybeSingle();

  // ⚠️ 404, e não "sem permissão": dizer que existe mas não é sua confirmaria a
  // existência de um id de outra organização.
  if (!ev) notFound();

  const { data: derivadas } = await supabase
    .from("companies")
    .select("id, razao_social, cnpj")
    .eq("organization_id", org.id)
    .eq("evidence_id", id);

  const fonte = ev.source as unknown as {
    name: string;
    kind: string;
    endpoint: string | null;
  } | null;

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <h1>Evidência</h1>
          <p className="fraco">{ev.request_key ?? "(sem chave de consulta)"}</p>
        </div>
        <Link href={`/app/${orgSlug}`} className="discreto-link">
          Voltar
        </Link>
      </header>

      <section className="bloco">
        <h2>De onde veio</h2>
        <ul className="dados">
          <li>
            <span className="fraco">fonte</span>
            <strong>{fonte?.name ?? "—"}</strong>
          </li>
          <li>
            <span className="fraco">tipo</span>
            <strong>{fonte?.kind ?? "—"}</strong>
          </li>
          <li>
            <span className="fraco">endereço</span>
            <strong>{fonte?.endpoint ?? "—"}</strong>
          </li>
          <li>
            <span className="fraco">coletado em</span>
            <strong>
              {new Date(ev.collected_at).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
            </strong>
          </li>
          <li>
            <span className="fraco">coletado por</span>
            <strong>{ev.collected_by_kind}</strong>
          </li>
        </ul>

        <p className="fraco" style={{ marginTop: "0.75rem" }}>
          Impressão digital do artefato — é ela que permite afirmar que o conteúdo abaixo é o mesmo
          que a fonte respondeu:
        </p>
        <p className="hash-completo">{ev.content_hash}</p>
      </section>

      <section className="bloco">
        <h2>O que foi derivado disto ({derivadas?.length ?? 0})</h2>
        {!derivadas || derivadas.length === 0 ? (
          <p className="fraco">
            Nada ainda — a evidência está guardada, mas nada foi extraído dela.
          </p>
        ) : (
          <ul className="lista">
            {derivadas.map((c) => (
              <li key={c.id} className="ficha">
                <strong>{c.razao_social}</strong>
                <div className="fraco">{c.cnpj}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bloco">
        <h2>O artefato, como a fonte respondeu</h2>
        <p className="fraco">
          Cru, sem interpretação. É contra isto que qualquer afirmação do sistema pode ser
          conferida.
        </p>
        <pre className="artefato">{JSON.stringify(ev.content, null, 2)}</pre>
      </section>
    </main>
  );
}
