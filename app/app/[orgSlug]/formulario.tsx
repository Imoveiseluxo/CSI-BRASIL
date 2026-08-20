"use client";

import { useActionState } from "react";
import { consultarCnpjAction, type EstadoConsulta } from "./actions";

export function FormularioConsulta({ orgSlug }: { orgSlug: string }) {
  const [estado, acao, pendente] = useActionState(consultarCnpjAction, null as EstadoConsulta);

  return (
    <form action={acao} className="linha">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <label htmlFor="cnpj" className="oculto">
        CNPJ
      </label>
      <input
        id="cnpj"
        name="cnpj"
        placeholder="33.000.167/0001-01"
        required
        autoComplete="off"
        inputMode="numeric"
      />
      <button type="submit" disabled={pendente}>
        {pendente ? "Consultando…" : "Consultar"}
      </button>

      {/* ⚠️ O erro mostra o motivo que veio de baixo — inclusive qual provedor
          respondeu o quê. Mensagem genérica aqui custaria a mesma investigação
          que custou dois dias no outro projeto. */}
      {estado?.erro ? (
        <p className="erro" role="alert">
          {estado.erro}
        </p>
      ) : null}
      {estado?.ok ? (
        <p className="sucesso" role="status">
          Registrada. Fonte que respondeu: {estado.provedor}.
        </p>
      ) : null}
    </form>
  );
}
