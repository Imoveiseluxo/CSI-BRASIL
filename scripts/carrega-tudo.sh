#!/usr/bin/env bash
# Carrega em sequência as partes da base pública da Receita.
#
# Uso:  PGPASS=... bash scripts/carrega-tudo.sh socios
#       PGPASS=... bash scripts/carrega-tudo.sh empresas
#
# ⚠️ Em sequência, e não em paralelo, de propósito: são COPY grandes no mesmo
# banco, e paralelizar aqui só troca "demorado" por "demorado e disputando
# disco". A parte que demora é o banco escrevendo, não a rede.
#
# ⚠️ Cada arquivo é uma carga independente em `rf_carga`. Se uma parte falhar,
# as outras continuam e a que falhou fica registrada com o erro — parar tudo na
# primeira falha esconderia quanto do trabalho deu certo.
set -u

grupo="${1:-}"
case "$grupo" in
  socios)   prefixo="Socios";   tabela="rf_socios"   ;;
  empresas) prefixo="Empresas"; tabela="rf_empresas" ;;
  *) echo "uso: bash scripts/carrega-tudo.sh [socios|empresas]"; exit 1 ;;
esac

falhas=0
for i in 0 1 2 3 4 5 6 7 8 9; do
  echo "=== ${prefixo}${i}.zip -> ${tabela}"
  if ! node scripts/carrega-receita.js "${prefixo}${i}.zip" "$tabela"; then
    falhas=$((falhas + 1))
    echo "    ^ esta parte falhou; seguindo para a próxima"
  fi
done

echo
echo "=== fim de ${grupo}: ${falhas} parte(s) com falha de 10"
# ⚠️ Sai com erro se alguma parte falhou. Sucesso da rotina inteira não pode
# depender de alguém ter lido a saída até o fim.
[ "$falhas" -eq 0 ]
