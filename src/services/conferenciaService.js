import { buscarDetalhesCapituloWattpad } from "./capitulosDetalhesService.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

function calcularTempoEstimado(palavras = 0) {
  const numeroPalavras = Number(palavras || 0);

  if (numeroPalavras <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(numeroPalavras / 220));
}

function calcularMinimoComentarios({
  palavras = 0,
  tipo = "Normal",
  regras = null
}) {
  const tipoNormalizado = normalizarTexto(tipo);
  const numeroPalavras = Number(palavras || 0);

  if (tipoNormalizado === "especial") {
    return Number(regras?.minimoEspecial || 1);
  }

  if (tipoNormalizado === "poesia") {
    return Number(regras?.minimoPoesia || 3);
  }

  if (
    numeroPalavras > 0 &&
    numeroPalavras < Number(regras?.palavrasCapituloCurto || 500)
  ) {
    return Number(regras?.minimoCurto || 1);
  }

  if (
    numeroPalavras >
    Number(regras?.palavrasCapituloLongo || 4000)
  ) {
    return Number(regras?.minimoLongo || 12);
  }

  return Number(regras?.minimoNormal || 6);
}

function gerarResumoComentarios(paragrafos = []) {
  const comentarios = [];

  paragrafos.forEach((paragrafo) => {
    const quantidade = Number(paragrafo.commentCount || 0);

    if (quantidade <= 0) {
      return;
    }

    for (let index = 0; index < quantidade; index += 1) {
      comentarios.push({
        id: `${paragrafo.id}-${index}`,
        posicao: paragrafo.posicao,
        texto: `Comentário encontrado no ${paragrafo.posicao}`,
        link: "",
        timestamp: null
      });
    }
  });

  return comentarios;
}

function contarDistribuicao(paragrafos = []) {
  return {
    inicio: paragrafos
      .filter((item) => item.posicao === "inicio")
      .reduce(
        (total, item) => total + Number(item.commentCount || 0),
        0
      ),

    meio: paragrafos
      .filter((item) => item.posicao === "meio")
      .reduce(
        (total, item) => total + Number(item.commentCount || 0),
        0
      ),

    fim: paragrafos
      .filter((item) => item.posicao === "fim")
      .reduce(
        (total, item) => total + Number(item.commentCount || 0),
        0
      )
  };
}

function calcularTempoReal({
  comentarios = 0,
  palavras = 0
}) {
  if (comentarios <= 0) {
    return 0;
  }

  const tempoBase = Math.ceil(Number(palavras || 0) / 260);

  return Math.max(1, tempoBase);
}

function gerarResultado({
  capitulo,
  comentarios,
  distribuicao,
  minimoNecessario,
  tempoEstimado,
  tempoReal
}) {
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
      observacao:
        "Minha Obra: conferência aprovada automaticamente."
    };
  }

  const tipoNormalizado = normalizarTexto(capitulo.tipo);

  const ehEspecial = tipoNormalizado === "especial";
  const ehPoesia = tipoNormalizado === "poesia";
  const ehNormal = !ehEspecial && !ehPoesia;

  const motivos = [];

  if (comentarios.length < minimoNecessario) {
    motivos.push(
      `Quantidade insuficiente de comentários (${comentarios.length}/${minimoNecessario}).`
    );
  }

  if (ehNormal && distribuicao.inicio <= 0) {
    motivos.push(
      "Nenhum comentário encontrado no início."
    );
  }

  if (ehNormal && distribuicao.meio <= 0) {
    motivos.push(
      "Nenhum comentário encontrado no meio."
    );
  }

  if (ehNormal && distribuicao.fim <= 0) {
    motivos.push(
      "Nenhum comentário encontrado no fim."
    );
  }

  if (
    ehNormal &&
    tempoEstimado > 0 &&
    tempoReal > 0 &&
    tempoReal < tempoEstimado * 0.55
  ) {
    motivos.push(
      "Tempo estimado abaixo do esperado."
    );
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

async function verificarCapituloReal(capitulo, regras) {
  if (capitulo.minhaObra) {
    const tempoEstimado = calcularTempoEstimado(
      capitulo.palavras
    );

    return {
      ...capitulo,
      resultado: gerarResultado({
        capitulo,
        comentarios: [],
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0
        },
        minimoNecessario: 0,
        tempoEstimado,
        tempoReal: 0
      })
    };
  }

  const detalhes = await buscarDetalhesCapituloWattpad({
    capituloId: capitulo.wattpadId,
    linkCapitulo: capitulo.link
  });

  const comentarios = gerarResumoComentarios(
    detalhes.paragrafosDetalhados || []
  );

  const distribuicao = contarDistribuicao(
    detalhes.paragrafosDetalhados || []
  );

  const tempoEstimado = calcularTempoEstimado(
    detalhes.palavras
  );

  const tempoReal = calcularTempoReal({
    comentarios: comentarios.length,
    palavras: detalhes.palavras
  });

  const minimoNecessario = calcularMinimoComentarios({
    palavras: detalhes.palavras,
    tipo: capitulo.tipo,
    regras
  });

  return {
    ...capitulo,
    palavras: detalhes.palavras,
    paragrafos: detalhes.paragrafos,
    comentariosTotais: detalhes.comentariosTotais,
    distribuicaoComentarios:
      detalhes.distribuicaoComentarios,

    resultado: gerarResultado({
      capitulo,
      comentarios,
      distribuicao,
      minimoNecessario,
      tempoEstimado,
      tempoReal
    })
  };
}

export async function verificarLeiturasPreparadas({
  leituras = [],
  regras = null
}) {
  const resultados = [];

  for (let index = 0; index < leituras.length; index += 1) {
    const leitura = leituras[index];

    const resultado = await verificarCapituloReal(
      leitura,
      regras
    );

    resultados.push(resultado);
  }

  return resultados;
}