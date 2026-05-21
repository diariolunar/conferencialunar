import { useEffect, useState } from "react";

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

  function encontrarSubPorNome(nomeSub = "") {
    const nomeNormalizado = normalizarTexto(nomeSub);

    if (!nomeNormalizado) return null;

    const exato = subs.find(
      (sub) => normalizarTexto(sub.nome) === nomeNormalizado
    );

    if (exato) return exato;

    return (
      subs.find((sub) => {
        const subNormalizado = normalizarTexto(sub.nome);

        return (
          subNormalizado.includes(nomeNormalizado) ||
          nomeNormalizado.includes(subNormalizado)
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
      const obraEncontrada = encontrarObraPorTitulo(ficha.obraLida);

      let capitulosDaObra = [];
      let leituras = [];

      if (obraEncontrada) {
        capitulosDaObra = await listarCapitulosDaObra(obraEncontrada.id);

        leituras = ficha.capitulosInformados.map((capituloInformado) => {
          const capituloEncontrado = encontrarCapituloPorTexto(
            capitulosDaObra,
            capituloInformado
          );

          return montarLeitura({
            textoFicha: capituloInformado,
            obra: obraEncontrada,
            capitulo: capituloEncontrado
          });
        });
      }

      setPlano({
        ficha,
        diaSemana,
        subSelecionado: subEncontrado?.nome || ficha.sub,
        subEncontrado: Boolean(subEncontrado),
        obraSelecionadaId: obraEncontrada?.id || "",
        obraEncontrada,
        capitulosDaObra,
        leituras
      });
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao preparar conferência.");
    } finally {
      setPreparando(false);
    }
  }

  function montarLeitura({ textoFicha, obra, capitulo }) {
    return {
      textoFicha,
      obraId: obra?.id || "",
      obraTitulo: obra?.titulo || "",
      capituloId: capitulo?.id || "",
      titulo: capitulo?.titulo || textoFicha || "",
      link: capitulo?.link || "",
      palavras: Number(capitulo?.palavras || 0),
      paragrafos: Number(capitulo?.paragrafos || 0),
      ordem: capitulo?.ordem || "",
      tipo: capitulo?.tipo || "Normal",
      encontrado: Boolean(capitulo)
    };
  }

  async function alterarObraManual(obraId) {
    const obra = obras.find((item) => item.id === obraId) || null;

    if (!obra) {
      setPlano((estadoAtual) => ({
        ...estadoAtual,
        obraSelecionadaId: "",
        obraEncontrada: null,
        capitulosDaObra: [],
        leituras: []
      }));

      return;
    }

    const capitulos = await listarCapitulosDaObra(obra.id);

    setPlano((estadoAtual) => ({
      ...estadoAtual,
      obraSelecionadaId: obra.id,
      obraEncontrada: obra,
      capitulosDaObra: capitulos,
      leituras: estadoAtual.ficha.capitulosInformados.map((capituloInformado) => {
        const capituloEncontrado = encontrarCapituloPorTexto(
          capitulos,
          capituloInformado
        );

        return montarLeitura({
          textoFicha: capituloInformado,
          obra,
          capitulo: capituloEncontrado
        });
      })
    }));

    setResultadoVerificacao([]);
  }

  function alterarCapituloManual(index, capituloId) {
    setPlano((estadoAtual) => {
      const capitulos = estadoAtual.capitulosDaObra || [];
      const capitulo = capitulos.find((item) => item.id === capituloId);

      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        obraId: estadoAtual.obraEncontrada?.id || "",
        obraTitulo: estadoAtual.obraEncontrada?.titulo || "",
        capituloId: capitulo?.id || "",
        titulo: capitulo?.titulo || leituras[index].titulo,
        link: capitulo?.link || "",
        palavras: Number(capitulo?.palavras || 0),
        paragrafos: Number(capitulo?.paragrafos || 0),
        ordem: capitulo?.ordem || "",
        tipo: capitulo?.tipo || leituras[index].tipo || "Normal",
        encontrado: Boolean(capitulo)
      };

      return {
        ...estadoAtual,
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function alterarCampoLeitura(index, campo, valor) {
    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        [campo]:
          campo === "palavras" || campo === "paragrafos" || campo === "ordem"
            ? Number(valor || 0)
            : valor
      };

      return {
        ...estadoAtual,
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function adicionarCapituloManual() {
    if (!plano?.obraEncontrada) {
      setMensagem("Selecione uma obra antes de adicionar capítulo.");
      return;
    }

    setPlano((estadoAtual) => ({
      ...estadoAtual,
      leituras: [
        ...estadoAtual.leituras,
        {
          textoFicha: "Adicionado manualmente",
          obraId: estadoAtual.obraEncontrada.id,
          obraTitulo: estadoAtual.obraEncontrada.titulo,
          capituloId: "",
          titulo: "",
          link: "",
          palavras: 0,
          paragrafos: 0,
          ordem: "",
          tipo: "Normal",
          encontrado: false
        }
      ]
    }));

    setResultadoVerificacao([]);
  }

  function removerLeitura(index) {
    setPlano((estadoAtual) => ({
      ...estadoAtual,
      leituras: estadoAtual.leituras.filter((_, itemIndex) => itemIndex !== index)
    }));

    setResultadoVerificacao([]);
  }

  async function iniciarVerificacao() {
    if (!plano) return;

    if (!plano.leituras.length) {
      setMensagem("Nenhum capítulo foi preparado para verificação.");
      return;
    }

    const leituraInvalida = plano.leituras.find(
      (leitura) => !leitura.titulo || !leitura.link
    );

    if (leituraInvalida) {
      setMensagem(
        "Existe leitura sem título ou link do capítulo. Corrija antes de verificar."
      );
      return;
    }

    setVerificando(true);
    setMensagem("");

    try {
      const resultados = await verificarLeiturasPreparadas({
        leituras: plano.leituras,
        userLeitor: plano.ficha.userLeitor,
        regras
      });

      setResultadoVerificacao(resultados);
      setMensagem("Verificação concluída. Revise antes de salvar.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao verificar leituras.");
    } finally {
      setVerificando(false);
    }
  }

  function aprovarManual(index) {
    const motivo = window.prompt("Informe o motivo da aprovação manual:");

    if (!motivo?.trim()) {
      setMensagem("A aprovação manual exige motivo obrigatório.");
      return;
    }

    setResultadoVerificacao((estadoAtual) => {
      const lista = [...estadoAtual];

      lista[index] = {
        ...lista[index],
        resultado: {
          ...lista[index].resultado,
          aprovado: true,
          aprovadoManualmente: true,
          motivoAprovacaoManual: motivo.trim()
        }
      };

      return lista;
    });
  }

  function montarConferenciaParaHistorico() {
    const obraTitulo =
      plano?.obraEncontrada?.titulo ||
      resultadoVerificacao[0]?.obraTitulo ||
      plano?.ficha?.obraLida ||
      "";

    return {
      sub: plano.subSelecionado || "",
      diaSemana: plano.diaSemana,
      nomeLeitor: plano.ficha.nomeLeitor || "",
      userLeitor: plano.ficha.userLeitor || "",
      adm: plano.ficha.adm || "",
      minhaObra: plano.ficha.minhaObra,
      feedbackOferecido: plano.ficha.feedbackOferecido,
      obraId: plano.obraEncontrada?.id || "",
      obraTitulo,
      capitulos: resultadoVerificacao,
      textoFichaOriginal: plano.ficha.textoOriginal || "",
      resumo: gerarResumoConferencia({
        sub: plano.subSelecionado || "",
        diaSemana: plano.diaSemana,
        nomeLeitor: plano.ficha.nomeLeitor || "",
        userLeitor: plano.ficha.userLeitor || "",
        adm: plano.ficha.adm || "",
        obraTitulo,
        capitulos: resultadoVerificacao
      })
    };
  }

  async function salvarHistorico() {
    if (!resultadoVerificacao.length) {
      setMensagem("Verifique a leitura antes de salvar no histórico.");
      return;
    }

    setSalvandoHistorico(true);
    setMensagem("");

    try {
      const conferencia = montarConferenciaParaHistorico();

      await salvarConferenciaNoHistorico(conferencia);

      setMensagem("Conferência salva no histórico com sucesso.");
      setTextoFicha("");
      setDiaSemana("");
      setPlano(null);
      setResultadoVerificacao([]);
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao salvar no histórico.");
    } finally {
      setSalvandoHistorico(false);
    }
  }

  async function copiarResumo() {
    const conferencia = montarConferenciaParaHistorico();

    try {
      await navigator.clipboard.writeText(conferencia.resumo || "");
      setMensagem("Resumo copiado com sucesso.");
    } catch {
      setMensagem("Não foi possível copiar o resumo.");
    }
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Conferência</h2>
        <p>Cole a ficha, revise os dados e só depois inicie a verificação.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Ficha de leitura</h3>

        <form className="form-grid" onSubmit={prepararConferencia}>
          <label>
            Dia da leitura
            <select
              value={diaSemana}
              onChange={(evento) => setDiaSemana(evento.target.value)}
            >
              <option value="">Selecione o dia</option>

              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ficha preenchida
            <textarea
              rows="12"
              value={textoFicha}
              onChange={(evento) => setTextoFicha(evento.target.value)}
              placeholder="Cole aqui a ficha preenchida pelo membro..."
            />
          </label>

          <button type="submit" className="button-primary" disabled={preparando}>
            {preparando ? "Preparando..." : "Preparar conferência"}
          </button>
        </form>
      </div>

      {plano && (
        <>
          <div className="card">
            <h3>Prévia da interpretação</h3>

            <div className="interpretation-preview">
              <div>
                <span>Sub interpretado</span>
                <strong>{plano.ficha.sub || "Não identificado"}</strong>
              </div>

              <div>
                <span>Sub no banco</span>
                <strong>{plano.subEncontrado ? "Encontrado" : "Não encontrado"}</strong>
              </div>

              <div>
                <span>Leitor</span>
                <strong>{plano.ficha.nomeLeitor || "Não identificado"}</strong>
              </div>

              <div>
                <span>User</span>
                <strong>{plano.ficha.userLeitor || "Não identificado"}</strong>
              </div>

              <div>
                <span>ADM</span>
                <strong>{plano.ficha.adm || "Não identificado"}</strong>
              </div>

              <div>
                <span>Obra informada</span>
                <strong>{plano.ficha.obraLida || "Não identificada"}</strong>
              </div>

              <div>
                <span>Obra encontrada</span>
                <strong>{plano.obraEncontrada?.titulo || "Não encontrada"}</strong>
              </div>

              <div>
                <span>Capítulos na ficha</span>
                <strong>{plano.ficha.capitulosInformados.length}</strong>
              </div>

              <div>
                <span>Minha Obra</span>
                <strong>{plano.ficha.minhaObra ? "Sim" : "Não"}</strong>
              </div>

              <div>
                <span>Feedback oferecido</span>
                <strong>{plano.ficha.feedbackOferecido ? "Sim" : "Não"}</strong>
              </div>
            </div>

            {plano.ficha.avisos.length > 0 && (
              <div className="warning-list">
                {plano.ficha.avisos.map((aviso) => (
                  <p key={aviso}>⚠️ {aviso}</p>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Plano de conferência</h3>

            <div className="form-grid conference-edit-area">
              <label>
                Obra
                <select
                  value={plano.obraSelecionadaId}
                  onChange={(evento) => alterarObraManual(evento.target.value)}
                >
                  <option value="">Selecione uma obra</option>

                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.titulo}
                      {obra.autor ? ` — ${obra.autor}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="button-secondary"
                onClick={adicionarCapituloManual}
              >
                Adicionar capítulo
              </button>
            </div>

            {plano.leituras.length === 0 ? (
              <div className="empty-state">
                Nenhuma leitura preparada. Selecione uma obra e adicione capítulos.
              </div>
            ) : (
              <div className="conference-list">
                {plano.leituras.map((leitura, index) => (
                  <div className="conference-item" key={`${index}-${leitura.textoFicha}`}>
                    <div className="conference-item-header">
                      <div>
                        <span>Informado na ficha</span>
                        <strong>{leitura.textoFicha}</strong>
                      </div>

                      <button
                        type="button"
                        className="button-danger"
                        onClick={() => removerLeitura(index)}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="form-row-2">
                      <label>
                        Capítulo cadastrado
                        <select
                          value={leitura.capituloId}
                          onChange={(evento) =>
                            alterarCapituloManual(index, evento.target.value)
                          }
                        >
                          <option value="">Selecione o capítulo</option>

                          {plano.capitulosDaObra.map((capitulo) => (
                            <option key={capitulo.id} value={capitulo.id}>
                              {capitulo.titulo}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Tipo
                        <select
                          value={leitura.tipo}
                          onChange={(evento) =>
                            alterarCampoLeitura(index, "tipo", evento.target.value)
                          }
                        >
                          {TIPOS_CAPITULO.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="form-row-3">
                      <label>
                        Título exibido
                        <input
                          type="text"
                          value={leitura.titulo}
                          onChange={(evento) =>
                            alterarCampoLeitura(index, "titulo", evento.target.value)
                          }
                        />
                      </label>

                      <label>
                        Palavras
                        <input
                          type="number"
                          min="0"
                          value={leitura.palavras}
                          onChange={(evento) =>
                            alterarCampoLeitura(index, "palavras", evento.target.value)
                          }
                        />
                      </label>

                      <label>
                        Parágrafos
                        <input
                          type="number"
                          min="0"
                          value={leitura.paragrafos}
                          onChange={(evento) =>
                            alterarCampoLeitura(index, "paragrafos", evento.target.value)
                          }
                        />
                      </label>
                    </div>

                    <label>
                      Link do capítulo
                      <input
                        type="url"
                        value={leitura.link}
                        onChange={(evento) =>
                          alterarCampoLeitura(index, "link", evento.target.value)
                        }
                      />
                    </label>

                    <div className="chapter-meta-grid">
                      <div>
                        <span>Status</span>
                        <strong>{leitura.encontrado ? "Encontrado" : "Manual"}</strong>
                      </div>

                      <div>
                        <span>Ordem</span>
                        <strong>{leitura.ordem || "-"}</strong>
                      </div>

                      <div>
                        <span>Tipo</span>
                        <strong>{leitura.tipo}</strong>
                      </div>

                      <div>
                        <span>Palavras</span>
                        <strong>{leitura.palavras || 0}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="actions-row">
              <button
                type="button"
                className="button-primary"
                onClick={iniciarVerificacao}
                disabled={verificando}
              >
                {verificando ? "Verificando..." : "Iniciar verificação"}
              </button>
            </div>
          </div>
        </>
      )}

      {resultadoVerificacao.length > 0 && (
        <div className="card">
          <h3>Resultado da verificação</h3>

          <div className="conference-list">
            {resultadoVerificacao.map((resultado, index) => (
              <div
                className={`conference-item ${
                  resultado.resultado.aprovado
                    ? "result-approved"
                    : "result-rejected"
                }`}
                key={`${resultado.capituloId}-${index}`}
              >
                <div className="conference-item-header">
                  <div>
                    <span>Capítulo</span>
                    <strong>{resultado.titulo}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {resultado.resultado.aprovado ? "Aprovado" : "Reprovado"}
                    </strong>
                  </div>
                </div>

                <div className="chapter-meta-grid">
                  <div>
                    <span>Comentários</span>
                    <strong>{resultado.resultado.estatisticas.comentarios}</strong>
                  </div>

                  <div>
                    <span>Mínimo</span>
                    <strong>{resultado.resultado.estatisticas.minimoNecessario}</strong>
                  </div>

                  <div>
                    <span>Tempo estimado</span>
                    <strong>{resultado.resultado.estatisticas.tempoEstimado}min</strong>
                  </div>

                  <div>
                    <span>Tempo real</span>
                    <strong>{resultado.resultado.estatisticas.tempoReal}min</strong>
                  </div>
                </div>

                {resultado.resultado.motivos.length > 0 && (
                  <div className="warning-list">
                    {resultado.resultado.motivos.map((motivo) => (
                      <p key={motivo}>❌ {motivo}</p>
                    ))}
                  </div>
                )}

                {resultado.resultado.aprovadoManualmente && (
                  <div className="notice-card">
                    Aprovação manual: {resultado.resultado.motivoAprovacaoManual}
                  </div>
                )}

                <details className="comments-details">
                  <summary>Ver comentários encontrados</summary>

                  <div className="comments-list">
                    {resultado.resultado.comentarios.map((comentario) => (
                      <div className="comment-card" key={comentario.id}>
                        <strong>{comentario.posicao}</strong>
                        <p>{comentario.texto}</p>

                        {comentario.link && (
                          <a href={comentario.link} target="_blank" rel="noreferrer">
                            Abrir comentário
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                {!resultado.resultado.aprovado && (
                  <div className="actions-row">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => aprovarManual(index)}
                    >
                      Aprovar manualmente
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="actions-row">
            <button type="button" className="button-secondary" onClick={copiarResumo}>
              Copiar resumo
            </button>

            <button
              type="button"
              className="button-primary"
              onClick={salvarHistorico}
              disabled={salvandoHistorico}
            >
              {salvandoHistorico ? "Salvando..." : "Salvar no histórico"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
