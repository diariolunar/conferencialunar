function formatarNomeObra(resultado = {}) {
  return resultado.obraTitulo || "obra informada";
}

function formatarTituloCapitulo(resultado = {}) {
  return resultado.titulo || resultado.capituloTitulo || "capítulo informado";
}

function pluralizarComentario(quantidade) {
  return quantidade === 1 ? "comentário" : "comentários";
}

function listarDistribuicaoFaltante(distribuicao = {}, regraAplicada = {}) {
  if (!regraAplicada.exigeDistribuicao) return [];

  const faltantes = [];

  if (Number(distribuicao.inicio || 0) <= 0) faltantes.push("início");
  if (Number(distribuicao.meio || 0) <= 0) faltantes.push("meio");
  if (Number(distribuicao.fim || 0) <= 0) faltantes.push("fim");

  return faltantes;
}

function juntarLista(itens = []) {
  if (itens.length <= 1) return itens[0] || "";
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;

  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

function removerPontuacaoFinal(texto = "") {
  return String(texto || "").trim().replace(/[.!?]+$/g, "");
}

function gerarLinhaReprovacao(resultado = {}) {
  const obra = formatarNomeObra(resultado);
  const capitulo = formatarTituloCapitulo(resultado);

  if (resultado.erroVerificacao) {
    const erro = removerPontuacaoFinal(
      resultado.erroMensagem || "falha ao consultar o Wattpad"
    );

    return `Na obra ${obra}, no capítulo ${capitulo}, não foi possível fazer a verificação automática: ${erro}.`;
  }

  const dados = resultado.resultado || {};
  const estatisticas = dados.estatisticas || {};
  const regraAplicada = dados.regraAplicada || {};
  const comentariosEncontrados = Number(estatisticas.comentarios || 0);
  const minimoNecessario = Number(estatisticas.minimoNecessario || 0);
  const faltamComentarios = Math.max(
    0,
    minimoNecessario - comentariosEncontrados
  );
  const partes = [];

  if (faltamComentarios > 0) {
    partes.push(
      `falt${faltamComentarios === 1 ? "ou" : "aram"} ${faltamComentarios} ${pluralizarComentario(faltamComentarios)}`
    );
  }

  const distribuicaoFaltante = listarDistribuicaoFaltante(
    estatisticas.distribuicao,
    regraAplicada
  );

  if (distribuicaoFaltante.length > 0) {
    partes.push(
      `faltou comentário ${juntarLista(
        distribuicaoFaltante.map((posicao) => `no ${posicao}`)
      )}`
    );
  }

  if (
    regraAplicada.exigeTempo &&
    Number(estatisticas.tempoEstimado || 0) > 0 &&
    Number(estatisticas.tempoReal || 0) > 0 &&
    Number(estatisticas.tempoReal || 0) < Number(estatisticas.tempoEstimado || 0)
  ) {
    partes.push(
      `o tempo de leitura ficou abaixo do esperado (${estatisticas.tempoReal}min de ${estatisticas.tempoEstimado}min)`
    );
  }

  if (partes.length === 0 && dados.motivos?.length) {
    partes.push(dados.motivos.join("; "));
  }

  const motivo =
    partes.length > 0
      ? partes.join("; ")
      : "a leitura não atingiu os critérios da conferência";

  return `Na obra ${obra}, no capítulo ${capitulo}, ${motivo}.`;
}

export function gerarTextoReprovacaoConferencia(resultados = []) {
  return resultados
    .filter((resultado) => resultado.erroVerificacao || !resultado.resultado?.aprovado)
    .map(gerarLinhaReprovacao)
    .join("\n");
}

export const __testables = {
  gerarLinhaReprovacao,
  juntarLista,
  listarDistribuicaoFaltante,
  removerPontuacaoFinal
};
