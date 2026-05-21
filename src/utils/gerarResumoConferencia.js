export function gerarResumoConferencia(conferencia = {}) {
  const linhas = [];

  linhas.push("🌙 RESUMO DA CONFERÊNCIA");
  linhas.push("");
  linhas.push(`Sub: ${conferencia.sub || "Não informado"}`);
  linhas.push(`Dia: ${conferencia.diaSemana || "Não informado"}`);
  linhas.push(`Leitor: ${conferencia.nomeLeitor || "Não identificado"}`);
  linhas.push(`User: ${conferencia.userLeitor || "Não identificado"}`);
  linhas.push(`ADM: ${conferencia.adm || "Não identificado"}`);
  linhas.push(`Obra: ${conferencia.obraTitulo || "Não identificada"}`);
  linhas.push("");

  const capitulos = conferencia.capitulos || [];

  linhas.push(`Capítulos conferidos: ${capitulos.length}`);
  linhas.push("");

  capitulos.forEach((capitulo, index) => {
    const resultado = capitulo.resultado || {};
    const estatisticas = resultado.estatisticas || {};

    linhas.push(`${index + 1}. ${capitulo.titulo || "Capítulo sem título"}`);
    linhas.push(`Status: ${resultado.aprovado ? "Aprovado" : "Reprovado"}`);
    linhas.push(`Tipo: ${capitulo.tipo || "Normal"}`);
    linhas.push(`Comentários: ${estatisticas.comentarios || 0}`);
    linhas.push(`Mínimo necessário: ${estatisticas.minimoNecessario || 0}`);
    linhas.push(`Tempo estimado: ${estatisticas.tempoEstimado || 0}min`);
    linhas.push(`Tempo real: ${estatisticas.tempoReal || 0}min`);

    if (resultado.aprovadoManualmente) {
      linhas.push("Aprovação manual: Sim");
      linhas.push(`Motivo: ${resultado.motivoAprovacaoManual || "Não informado"}`);
    }

    if (resultado.motivos?.length) {
      linhas.push("Motivos:");
      resultado.motivos.forEach((motivo) => {
        linhas.push(`- ${motivo}`);
      });
    }

    linhas.push("");
  });

  const aprovadoGeral = capitulos.every(
    (capitulo) => capitulo.resultado?.aprovado
  );

  linhas.push(`Resultado geral: ${aprovadoGeral ? "APROVADO" : "REPROVADO"}`);

  return linhas.join("\n");
}