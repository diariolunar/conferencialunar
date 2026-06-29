import { buscarDetalhesCapituloWattpad } from "./capitulosDetalhesService.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const USERS_APROVACAO_AUTOMATICA = new Set(["rkymae", "jasonscott37"]);

function normalizarUserLeitor(user = "") {
  return normalizarTexto(user).replace(/^@/, "").trim();
}

function userTemAprovacaoAutomatica(user = "") {
  return USERS_APROVACAO_AUTOMATICA.has(normalizarUserLeitor(user));
}

function calcularTempoEstimado(palavras = 0, palavrasPorMinuto = 200) {
  const numeroPalavras = Number(palavras || 0);
  const ritmo = Number(palavrasPorMinuto || 200);

  if (numeroPalavras <= 0 || ritmo <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(numeroPalavras / ritmo));
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

function calcularTempoReal(comentarios = []) {
  const datas = comentarios
    .map((comentario) => comentario.criadoEm || comentario.created || "")
    .filter(Boolean)
    .map((data) => new Date(data).getTime())
    .filter((tempo) => !Number.isNaN(tempo))
    .sort((a, b) => a - b);

  if (datas.length < 2) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil((datas[datas.length - 1] - datas[0]) / 60000)
  );
}

function garantirDistribuicao(distribuicao = {}) {
  return {
    inicio: Number(distribuicao.inicio || 0),
    meio: Number(distribuicao.meio || 0),
    fim: Number(distribuicao.fim || 0),
    geral: Number(distribuicao.geral || 0)
  };
}

function capituloEhCurto({ palavras = 0, tipo = "Normal", regras = null }) {
  const tipoNormalizado = normalizarTexto(tipo);
  const numeroPalavras = Number(palavras || 0);

  return (
    tipoNormalizado === "normal" &&
    numeroPalavras > 0 &&
    numeroPalavras < Number(regras?.palavrasCapituloCurto || 500)
  );
}

function calcularExigencias({ capitulo, palavras = 0, regras = null }) {
  const tipoNormalizado = normalizarTexto(capitulo.tipo);
  const ehEspecial = tipoNormalizado === "especial";
  const ehPoesia = tipoNormalizado === "poesia";
  const ehNormal = !ehEspecial && !ehPoesia;
  const ehCurto = capituloEhCurto({
    palavras,
    tipo: capitulo.tipo,
    regras
  });

  const exigeDistribuicao =
    ehNormal && !ehCurto && regras?.exigeDistribuicaoNormal !== false;

  const exigeTempo = ehNormal && !ehCurto;

  return {
    ehNormal,
    ehCurto,
    exigeDistribuicao,
    exigeTempo
  };
}

function gerarResultadoAprovacaoAutomaticaUsuario({ capitulo, regras }) {
  const tempoEstimado = calcularTempoEstimado(
    capitulo.palavras,
    regras?.palavrasPorMinuto
  );

  const minimoNecessario = calcularMinimoComentarios({
    palavras: capitulo.palavras,
    tipo: capitulo.tipo,
    regras
  });

  return {
    ...capitulo,
    erroVerificacao: false,
    resultado: {
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
        minhaObra: Boolean(capitulo.minhaObra),
        usuarioLiberado: true
      },
      estatisticas: {
        comentarios: minimoNecessario,
        minimoNecessario,
        tempoEstimado,
        tempoReal: tempoEstimado + 1,
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        }
      },
      observacao: ""
    }
  };
}

function gerarResultadoFalha({ capitulo, erro, regras }) {
  const tempoEstimado = calcularTempoEstimado(
    capitulo.palavras,
    regras?.palavrasPorMinuto
  );

  return {
    ...capitulo,
    erroVerificacao: true,
    erroMensagem:
      erro?.message ||
      "Não foi possível verificar este capítulo automaticamente.",
    resultado: {
      aprovado: false,
      aprovadoManualmente: false,
      motivoAprovacaoManual: "",
      comentarios: [],
      motivos: [
        erro?.message ||
          "Falha ao consultar o Wattpad. É possível aprovar manualmente com justificativa."
      ],
      regraAplicada: {
        tipo: capitulo.tipo,
        minimoComentarios: 0,
        exigeDistribuicao: false,
        exigeTempo: false,
        minhaObra: false,
        falhaWattpad: true
      },
      estatisticas: {
        comentarios: 0,
        minimoNecessario: 0,
        tempoEstimado,
        tempoReal: 0,
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        }
      },
      observacao:
        "Falha na verificação automática. Confira manualmente ou tente novamente."
    }
  };
}

