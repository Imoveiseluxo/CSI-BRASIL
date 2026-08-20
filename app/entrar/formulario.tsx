"use client";

import { useActionState } from "react";
import { type EstadoEntrar, entrarAction } from "@/lib/auth/actions";

/**
 * ⚠️ Componente de navegador (`"use client"`) porque precisa de estado para
 * mostrar o erro. A ação em si roda no servidor — a senha nunca é tratada aqui.
 */
export function FormularioEntrar() {
  const [estado, acao, pendente] = useActionState(entrarAction, null as EstadoEntrar);

  return (
    <form action={acao} className="formulario">
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="email" />

      <label htmlFor="senha">Senha</label>
      <input id="senha" name="senha" type="password" required autoComplete="current-password" />

      {estado?.erro ? (
        <p className="erro" role="alert">
          {estado.erro}
        </p>
      ) : null}

      <button type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
