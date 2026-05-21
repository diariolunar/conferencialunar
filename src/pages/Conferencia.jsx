import { useEffect, useState } from "react";

import { DIAS_SEMANA } from "../utils/diasSemana.js";
import { interpretarFicha } from "../utils/interpretarFicha.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

import { listarObras } from "../services/obrasService.js";
import { listarSubs } from "../services/subsService.js";

import {
  listarCapitulosDaObra,
  encontrarCapituloPorTexto
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
      setMensagem("Erro ao carregar base.");
    }
  }

  function encontrarObraPorTitulo(tituloFicha) {
    const tituloNormalizado = normalizarTexto(tituloFicha);

    if (!tituloNormalizado) {
      return null;
    }

    const exata = obras.find(
      (obra) => normalizarTexto(obra.titulo) === tituloNormalizado
    );

    if (exata) return exata;

    const parcial = obras.find((obra) => {
      const obraNormalizada = normalizarTexto(obra.titulo);

      return (
        obraNormalizada.includes(tituloNormalizado) ||
        tituloNormalizado.includes(obraNormalizada)
      );
    });

    return parcial || null;
  }

  function encontrarSubPorNome(nomeSub) {
    const subNormalizado = normalizarTexto(nomeSub);

    if (!subNormalizado) {
      return null;
    }

    const exato = subs.find(
      (sub) => normalizarTexto(sub.nome) === subNormalizado
    );

    if (exato) return exato;

    const parcial = subs.find((sub) => {
      const nomeNormalizado = normalizarTexto(sub.nome);

      return (
        nomeNormalizado.includes(subNormalizado) ||
        subNormalizado.includes(nomeNormalizado)
      );
    });

    return parcial || null;
  }

  async function prepararConferencia(evento) {
    evento.preventDefault();

    if (!diaSemana) {
      setMensagem("Selecione obrigatoriamente o dia.");
      return;
    }

    if (!textoFicha.trim()) {
      setMensagem("Cole a ficha antes de preparar.");
      return;
    }

    setMensagem("");
    setResultadoVerificacao([]);

    try {
      const ficha = interpretarFicha(textoFicha);
      const subEncontrado = encontrarSubPorNome(ficha.sub);
      const obraEncontrada = encontrarObraPorTitulo(ficha.obraLida);

      let capitulosDaObra = [];
      let leiturasPreparadas = [];

      if (obraEncontrada) {
        capitulosDaObra = await listarCapitulosDaObra(obraEncontrada.id);

        leiturasPreparadas = ficha.capitulosInformados.map((capituloTexto) => {
          const encontrado = encontrarCapituloPorTexto(
            capitulosDaObra,
            capituloTexto
          );

          return {
            textoFicha: capituloTexto,
            obraId: obraEncontrada.id,
            obraTitulo: obraEncontrada.titulo,
            capituloId: encontrado?.id || "",
            titulo: encontrado?.titulo || capituloTexto,
            link: encontrado?.link || "",
            palavras: encontrado?.palavras || 0,
            paragrafos: encontrado?.paragrafos || 0,
            ordem: encontrado?.ordem || "",
            tipo: encontrado?.tipo || "Normal",
            encontrado: Boolean(encontrado)
          };
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
        leituras: leiturasPreparadas
      });
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao preparar conferência.");
    }
  }

  function alterarObraManual(obraId) {
    const obra = obras.find((item) => item.id === obraId);

    setPlano((estadoAtual) => ({
      ...estadoAtual,
      obraSelecionadaId: obraId,
      obraEncontrada: obra || null,
      leituras: [],
      capitulosDaObra: []
    }));

    if (obraId) {
      listarCapitulosDaObra(obraId).then((capitulos) => {
        setPlano((estadoAtual) => ({
          ...estadoAtual,
          capitulosDaObra: capitulos
        }));
      });
    }
  }

  function alterarCapituloManual(index, capituloId) {
    const capitulo = plano.capitulosDaObra.find(
      (item) => item.id === capituloId
    );

    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        obraId: estadoAtual.obraEncontrada?.id || "",
        obraTitulo: estadoAtual.obraEncontrada?.titulo || "",
        capituloId: capitulo?.id || "",
        titulo: capitulo?.titulo || leituras[index].titulo,
        link: capitulo?.link || "",
        palavras: capitulo?.palavras || 0,
        paragrafos: capitulo?.paragrafos || 0,
        ordem: capitulo?.ordem || "",
        tipo: capitulo?.tipo || leituras[index].tipo,
        encontrado: Boolean(capitulo)
      };

      return {
        ...estadoAtual,
        leituras
      };
    });
  }

  function alterarTipoCapitulo(index, tipo) {
    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        tipo
      };

      return {
        ...estadoAtual,
        leituras
      };
    });
  }

  function adicionarCapituloManual() {
    if (!plano?.obraEncontrada) {
      setMensagem("Selecione uma obra antes de adicionar capítulo manualmente.");
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
  }

  function removerLeitura(index) {
    setPlano((estadoAtual) => ({
      ...estadoAtual,
      leituras: estadoAtual.leituras.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function iniciarVerificacao() {
    if (!plano) return;

    if (!plano.leituras.length) {
      setMensagem("Nenhum capítulo foi preparado para verificação.");
      return;
    }

    const leiturasSemCapitulo = plano.leituras.some(
      (leitura) => !leitura.capituloId || !leitura.link
    );

    if (leiturasSemCapitulo) {
      setMensagem(
        "Existe leitura sem capítulo/link selecionado. Corrija antes de verificar."
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
      setMensagem("Verificação concluída. Revise o resultado antes de salvar.");
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
      setResultadoVerificacao([]);
      setPlano(null);
      setTextoFicha("");
      setDiaSemana("");
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao salvar no histórico.");
    } finally {
      setSalvandoHistorico(false);
    }
  }

  async function copiarResumo() {
    const conferencia = montarConferenciaParaHistorico();
    const resumo = gerarResumoConferencia(conferencia);

    try {
      await navigator.clipboard.writeText(resumo);
      setMensagem("Resumo copiado com sucesso.");
    } catch {
      setMensagem("Não foi possível copiar o resumo automaticamente.");
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Conferência</h2>
        <p>Prepare e confira a leitura antes de salvar.</p>
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
              rows="14"
              value={textoFicha}
              onChange={(evento) => setTextoFicha(evento.target.value)}
              placeholder="Cole aqui a ficha preenchida pelo membro..."
            />
          </label>

          <button type="submit" className="button-primary">
            Preparar conferência
          </button>
        </form>
      </div>

      {plano && (
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
              <span>Nome do leitor</span>
              <strong>{plano.ficha.nomeLeitor || "Não identificado"}</strong>
            </div>

            <div>
              <span>User do leitor</span>
              <strong>{plano.ficha.userLeitor || "Não identificado"}</strong>
            </div>

            <div>
              <span>ADM</span>
              <strong>{plano.ficha.adm || "Não identificado"}</strong>
            </div>

            <div>
              <span>Obra interpretada</span>
              <strong>{plano.ficha.obraLida || "Não identificada"}</strong>
            </div>

            <div>
              <span>Obra no banco</span>
              <strong>{plano.obraEncontrada?.titulo || "Não encontrada"}</strong>
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

          <div className="interpreted-chapters-box">
            <h4>Capítulos interpretados da ficha</h4>

            {plano.ficha.capitulosInformados.length === 0 ? (
              <p>Nenhum capítulo foi identificado automaticamente.</p>
            ) : (
              <ul>
                {plano.ficha.capitulosInformados.map((capitulo) => (
                  <li key={capitulo}>{capitulo}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {plano && (
        <div className="card">
          <h3>Plano de conferência</h3>

          <div className="conference-summary-grid">
            <div>
              <span>Dia</span>
              <strong>{plano.diaSemana}</strong>
            </div>

            <div>
              <span>Sub</span>
              <strong>
                {plano.subSelecionado || "Não identificado"}
                {!plano.subEncontrado && " ⚠️"}
              </strong>
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

          <div className="form-grid conference-edit-area">
            <label>
              Obra encontrada ou seleção manual
              <select
                value={plano.obraSelecionadaId}
                onChange={(evento) => alterarObraManual(evento.target.value)}
              >
                <option value="">Selecione uma obra</option>

                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.titulo}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="button-secondary"
              onClick={adicionarCapituloManual}
            >
              Adicionar capítulo manualmente
            </button>
          </div>

          <h3>Leituras preparadas</h3>

          {plano.leituras.length === 0 ? (
            <div className="empty-state">
              Nenhuma leitura preparada. Selecione a obra e adicione capítulos manualmente.
            </div>
          ) : (
            <div className="conference-list">
              {plano.leituras.map((leitura, index) => (
                <div className="conference-item" key={`${leitura.textoFicha}-${index}`}>
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
                      Capítulo encontrado ou seleção manual
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
                          alterarTipoCapitulo(index, evento.target.value)
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

                  <div className="chapter-meta-grid">
                    <div>
                      <span>Status</span>
                      <strong>{leitura.encontrado ? "Encontrado" : "Manual / pendente"}</strong>
                    </div>

                    <div>
                      <span>Título exibido</span>
                      <strong>{leitura.titulo || "Não selecionado"}</strong>
                    </div>

                    <div>
                      <span>Palavras</span>
                      <strong>{leitura.palavras || 0}</strong>
                    </div>

                    <div>
                      <span>Parágrafos</span>
                      <strong>{leitura.paragrafos || 0}</strong>
                    </div>

                    <div>
                      <span>Ordem interna</span>
                      <strong>{leitura.ordem || "-"}</strong>
                    </div>
                  </div>

                  {leitura.link && (
                    <a href={leitura.link} target="_blank" rel="noreferrer">
                      Abrir capítulo no Wattpad
                    </a>
                  )}
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
                    <strong>
                      {resultado.resultado.estatisticas.minimoNecessario}
                    </strong>
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
            <button
              type="button"
              className="button-secondary"
              onClick={copiarResumo}
            >
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