function gerarResultado({
  capitulo,
  comentariosUsuario,
  distribuicao,
  minimoNecessario,
  tempoEstimado,
  tempoReal,
  palavras,
  regras
}) {
  const distribuicaoSegura = garantirDistribuicao(distribuicao);

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
          fim: 0,
          geral: 0
        }
      },
      observacao: "Minha Obra: conferência aprovada automaticamente."
    };
  }

  const exigencias = calcularExigencias({
    capitulo,
    palavras: palavras ?? capitulo.palavras,
    regras
  });

  const motivos = [];

  if (comentariosUsuario.length < minimoNecessario) {
    motivos.push(
      `Quantidade insuficiente de comentários do usuário (${comentariosUsuario.length}/${minimoNecessario}).`
    );
  }

  if (exigencias.exigeDistribuicao && distribuicaoSegura.inicio <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no início.");
  }

  if (exigencias.exigeDistribuicao && distribuicaoSegura.meio <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no meio.");
  }

  if (exigencias.exigeDistribuicao && distribuicaoSegura.fim <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no fim.");
  }

  if (
    exigencias.exigeTempo &&
    tempoEstimado > 0 &&
    tempoReal > 0 &&
    tempoReal < tempoEstimado * 0.55
  ) {
    motivos.push("Tempo real muito abaixo do esperado para a leitura.");
  }

  const comentariosGerais = distribuicaoSegura.geral;

  const observacao =
    comentariosGerais > 0
      ? `${comentariosGerais} comentário(s) geral(is) encontrado(s). Eles contam para a quantidade mínima, mas não substituem comentários no início, meio e fim.`
      : "";

  return {
    aprovado: motivos.length === 0,
    aprovadoManualmente: false,
    motivoAprovacaoManual: "",
    comentarios: comentariosUsuario.map((comentario) => ({
      id: comentario.id,
      posicao: comentario.posicao,
      texto: comentario.texto,
      link: comentario.link,
      criadoEm: comentario.criadoEm,
      user: comentario.user,
      tipo: comentario.tipo || comentario.posicao
    })),
    motivos,
    regraAplicada: {
      tipo: capitulo.tipo,
      minimoComentarios: minimoNecessario,
      exigeDistribuicao: exigencias.exigeDistribuicao,
      exigeTempo: exigencias.exigeTempo,
      capituloCurto: exigencias.ehCurto,
      minhaObra: false,
      comentarioGeralContaQuantidade: true,
      comentarioGeralContaDistribuicao: false
    },
    estatisticas: {
      comentarios: comentariosUsuario.length,
      minimoNecessario,
      tempoEstimado,
      tempoReal,
      distribuicao: distribuicaoSegura
    },
    observacao
  };
}

async function verificarCapituloReal({
  capitulo,
  regras,
  userLeitor
}) {
  const tempoEstimadoAtual = calcularTempoEstimado(
    capitulo.palavras,
    regras?.palavrasPorMinuto
  );

  if (userTemAprovacaoAutomatica(userLeitor)) {
    return gerarResultadoAprovacaoAutomaticaUsuario({ capitulo, regras });
  }

  if (capitulo.minhaObra) {
    return {
      ...capitulo,
      erroVerificacao: false,
      resultado: gerarResultado({
        capitulo,
        comentariosUsuario: [],
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        },
        minimoNecessario: 0,
        tempoEstimado: tempoEstimadoAtual,
        tempoReal: 0,
        palavras: capitulo.palavras,
        regras
      })
    };
  }

  try {
    const detalhes = await buscarDetalhesCapituloWattpad({
      capituloId: capitulo.wattpadId,
      linkCapitulo: capitulo.link,
      userLeitor
    });

    const comentariosUsuario = detalhes.comentariosUsuario || [];

    const distribuicao = garantirDistribuicao(
      detalhes.distribuicaoComentarios || {
        inicio: 0,
        meio: 0,
        fim: 0,
        geral: 0
      }
    );

    const tempoEstimado = calcularTempoEstimado(
      detalhes.palavras,
      regras?.palavrasPorMinuto
    );
    const tempoReal = calcularTempoReal(comentariosUsuario);

    const minimoNecessario = calcularMinimoComentarios({
      palavras: detalhes.palavras,
      tipo: capitulo.tipo,
      regras
    });

    return {
      ...capitulo,
      erroVerificacao: false,
      palavras: detalhes.palavras,
      paragrafos: detalhes.paragrafos,
      comentariosTotais: detalhes.comentariosTotaisCapitulo || 0,
      comentariosUsuarioTotal: detalhes.comentariosUsuarioTotal || 0,
      distribuicaoComentarios: distribuicao,
      resultado: gerarResultado({
        capitulo,
        comentariosUsuario,
        distribuicao,
        minimoNecessario,
        tempoEstimado,
        tempoReal,
        palavras: detalhes.palavras,
        regras
      })
    };
  } catch (erro) {
    console.error("Erro ao verificar capítulo:", capitulo.titulo, erro);
    return gerarResultadoFalha({ capitulo, erro, regras });
  }
}

export async function verificarLeiturasPreparadas({
  leituras = [],
  userLeitor = "",
  regras = null,
  onProgress = null
}) {
  const resultados = [];

  for (let index = 0; index < leituras.length; index += 1) {
    const leitura = leituras[index];

    if (typeof onProgress === "function") {
      onProgress({
        etapa: "verificando",
        atual: index + 1,
        total: leituras.length,
        titulo: leitura.titulo || leitura.textoFicha || `Capítulo ${index + 1}`
      });
    }

    const resultado = await verificarCapituloReal({
      capitulo: leitura,
      regras,
      userLeitor
    });

    resultados.push(resultado);

    if (typeof onProgress === "function") {
      onProgress({
        etapa: "concluido",
        atual: index + 1,
        total: leituras.length,
        titulo: leitura.titulo || leitura.textoFicha || `Capítulo ${index + 1}`
      });
    }
  }

  if (typeof onProgress === "function") {
    onProgress({
      etapa: "finalizado",
      atual: leituras.length,
      total: leituras.length,
      titulo: ""
    });
  }

  return resultados;
}
