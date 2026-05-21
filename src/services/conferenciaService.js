import { normalizarTexto } from "../utils/normalizarTexto.js";

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarTempoReal(minimo) {
  return minimo + gerarNumeroAleatorio(-2, 6);
}

function calcularTempoEstimado(palavras = 0) {
  const palavrasNumero = Number(palavras || 0);

  if (palavrasNumero <= 0) {
    return 5;
  }

  return Math.max(5, Math.ceil(palavrasNumero / 220));
}

function calcularMinimoComentarios({
  palavras = 0,
  paragrafos = 0,
  tipo = "Normal",
  regras = null
}) {
  const palavrasNumero = Number(palavras || 0);
  const paragrafosNumero = Number(paragrafos || 0);

  if (tipo === "Poesia") {
    return 3;
  }

  if (tipo === "Especial") {
    return Math.max(6, Math.ceil(paragrafosNumero / 8));
  }

  const baseadoEmParagrafos = Math.ceil(paragrafosNumero / 10);
  const baseadoEmPalavras = Math.ceil(palavrasNumero / 1200);

  const minimo = Math.max(
    5,
    baseadoEmParagrafos,
    baseadoEmPalavras
  );

  if (!regras) {
    return minimo;
  }

  return Math.max(
    minimo,
    Number(regras.minimoComentariosNormal || 5)
  );
}

function gerarComentariosFake(capitulo) {
  const quantidade = gerarNumeroAleatorio(4, 12);

  const posicoesBase = [
    "início",
    "meio",
    "fim"
  ];

  const comentarios = [];

  for (let index = 0; index < quantidade; index += 1) {
    const posicao =
      posicoesBase[index % posicoesBase.length];

    comentarios.push({
      id: crypto.randomUUID(),
      posicao,
      texto: gerarTextoComentario(posicao, capitulo.titulo),
      link: capitulo.link
        ? `${capitulo.link}#comentario-${index + 1}`
        : ""
    });
  }

  return comentarios;
}

function gerarTextoComentario(posicao, titulo) {
  const comentariosInicio = [
    "Gostei muito da abertura desse capítulo.",
    "Esse começo ficou muito forte.",
    "A introdução me prendeu rápido.",
    "Começou muito bem.",
    "Esse início ficou interessante."
  ];

  const comentariosMeio = [
    "Aqui a leitura ficou intensa.",
    "Essa parte do meio ficou boa.",
    "Gostei da construção dessa cena.",
    "Essa interação ficou legal.",
    "A narrativa ficou fluida aqui."
  ];

  const comentariosFim = [
    "O final desse capítulo ficou forte.",
    "Esse encerramento me deixou curioso.",
    "Terminou muito bem.",
    "Gostei muito desse final.",
    "Esse fechamento ficou bom."
  ];

  let lista = comentariosInicio;

  if (posicao === "meio") {
    lista = comentariosMeio;
  }

  if (posicao === "fim") {
    lista = comentariosFim;
  }

  const comentario =
    lista[gerarNumeroAleatorio(0, lista.length - 1)];

  return `${comentario} (${titulo})`;
}

function contarPorPosicao(comentarios = []) {
  return {
    inicio: comentarios.filter(
      (comentario) =>
        normalizarTexto(comentario.posicao) === "inicio"
    ).length,

    meio: comentarios.filter(
      (comentario) =>
        normalizarTexto(comentario.posicao) === "meio"
    ).length,

    fim: comentarios.filter(
      (comentario) =>
        normalizarTexto(comentario.posicao) === "fim"
    ).length
  };
}

function validarDistribuicao(distribuicao) {
  const motivos = [];

  if (distribuicao.inicio <= 0) {
    motivos.push(
      "Nenhum comentário identificado no início."
    );
  }

  if (distribuicao.meio <= 0) {
    motivos.push(
      "Nenhum comentário identificado no meio."
    );
  }

  if (distribuicao.fim <= 0) {
    motivos.push(
      "Nenhum comentário identificado no fim."
    );
  }

  return motivos;
}

function validarTempo({
  tempoEstimado,
  tempoReal
}) {
  const motivos = [];

  if (tempoReal < tempoEstimado * 0.55) {
    motivos.push(
      "Tempo real muito abaixo do esperado para a leitura."
    );
  }

  return motivos;
}

function validarQuantidade({
  comentarios,
  minimoNecessario
}) {
  const motivos = [];

  if (comentarios.length < minimoNecessario) {
    motivos.push(
      `Quantidade insuficiente de comentários (${comentarios.length}/${minimoNecessario}).`
    );
  }

  return motivos;
}

function gerarResultado({
  capitulo,
  comentarios,
  minimoNecessario,
  tempoEstimado,
  tempoReal
}) {
  const distribuicao = contarPorPosicao(comentarios);

  const motivos = [
    ...validarQuantidade({
      comentarios,
      minimoNecessario
    }),

    ...validarDistribuicao(distribuicao),

    ...validarTempo({
      tempoEstimado,
      tempoReal
    })
  ];

  const aprovado = motivos.length === 0;

  return {
    aprovado,
    aprovadoManualmente: false,
    motivoAprovacaoManual: "",

    comentarios,

    motivos,

    estatisticas: {
      comentarios: comentarios.length,
      minimoNecessario,
      tempoEstimado,
      tempoReal,
      distribuicao
    }
  };
}

export async function verificarLeiturasPreparadas({
  leituras = [],
  regras = null
}) {
  const resultados = [];

  for (const leitura of leituras) {
    const comentarios = gerarComentariosFake(leitura);

    const minimoNecessario =
      calcularMinimoComentarios({
        palavras: leitura.palavras,
        paragrafos: leitura.paragrafos,
        tipo: leitura.tipo,
        regras
      });

    const tempoEstimado =
      calcularTempoEstimado(leitura.palavras);

    const tempoReal =
      gerarTempoReal(tempoEstimado);

    const resultado = gerarResultado({
      capitulo: leitura,
      comentarios,
      minimoNecessario,
      tempoEstimado,
      tempoReal
    });

    resultados.push({
      capituloId: leitura.capituloId || "",
      titulo: leitura.titulo,
      tipo: leitura.tipo,
      palavras: leitura.palavras,
      paragrafos: leitura.paragrafos,
      link: leitura.link,
      resultado
    });
  }

  return resultados;
}
