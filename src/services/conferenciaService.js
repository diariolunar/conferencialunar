import { normalizarTexto } from "../utils/normalizarTexto.js";

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcularTempoEstimado(palavras = 0) {
  const palavrasNumero = Number(palavras || 0);

  if (palavrasNumero <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(palavrasNumero / 220));
}

function calcularMinimoComentarios({ palavras = 0, tipo = "Normal", regras = null }) {
  const tipoNormalizado = normalizarTexto(tipo);
  const palavrasNumero = Number(palavras || 0);

  if (tipoNormalizado === "especial") {
    return Number(regras?.minimoEspecial || 1);
  }

  if (tipoNormalizado === "poesia") {
    return Number(regras?.minimoPoesia || 3);
  }

  if (palavrasNumero > 0 && palavrasNumero < Number(regras?.palavrasCapituloCurto || 500)) {
    return Number(regras?.minimoCurto || 1);
  }

  if (palavrasNumero > Number(regras?.palavrasCapituloLongo || 4000)) {
    return Number(regras?.minimoLongo || 12);
  }

  return Number(regras?.minimoNormal || 6);
}

function gerarComentariosFake(capitulo, minimoNecessario) {
  const quantidade = Math.max(minimoNecessario, gerarNumeroAleatorio(4, 8));
  const posicoesBase = ["inicio", "meio", "fim"];
  const comentarios = [];

  for (let index = 0; index < quantidade; index += 1) {
    const posicao = posicoesBase[index % posicoesBase.length];

    comentarios.push({
      id: crypto.randomUUID(),
      posicao,
      texto: `Comentário mock ${index + 1} em ${capitulo.titulo}`,
      link: capitulo.link ? `${capitulo.link}#comentario-${index + 1}` : "",
      timestamp: Date.now() + index * 120000
    });
  }

  return comentarios;
}

function contarPorPosicao(comentarios = []) {
  return {
    inicio: comentarios.filter((comentario) => normalizarTexto(comentario.posicao) === "inicio").length,
    meio: comentarios.filter((comentario) => normalizarTexto(comentario.posicao) === "meio").length,
    fim: comentarios.filter((comentario) => normalizarTexto(comentario.posicao) === "fim").length
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

  return Math.ceil((timestamps[timestamps.length - 1] - timestamps[0]) / 60000);
}

function gerarResultado({ capitulo, comentarios, minimoNecessario, tempoEstimado, tempoReal }) {
  if (capitulo.minhaObra) {
    return {
      aprovado: true,
      aprovadoManualmente: false,
      motivoAprovacaoManual: "",
      comentarios: [],
      motivos: [],
      regraAplicada: {
        tipo: capitulo.tipo,
        minimoComentarios: 0,
        exigeDistribuicao: false,
        exigeTempo: false,
        minhaObra: true
      },
      estatisticas: {
        comentarios: 0,
        minimoNecessario: 0,
        tempoEstimado,
        tempoReal: 0,
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0
        }
      },
      observacao: "Minha Obra: conferência aprovada automaticamente."
    };
  }

  const tipoNormalizado = normalizarTexto(capitulo.tipo);
  const distribuicao = contarPorPosicao(comentarios);

  const ehEspecial = tipoNormalizado === "especial";
  const ehPoesia = tipoNormalizado === "poesia";
  const ehNormal = !ehEspecial && !ehPoesia;

  const motivos = [];

  if (comentarios.length < minimoNecessario) {
    motivos.push(`Quantidade insuficiente de comentários (${comentarios.length}/${minimoNecessario}).`);
  }

  if (ehNormal && distribuicao.inicio <= 0) {
    motivos.push("Nenhum comentário identificado no início.");
  }

  if (ehNormal && distribuicao.meio <= 0) {
    motivos.push("Nenhum comentário identificado no meio.");
  }

  if (ehNormal && distribuicao.fim <= 0) {
    motivos.push("Nenhum comentário identificado no fim.");
  }

  if (ehNormal && tempoEstimado > 0 && tempoReal > 0 && tempoReal < tempoEstimado * 0.55) {
    motivos.push("Tempo real muito abaixo do esperado para a leitura.");
  }

  return {
    aprovado: motivos.length === 0,
    aprovadoManualmente: false,
    motivoAprovacaoManual: "",
    comentarios,
    motivos,
    regraAplicada: {
      tipo: capitulo.tipo,
      minimoComentarios: minimoNecessario,
      exigeDistribuicao: ehNormal,
      exigeTempo: ehNormal,
      minhaObra: false
    },
    estatisticas: {
      comentarios: comentarios.length,
      minimoNecessario,
      tempoEstimado,
      tempoReal,
      distribuicao
    }
  };
}

export async function verificarLeiturasPreparadas({ leituras = [], regras = null }) {
  const resultados = [];

  for (const leitura of leituras) {
    const tempoEstimado = calcularTempoEstimado(leitura.palavras);

    if (leitura.minhaObra) {
      const resultado = gerarResultado({
        capitulo: leitura,
        comentarios: [],
        minimoNecessario: 0,
        tempoEstimado,
        tempoReal: 0
      });

      resultados.push({
        ...leitura,
        resultado
      });

      continue;
    }

    const minimoNecessario = calcularMinimoComentarios({
      palavras: leitura.palavras,
      tipo: leitura.tipo,
      regras
    });

    const comentarios = gerarComentariosFake(leitura, minimoNecessario);
    const tempoReal = calcularTempoReal(comentarios);

    const resultado = gerarResultado({
      capitulo: leitura,
      comentarios,
      minimoNecessario,
      tempoEstimado,
      tempoReal
    });

    resultados.push({
      ...leitura,
      resultado
    });
  }

  return resultados;
}