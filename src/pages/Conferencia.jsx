import { useEffect, useMemo, useState } from "react";

import { DIAS_SEMANA } from "../utils/diasSemana.js";
import { interpretarFicha } from "../utils/interpretarFicha.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

import { listarObras } from "../services/obrasService.js";
import { listarSubs } from "../services/subsService.js";

import {
  encontrarCapituloPorTexto,
  listarCapitulosDaObra
} from "../services/capitulosService.js";

import { buscarRegrasPadrao } from "../services/regrasService.js";
import { verificarLeiturasPreparadas } from "../services/conferenciaService.js";
import { salvarConferenciaNoHistorico } from "../services/historicoService.js";

const TIPOS_CAPITULO = ["Normal", "Especial", "Poesia"];

export default function Conferencia() {
  const [diaSemana, setDiaSemana] = useState("");
  const [textoFicha, setTextoFicha] = useState("");

  const [obras, setObras] = useState([]);
  const [subs, setSubs] = useState([]);
  const [regras, setRegras] = useState(null);

  const [plano, setPlano] = useState(null);
  const [resultadoVerificacao, setResultadoVerificacao] = useState([]);

  const [preparando, setPreparando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [salvandoHistorico, setSalvandoHistorico] = useState(false);

  const [mensagem, setMensagem] = useState("");

  const [fichaAberta, setFichaAberta] = useState(true);
  const [interpretacaoAberta, setInterpretacaoAberta] = useState(true);
  const [planoAberto, setPlanoAberto] = useState(true);

  const gruposDeLeitura = useMemo(() => {
    if (!plano?.leituras?.length) {
      return [];
    }

    const mapa = new Map();

    plano.leituras.forEach((leitura, index) => {
      const chave =
        leitura.obraId ||
        leitura.obraTitulo ||
        leitura.obraInformada ||
        `obra-sem-id-${index}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          obraId: leitura.obraId || "",
          obraTitulo:
            leitura.obraTitulo ||
            leitura.obraInformada ||
            "Obra não encontrada",
          minhaObra: Boolean(leitura.minhaObra),
          leituras: []
        });
      }

      mapa.get(chave).leituras.push({
        ...leitura,
        indexOriginal: index
      });
    });

    return Array.from(mapa.values());
  }, [plano]);

  async function carregarBase() {
    try {
      const [obrasEncontradas, subsEncontrados, regrasEncontradas] =
        await Promise.all([listarObras(), listarSubs(), buscarRegrasPadrao()]);

      setObras(obrasEncontradas);
      setSubs(subsEncontrados);
      setRegras(regrasEncontradas);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras, subs e regras.");
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  function limparCodigo(texto = "") {
    return normalizarTexto(texto)
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function encontrarSubPorNome(nomeSub = "") {
    const nomeNormalizado = normalizarTexto(nomeSub);
    const codigoSub = limparCodigo(nomeSub);

    if (!nomeNormalizado && !codigoSub) return null;

    const exato = subs.find((sub) => {
      const subNormalizado = normalizarTexto(sub.nome);
      const codigoBanco = limparCodigo(sub.nome);

      return (
        subNormalizado === nomeNormalizado ||
        codigoBanco === codigoSub ||
        codigoBanco.startsWith(codigoSub)
      );
    });

    if (exato) return exato;

    return (
      subs.find((sub) => {
        const subNormalizado = normalizarTexto(sub.nome);
        const codigoBanco = limparCodigo(sub.nome);

        return (
          subNormalizado.includes(nomeNormalizado) ||
          nomeNormalizado.includes(subNormalizado) ||
          codigoBanco.includes(codigoSub) ||
          codigoSub.includes(codigoBanco)
        );
      }) || null
    );
  }

  function encontrarObraPorTitulo(titulo = "") {
    const tituloNormalizado = normalizarTexto(titulo);

    if (!tituloNormalizado) return null;

    const exata = obras.find(
      (obra) => normalizarTexto(obra.titulo) === tituloNormalizado
    );

    if (exata) return exata;

    return (
      obras.find((obra) => {
        const obraNormalizada = normalizarTexto(obra.titulo);

        return (
          obraNormalizada.includes(tituloNormalizado) ||
          tituloNormalizado.includes(obraNormalizada)
        );
      }) || null
    );
  }

  function montarLeitura({
    textoFicha,
    obra,
    capitulo,
    minhaObra = false,
    obraInformada = ""
  }) {
    return {
      textoFicha,
      obraInformada,
      obraId: obra?.id || "",
      obraTitulo: obra?.titulo || obraInformada || "",
      capituloId: capitulo?.id || "",
      wattpadId: capitulo?.wattpadId || capitulo?.id || "",
      titulo: capitulo?.titulo || textoFicha || "",
      link: capitulo?.link || "",
      palavras: Number(capitulo?.palavras || 0),
      paragrafos: Number(capitulo?.paragrafos || 0),
      comentariosTotais: Number(capitulo?.comentariosTotais || 0),
      distribuicaoComentarios: capitulo?.distribuicaoComentarios || {
        inicio: 0,
        meio: 0,
        fim: 0,
        geral: 0
      },
      ordem: capitulo?.ordem || "",
      tipo: capitulo?.tipo || "Normal",
      encontrado: Boolean(capitulo),
      minhaObra
    };
  }

  async function prepararLeiturasDeBloco(bloco) {
    const obraEncontrada = encontrarObraPorTitulo(bloco.obra);

    if (!obraEncontrada) {
      return {
        obraEncontrada: null,
        capitulosDaObra: [],
        leituras: bloco.capitulos.map((capituloInformado) =>
          montarLeitura({
            textoFicha: capituloInformado,
            obra: null,
            capitulo: null,
            minhaObra: bloco.minhaObra,
            obraInformada: bloco.obra
          })
        )
      };
    }

    const capitulosDaObra = await listarCapitulosDaObra(obraEncontrada.id);

    if (bloco.tudoLido) {
      const ultimosDois = [...capitulosDaObra]
        .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
        .slice(-2);

      return {
        obraEncontrada,
        capitulosDaObra,
        leituras: ultimosDois.map((capitulo) =>
          montarLeitura({
            textoFicha: "Li tudo — conferindo últimos capítulos",
            obra: obraEncontrada,
            capitulo,
            minhaObra: bloco.minhaObra,
            obraInformada: bloco.obra
          })
        )
      };
    }

    if (bloco.minhaObra) {
      return {
        obraEncontrada,
        capitulosDaObra,
        leituras: [
          montarLeitura({
            textoFicha: "Minha Obra",
            obra: obraEncontrada,
            capitulo: capitulosDaObra[0] || null,
            minhaObra: true,
            obraInformada: bloco.obra
          })
        ]
      };
    }

    return {
      obraEncontrada,
      capitulosDaObra,
      leituras: bloco.capitulos.map((capituloInformado) => {
        const capituloEncontrado = encontrarCapituloPorTexto(
          capitulosDaObra,
          capituloInformado
        );

        return montarLeitura({
          textoFicha: capituloInformado,
          obra: obraEncontrada,
          capitulo: capituloEncontrado,
          minhaObra: bloco.minhaObra,
          obraInformada: bloco.obra
        });
      })
    };
  }

  async function prepararConferencia(evento) {
    evento.preventDefault();

    if (!diaSemana) {
      setMensagem("Selecione obrigatoriamente o dia da leitura.");
      return;
    }

    if (!textoFicha.trim()) {
      setMensagem("Cole a ficha antes de preparar a conferência.");
      return;
    }

    setPreparando(true);
    setMensagem("");
    setResultadoVerificacao([]);

    try {
      const ficha = interpretarFicha(textoFicha);
      const subEncontrado = encontrarSubPorNome(ficha.sub);

      const blocos = ficha.blocosObras?.length
        ? ficha.blocosObras
        : [
            {
              obra: ficha.obraLida,
              capitulos: ficha.capitulosInformados,
              tudoLido: false,
              minhaObra: ficha.minhaObra,
              feedbackOferecido: ficha.feedbackOferecido
            }
          ];

      const leiturasPreparadas = [];
      const capitulosPorObra = {};
      let primeiraObraEncontrada = null;

      for (const bloco of blocos) {
        const preparado = await prepararLeiturasDeBloco({
          ...bloco,
          minhaObra: bloco.minhaObra || ficha.minhaObra
        });

        if (preparado.obraEncontrada && !primeiraObraEncontrada) {
          primeiraObraEncontrada = preparado.obraEncontrada;
        }

        if (preparado.obraEncontrada) {
          capitulosPorObra[preparado.obraEncontrada.id] =
            preparado.capitulosDaObra;
        }

        leiturasPreparadas.push(...preparado.leituras);
      }

      setPlano({
        ficha,
        diaSemana,
        subSelecionado: subEncontrado?.nome || ficha.sub,
        subEncontrado: Boolean(subEncontrado),
        obraSelecionadaId: primeiraObraEncontrada?.id || "",
        obraEncontrada: primeiraObraEncontrada,
        capitulosDaObra: primeiraObraEncontrada
          ? capitulosPorObra[primeiraObraEncontrada.id] || []
          : [],
        capitulosPorObra,
        leituras: leiturasPreparadas
      });

      setFichaAberta(false);
      setInterpretacaoAberta(true);
      setPlanoAberto(true);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao preparar conferência.");
    } finally {
      setPreparando(false);
    }
  }

  async function iniciarVerificacao() {
    if (!plano) return;

    setVerificando(true);
    setMensagem("");

    try {
      const resultados = await verificarLeiturasPreparadas({
        leituras: plano.leituras,
        userLeitor: plano.ficha.userLeitor,
        regras
      });

      setResultadoVerificacao(resultados);

      setInterpretacaoAberta(false);
      setPlanoAberto(false);

      setMensagem("Verificação concluída.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao verificar leituras.");
    } finally {
      setVerificando(false);
    }
  }

  async function salvarHistorico() {
    try {
      setSalvandoHistorico(true);

      const resumo = gerarResumoConferencia({
        sub: plano.subSelecionado,
        diaSemana: plano.diaSemana,
        nomeLeitor: plano.ficha.nomeLeitor,
        userLeitor: plano.ficha.userLeitor,
        adm: plano.ficha.adm,
        obraTitulo:
          resultadoVerificacao.length > 1
            ? "Múltiplas obras"
            : resultadoVerificacao[0]?.obraTitulo || "",
        capitulos: resultadoVerificacao
      });

      await salvarConferenciaNoHistorico({
        sub: plano.subSelecionado,
        diaSemana: plano.diaSemana,
        nomeLeitor: plano.ficha.nomeLeitor,
        userLeitor: plano.ficha.userLeitor,
        adm: plano.ficha.adm,
        minhaObra: plano.ficha.minhaObra,
        feedbackOferecido: plano.ficha.feedbackOferecido,
        obraId: resultadoVerificacao[0]?.obraId || "",
        obraTitulo:
          resultadoVerificacao.length > 1
            ? "Múltiplas obras"
            : resultadoVerificacao[0]?.obraTitulo || "",
        capitulos: resultadoVerificacao,
        textoFichaOriginal: plano.ficha.textoOriginal,
        resumo
      });

      setMensagem("Conferência salva com sucesso.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar conferência.");
    } finally {
      setSalvandoHistorico(false);
    }
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Conferência</h2>
        <p>
          Cole a ficha, revise as leituras e faça a verificação automática.
        </p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      {/* restante do componente permanece igual */}

      {resultadoVerificacao.length > 0 && (
        <div className="card">
          <h3>Resultado da verificação</h3>

          <div className="conference-list">
            {resultadoVerificacao.map((resultado, index) => (
              <div
                key={`${resultado.capituloId}-${index}`}
                className={`conference-item ${
                  resultado.resultado.aprovado
                    ? "result-approved"
                    : "result-rejected"
                }`}
              >
                <div className="conference-item-header">
                  <div>
                    <span>{resultado.obraTitulo || "Obra"}</span>
                    <strong>{resultado.titulo}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {resultado.resultado.aprovado
                        ? "Aprovado"
                        : "Reprovado"}
                    </strong>
                  </div>
                </div>

                {resultado.resultado.observacao && (
                  <div className="notice-card">
                    {resultado.resultado.observacao}
                  </div>
                )}

                <div className="chapter-meta-grid">
                  <div>
                    <span>Comentários</span>
                    <strong>
                      {resultado.resultado.estatisticas.comentarios}
                    </strong>
                  </div>

                  <div>
                    <span>Mínimo</span>
                    <strong>
                      {
                        resultado.resultado.estatisticas
                          .minimoNecessario
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Distribuição</span>

                    <strong>
                      I:{" "}
                      {resultado.resultado.estatisticas
                        .distribuicao?.inicio || 0}
                      {" / "}
                      M:{" "}
                      {resultado.resultado.estatisticas
                        .distribuicao?.meio || 0}
                      {" / "}
                      F:{" "}
                      {resultado.resultado.estatisticas
                        .distribuicao?.fim || 0}
                      {" / "}
                      G:{" "}
                      {resultado.resultado.estatisticas
                        .distribuicao?.geral || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Tempo</span>

                    <strong>
                      {resultado.resultado.estatisticas.tempoReal}min /{" "}
                      {
                        resultado.resultado.estatisticas
                          .tempoEstimado
                      }
                      min
                    </strong>
                  </div>
                </div>

                {resultado.resultado.motivos.length > 0 && (
                  <div className="warning-list">
                    {resultado.resultado.motivos.map((motivo) => (
                      <p key={motivo}>❌ {motivo}</p>
                    ))}
                  </div>
                )}

                {resultado.resultado.comentarios.length > 0 && (
                  <details className="comments-details">
                    <summary>Ver comentários encontrados</summary>

                    <div className="comments-list">
                      {resultado.resultado.comentarios.map(
                        (comentario) => (
                          <div
                            className="comment-card"
                            key={comentario.id}
                          >
                            <strong>
                              {comentario.posicao}
                            </strong>

                            <p>{comentario.texto}</p>

                            {comentario.link && (
                              <a
                                href={comentario.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir comentário
                              </a>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="button-primary"
              onClick={salvarHistorico}
              disabled={salvandoHistorico}
            >
              {salvandoHistorico
                ? "Salvando..."
                : "Salvar no histórico"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}