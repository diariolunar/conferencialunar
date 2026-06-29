import {
  atualizarDetalhesCapitulo,
  listarCapitulosDaObra
} from "./capitulosService.js";
import { buscarDetalhesCapituloWattpad } from "./capitulosDetalhesService.js";

const DIAS_PARA_CONSIDERAR_DESATUALIZADO = 14;

function dataFirestoreParaMillis(valor) {
  if (!valor) return 0;
  if (typeof valor.toMillis === "function") return valor.toMillis();
  if (valor.seconds) return Number(valor.seconds) * 1000;

  const data = new Date(valor).getTime();
  return Number.isNaN(data) ? 0 : data;
}

export function avaliarStatusCapitulo(capitulo = {}, agora = Date.now()) {
  const semLinkOuId = !capitulo.link && !capitulo.wattpadId;
  const semMetricas =
    Number(capitulo.palavras || 0) <= 0 ||
    Number(capitulo.paragrafos || 0) <= 0;

  const atualizadoEm = dataFirestoreParaMillis(capitulo.atualizadoEm);
  const idadeMs = atualizadoEm ? agora - atualizadoEm : Infinity;
  const antigo =
    idadeMs >
    DIAS_PARA_CONSIDERAR_DESATUALIZADO * 24 * 60 * 60 * 1000;

  return {
    semLinkOuId,
    semMetricas,
    antigo,
    precisaAtualizar: !semLinkOuId && (semMetricas || antigo)
  };
}

export function resumirStatusCapitulos(capitulos = []) {
  return capitulos.reduce(
    (resumo, capitulo) => {
      const status = avaliarStatusCapitulo(capitulo);

      resumo.total += 1;
      if (status.semLinkOuId) resumo.semLinkOuId += 1;
      if (status.semMetricas) resumo.semMetricas += 1;
      if (status.antigo) resumo.antigos += 1;
      if (status.precisaAtualizar) resumo.precisamAtualizar += 1;

      return resumo;
    },
    {
      total: 0,
      semLinkOuId: 0,
      semMetricas: 0,
      antigos: 0,
      precisamAtualizar: 0
    }
  );
}

export async function diagnosticarObras(obras = []) {
  const relatorio = [];

  for (const obra of obras) {
    const capitulos = await listarCapitulosDaObra(obra.id);
    const resumo = resumirStatusCapitulos(capitulos);

    relatorio.push({
      obra,
      capitulos,
      resumo,
      precisaAtencao:
        resumo.total === 0 ||
        resumo.precisamAtualizar > 0 ||
        resumo.semLinkOuId > 0
    });
  }

  return relatorio.sort((a, b) => {
    if (a.precisaAtencao !== b.precisaAtencao) {
      return a.precisaAtencao ? -1 : 1;
    }

    return (
      b.resumo.precisamAtualizar - a.resumo.precisamAtualizar ||
      b.resumo.semLinkOuId - a.resumo.semLinkOuId ||
      String(a.obra.titulo || "").localeCompare(String(b.obra.titulo || ""))
    );
  });
}

export async function atualizarCapitulosDaObraEmLote({
  obra,
  capitulos: capitulosInformados = null,
  somenteDesatualizados = false,
  onProgress = null,
  isCancelled = null
}) {
  const capitulos = capitulosInformados || (await listarCapitulosDaObra(obra.id));
  const candidatos = somenteDesatualizados
    ? capitulos.filter((capitulo) => avaliarStatusCapitulo(capitulo).precisaAtualizar)
    : capitulos;

  const resultado = {
    obraId: obra.id,
    obraTitulo: obra.titulo || "",
    total: candidatos.length,
    atualizados: 0,
    falhas: 0,
    semLinkOuId: 0,
    cancelado: false,
    erros: [],
    capitulosAtualizados: []
  };

  if (candidatos.length === 0) {
    onProgress?.({
      etapa: "finalizado",
      atual: 0,
      total: 0,
      titulo: "",
      resultado
    });

    return resultado;
  }

  for (let index = 0; index < candidatos.length; index += 1) {
    const capitulo = candidatos[index];

    if (isCancelled?.()) {
      resultado.cancelado = true;
      break;
    }

    onProgress?.({
      etapa: "atualizando",
      atual: index + 1,
      total: candidatos.length,
      titulo: capitulo.titulo || `Capítulo ${index + 1}`,
      resultado
    });

    if (!capitulo.link && !capitulo.wattpadId) {
      resultado.semLinkOuId += 1;
      continue;
    }

    try {
      const detalhes = await buscarDetalhesCapituloWattpad({
        capituloId: capitulo.wattpadId,
        linkCapitulo: capitulo.link
      });

      await atualizarDetalhesCapitulo(obra.id, capitulo.id, detalhes);

      resultado.atualizados += 1;
      resultado.capitulosAtualizados.push({
        ...capitulo,
        wattpadId: detalhes.capituloId || capitulo.wattpadId || "",
        palavras: Number(detalhes.palavras || 0),
        paragrafos: Number(detalhes.paragrafos || 0),
        comentariosTotais: Number(
          detalhes.comentariosTotaisCapitulo ||
            detalhes.comentariosTotais ||
            0
        ),
        distribuicaoComentarios: detalhes.distribuicaoComentarios || {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        }
      });
    } catch (erro) {
      resultado.falhas += 1;
      resultado.erros.push({
        capituloId: capitulo.id,
        titulo: capitulo.titulo || "",
        mensagem: erro.message || "Erro ao atualizar capítulo."
      });
    }
  }

  onProgress?.({
    etapa: resultado.cancelado ? "cancelado" : "finalizado",
    atual: Math.min(
      resultado.total,
      resultado.atualizados + resultado.falhas + resultado.semLinkOuId
    ),
    total: resultado.total,
    titulo: "",
    resultado
  });

  return resultado;
}

export function formatarResumoAtualizacao(resultado) {
  if (!resultado) return "";

  const prefixo = resultado.cancelado
    ? `"${resultado.obraTitulo}" cancelada:`
    : `"${resultado.obraTitulo}":`;

  return `${prefixo} ${resultado.atualizados} capítulo(s) atualizado(s), ${resultado.falhas} falha(s), ${resultado.semLinkOuId} sem link ou ID.`;
}
