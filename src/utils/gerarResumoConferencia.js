export function gerarResumoConferencia({
  sub = "",
  diaSemana = "",
  nomeLeitor = "",
  userLeitor = "",
  adm = "",
  obraTitulo = "",
  capitulos = []
}) {
  const aprovados = capitulos.filter((item) => item.resultado?.aprovado);
  const reprovados = capitulos.filter((item) => item.resultado && !item.resultado.aprovado);

  const linhas = [];

  linhas.push(`📌 Conferência — ${sub}`);
  linhas.push(`📅 Dia: ${diaSemana}`);
  linhas.push(`👤 Leitor: ${nomeLeitor}${userLeitor ? ` (@${userLeitor})` : ""}`);
  linhas.push(`🛡️ ADM: ${adm || "-"}`);
  linhas.push("");

  if (obraTitulo && obraTitulo !== "Múltiplas obras") {
    linhas.push(`📖 Obra: ${obraTitulo}`);
    linhas.push("");
  }

  linhas.push(`✅ Aprovados: ${aprovados.length}`);
  linhas.push(`❌ Reprovados: ${reprovados.length}`);
  linhas.push("");

  capitulos.forEach((capitulo, index) => {
    const status = capitulo.resultado?.aprovado ? "✅ Aprovado" : "❌ Reprovado";
    const stats = capitulo.resultado?.estatisticas || {};

    linhas.push(`${index + 1}. ${capitulo.obraTitulo ? `${capitulo.obraTitulo} — ` : ""}${capitulo.titulo}`);
    linhas.push(`Status: ${status}`);
    linhas.push(`Comentários: ${stats.comentarios || 0}/${stats.minimoNecessario || 0}`);
    linhas.push(
      `Distribuição: início ${stats.distribuicao?.inicio || 0}, meio ${
        stats.distribuicao?.meio || 0
      }, fim ${stats.distribuicao?.fim || 0}`
    );

    if (capitulo.resultado?.observacao) {
      linhas.push(`Obs: ${capitulo.resultado.observacao}`);
    }

    if (capitulo.resultado?.motivos?.length) {
      linhas.push(`Motivos: ${capitulo.resultado.motivos.join(" | ")}`);
    }

    linhas.push("");
  });

  return linhas.join("\n").trim();
}