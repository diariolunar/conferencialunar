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

function gerarResultado({
  capitulo,
  comentariosUsuario,
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
      observacao: "Minha Obra: conferência aprovada automaticamente."
    };
  }

  const tipoNormalizado = normalizarTexto(capitulo.tipo);

  const ehEspecial = tipoNormalizado === "especial";
  const ehPoesia = tipoNormalizado === "poesia";
  const ehNormal = !ehEspecial && !ehPoesia;

  const motivos = [];

  if (comentariosUsuario.length < minimoNecessario) {
    motivos.push(
      `Quantidade insuficiente de comentários do usuário (${comentariosUsuario.length}/${minimoNecessario}).`
    );
  }

  if (ehNormal && distribuicao.inicio <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no início.");
  }

  if (ehNormal && distribuicao.meio <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no meio.");
  }

  if (ehNormal && distribuicao.fim <= 0) {
    motivos.push("Nenhum comentário do usuário encontrado no fim.");
  }

  if (
    ehNormal &&
    tempoEstimado > 0 &&
    tempoReal > 0 &&
    tempoReal < tempoEstimado * 0.55
  ) {
    motivos.push("Tempo real muito abaixo do esperado para a leitura.");
  }

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
      user: comentario.user
    })),
    motivos,
    regraAplicada: {
      tipo: capitulo.tipo,
      minimoComentarios: minimoNecessario,
      exigeDistribuicao: ehNormal,
      exigeTempo: ehNormal,
      minhaObra: false
    },
    estatisticas: {
      comentarios: comentariosUsuario.length,
      minimoNecessario,
      tempoEstimado,
      tempoReal,
      distribuicao
    }
  };
}

async function verificarCapituloReal({
  capitulo,
  regras,
  userLeitor
}) {
  const tempoEstimadoAtual = calcularTempoEstimado(capitulo.palavras);

  if (capitulo.minhaObra) {
    return {
      ...capitulo,
      resultado: gerarResultado({
        capitulo,
        comentariosUsuario: [],
        distribuicao: {
          inicio: 0,
          meio: 0,
          fim: 0
        },
        minimoNecessario: 0,
        tempoEstimado: tempoEstimadoAtual,
        tempoReal: 0
      })
    };
  }

  const detalhes = await buscarDetalhesCapituloWattpad({
    capituloId: capitulo.wattpadId,
    linkCapitulo: capitulo.link,
    userLeitor
  });

  const comentariosUsuario = detalhes.comentariosUsuario || [];

  const distribuicao =
    detalhes.distribuicaoComentarios || {
      inicio: 0,
      meio: 0,
      fim: 0
    };

  const tempoEstimado = calcularTempoEstimado(detalhes.palavras);
  const tempoReal = calcularTempoReal(comentariosUsuario);

  const minimoNecessario = calcularMinimoComentarios({
    palavras: detalhes.palavras,
    tipo: capitulo.tipo,
    regras
  });

  return {
    ...capitulo,
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
      tempoReal
    })
  };
}

export async function verificarLeiturasPreparadas({
  leituras = [],
  userLeitor = "",
  regras = null
}) {
  const resultados = [];

  for (let index = 0; index < leituras.length; index += 1) {
    const leitura = leituras[index];

    const resultado = await verificarCapituloReal({
      capitulo: leitura,
      regras,
      userLeitor
    });

    resultados.push(resultado);
  }

  return resultados;
}