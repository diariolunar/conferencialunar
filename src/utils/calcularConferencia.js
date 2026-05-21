import { estimarTempoLeitura } from "./estimarTempoLeitura.js";

function normalizarTipo(tipo = "") {
  const tipoNormalizado = String(tipo || "").toLowerCase().trim();

  if (tipoNormalizado === "especial") {
    return "Especial";
  }

  if (
    tipoNormalizado === "poesia" ||
    tipoNormalizado === "poema"
  ) {
    return "Poesia";
  }

  return "Normal";
}

function calcularMinimoComentarios(capitulo, regras) {
  const tipo = normalizarTipo(capitulo.tipo);
  const palavras = Number(capitulo.palavras || 0);

  if (tipo === "Especial") {
    return regras.minimoEspecial;
  }

  if (tipo === "Poesia") {
    return regras.minimoPoesia;
  }

  if (palavras > 0 && palavras < regras.palavrasCapituloCurto) {
    return regras.minimoCurto;
  }

  if (palavras > regras.palavrasCapituloLongo) {
    return regras.minimoLongo;
  }

  return regras.minimoNormal;
}

function validarDistribuicao(comentarios = []) {
  const inicio = comentarios.some(
    (comentario) => comentario.posicao === "inicio"
  );

  const meio = comentarios.some(
    (comentario) => comentario.posicao === "meio"
  );

  const fim = comentarios.some(
    (comentario) => comentario.posicao === "fim"
  );

  return {
    inicio,
    meio,
    fim,
    valido: inicio && meio && fim
  };
}

function calcularTempoReal(comentarios = []) {
  const timestamps = comentarios
    .map((comentario) => comentario.timestamp)
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return 0;
  }

  return Math.ceil(
    (timestamps[timestamps.length - 1] - timestamps[0]) / 60000
  );
}

export function calcularConferencia({
  capitulo,
  comentarios = [],
  regras
}) {
  const tipo = normalizarTipo(capitulo.tipo);
  const minimo = calcularMinimoComentarios(capitulo, regras);
  const totalComentarios = comentarios.length;

  const tempoEstimado = estimarTempoLeitura(
    capitulo.palavras,
    regras.palavrasPorMinuto
  );

  const tempoReal = calcularTempoReal(comentarios);
  const distribuicao = validarDistribuicao(comentarios);

  const ehNormal = tipo === "Normal";
  const ehCurto =
    ehNormal &&
    Number(capitulo.palavras || 0) > 0 &&
    Number(capitulo.palavras || 0) < regras.palavrasCapituloCurto;

  const exigeDistribuicao =
    ehNormal &&
    !ehCurto &&
    regras.exigeDistribuicaoNormal;

  const exigeTempo =
    ehNormal &&
    !ehCurto &&
    tempoEstimado > 0 &&
    tempoReal > 0;

  const motivos = [];

  if (totalComentarios < minimo) {
    motivos.push(
      `Quantidade insuficiente de comentários. Necessário: ${minimo}. Encontrado: ${totalComentarios}.`
    );
  }

  if (exigeDistribuicao && !distribuicao.valido) {
    motivos.push(
      "Distribuição inválida. O capítulo normal exige comentários no início, meio e fim."
    );
  }

  if (exigeTempo && tempoReal < tempoEstimado) {
    motivos.push(
      `Tempo insuficiente. Estimado: ${tempoEstimado}min. Real: ${tempoReal}min.`
    );
  }

  return {
    aprovado: motivos.length === 0,
    aprovadoManualmente: false,
    motivoAprovacaoManual: "",

    tipoAplicado: tipo,
    regraAplicada: {
      minimoComentarios: minimo,
      exigeDistribuicao,
      exigeTempo,
      capituloCurto: ehCurto
    },

    estatisticas: {
      comentarios: totalComentarios,
      minimoNecessario: minimo,
      tempoEstimado,
      tempoReal
    },

    distribuicao,
    comentarios,
    motivos
  };
}