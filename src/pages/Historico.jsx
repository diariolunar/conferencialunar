import { useEffect, useMemo, useState } from "react";

import {
  agruparHistoricoPorSubDiaMembro,
  calcularResumoHistorico,
  excluirConferenciaDoHistorico,
  listarHistoricoConferencias,
  atualizarConferenciaNoHistorico
} from "../services/historicoService.js";

import { useDialog } from "../components/DialogProvider.jsx";
import FeedbackModal from "../components/FeedbackModal.jsx";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

const DIAS_PADRAO = ["segunda", "terça", "quarta", "quinta", "sexta"];

function normalizarDiaOrdem(dia = "") {
  return String(dia || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\bfeira\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function obterIndiceDia(dia = "") {
  const diaNormalizado = normalizarDiaOrdem(dia);
  const diasSemAcento = DIAS_PADRAO.map(normalizarDiaOrdem);

  return diasSemAcento.indexOf(diaNormalizado);
}

function ordenarDias(dias = []) {
  return [...dias].sort((a, b) => {
    const indexA = obterIndiceDia(a);
    const indexB = obterIndiceDia(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

function limparNomeMembro(membro = "") {
  return String(membro || "").split("|||")[0] || "Membro não informado";
}

function gerarResumoPorSub(sub = "", conferencias = []) {
  const capitulos = conferencias.flatMap((item) => item.capitulos || []);

  const aprovados = capitulos.filter((capitulo) => capitulo.resultado?.aprovado);
  const reprovados = capitulos.filter(
    (capitulo) => capitulo.resultado && !capitulo.resultado.aprovado
  );

  const linhas = [];

  linhas.push(`🌙 RESUMO DO SUB — ${sub}`);
  linhas.push("");
  linhas.push(`📌 Conferências: ${conferencias.length}`);
  linhas.push(`📚 Capítulos conferidos: ${capitulos.length}`);
  linhas.push(`✅ Aprovados: ${aprovados.length}`);
  linhas.push(`❌ Reprovados: ${reprovados.length}`);
  linhas.push("");

  if (aprovados.length > 0) {
    linhas.push("✅ APROVADOS:");
    aprovados.forEach((capitulo) => {
      linhas.push(`• ${capitulo.obraTitulo || "Obra"} — ${capitulo.titulo}`);
    });
    linhas.push("");
  }

  if (reprovados.length > 0) {
    linhas.push("❌ REPROVADOS:");
    reprovados.forEach((capitulo) => {
      linhas.push(`• ${capitulo.obraTitulo || "Obra"} — ${capitulo.titulo}`);
    });
    linhas.push("");
  }

  linhas.push("©️ PROJ. LUNAR");

  return linhas.join("\n");
}

export default function Historico() {
  const dialog = useDialog();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [filtroSub, setFiltroSub] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

  const [editandoId, setEditandoId] = useState("");
  const [editandoDados, setEditandoDados] = useState({
    sub: "",
    diaSemana: "",
    nomeLeitor: "",
    userLeitor: "",
    adm: ""
  });

  const historicoFiltrado = useMemo(() => {
    return historico.filter((item) => {
      const passaSub = filtroSub ? item.sub === filtroSub : true;
      const passaDia = filtroDia ? item.diaSemana === filtroDia : true;

      return passaSub && passaDia;
    });
  }, [historico, filtroSub, filtroDia]);

  const grupos = useMemo(
    () => agruparHistoricoPorSubDiaMembro(historicoFiltrado),
    [historicoFiltrado]
  );

  const resumo = useMemo(
    () => calcularResumoHistorico(historicoFiltrado),
    [historicoFiltrado]
  );

  const subsDisponiveis = useMemo(() => {
    return [...new Set(historico.map((item) => item.sub).filter(Boolean))].sort();
  }, [historico]);

  const diasDisponiveis = useMemo(() => {
    return ordenarDias([
      ...new Set(historico.map((item) => item.diaSemana).filter(Boolean))
    ]);
  }, [historico]);

  async function carregarHistorico() {
    setCarregando(true);
    setMensagem("");

    try {
      const lista = await listarHistoricoConferencias();
      setHistorico(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar histórico.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  function iniciarEdicao(conferencia) {
    setEditandoId(conferencia.id);
    setEditandoDados({
      sub: conferencia.sub || "",
      diaSemana: conferencia.diaSemana || "",
      nomeLeitor: conferencia.nomeLeitor || "",
      userLeitor: conferencia.userLeitor || "",
      adm: conferencia.adm || ""
    });
  }

  function cancelarEdicao() {
    setEditandoId("");
    setEditandoDados({
      sub: "",
      diaSemana: "",
      nomeLeitor: "",
      userLeitor: "",
      adm: ""
    });
  }

  async function salvarEdicao(conferencia) {
    try {
      const resumoAtualizado = gerarResumoConferencia({
        sub: editandoDados.sub,
        diaSemana: editandoDados.diaSemana,
        nomeLeitor: editandoDados.nomeLeitor,
        userLeitor: editandoDados.userLeitor,
        adm: editandoDados.adm,
        obraTitulo: conferencia.obraTitulo || "",
        capitulos: conferencia.capitulos || []
      });

      await atualizarConferenciaNoHistorico(conferencia.id, {
        ...editandoDados,
        resumo: resumoAtualizado
      });

      setMensagem("Conferência atualizada com sucesso.");
      cancelarEdicao();
      await carregarHistorico();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar conferência.");
    }
  }

  async function excluirConferencia(conferenciaId) {
    const confirmar = await dialog.confirm({
      title: "Excluir conferência",
      message: "Tem certeza que deseja excluir esta conferência do histórico?",
      confirmLabel: "Excluir",
      variant: "danger"
    });

    if (!confirmar) return;

    try {
      await excluirConferenciaDoHistorico(conferenciaId);
      setMensagem("Conferência excluída com sucesso.");
      await carregarHistorico();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir conferência.");
    }
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setMensagem("Texto copiado.");
    } catch {
      setMensagem("Não foi possível copiar o texto.");
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando histórico...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Histórico</h2>
          <p>Conferências salvas, organizadas por sub, dia e membro.</p>
        </div>

        <button type="button" className="button-secondary" onClick={carregarHistorico}>
          Atualizar
        </button>
      </div>

      <FeedbackModal
        mensagem={mensagem}
        carregando={carregando}
        onClose={() => setMensagem("")}
      />

      <div className="card">
        <h3>Filtros</h3>

        <div className="form-row-3">
          <label>
            Sub
            <select value={filtroSub} onChange={(evento) => setFiltroSub(evento.target.value)}>
              <option value="">Todos</option>

              {subsDisponiveis.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dia
            <select value={filtroDia} onChange={(evento) => setFiltroDia(evento.target.value)}>
              <option value="">Todos</option>

              {diasDisponiveis.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <div className="history-filter-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setFiltroSub("");
                setFiltroDia("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Resumo</h3>

        <div className="sub-stats-grid">
          <div>
            <span>Conferências</span>
            <strong>{resumo.totalConferencias}</strong>
          </div>

          <div>
            <span>Capítulos</span>
            <strong>{resumo.totalCapitulos}</strong>
          </div>

          <div>
            <span>Aprovados</span>
            <strong>{resumo.aprovados}</strong>
          </div>

          <div>
            <span>Reprovados</span>
            <strong>{resumo.reprovados}</strong>
          </div>

          <div>
            <span>Manuais</span>
            <strong>{resumo.aprovadosManualmente}</strong>
          </div>

          <div>
            <span>Comentários</span>
            <strong>{resumo.comentarios}</strong>
          </div>
        </div>
      </div>

      {historicoFiltrado.length === 0 ? (
        <div className="card">
          <div className="empty-state">Nenhuma conferência encontrada.</div>
        </div>
      ) : (
        <div className="history-days-grid">
          {Object.entries(grupos).map(([sub, dias]) => {
            const diasDoSub = ordenarDias(Object.keys(dias));
            const conferenciasDoSub = historicoFiltrado.filter(
              (item) => item.sub === sub
            );

            return (
              <div className="card" key={sub}>
                <div className="history-sub-header">
                  <div>
                    <h3>{sub}</h3>
                    <p>Conferências agrupadas por dia e membro.</p>
                  </div>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => copiarTexto(gerarResumoPorSub(sub, conferenciasDoSub))}
                  >
                    Copiar resumo do sub
                  </button>
                </div>

                {diasDoSub.map((dia) => (
                  <div className="history-day-card" key={`${sub}-${dia}`}>
                    <h4>{dia}</h4>

                    <div className="history-members-list">
                      {Object.entries(dias[dia]).map(([membro, conferencias]) => {
                        const membroLabel = limparNomeMembro(membro);

                        return (
                          <details
                            className="history-member-details"
                            key={`${sub}-${dia}-${membro}`}
                          >
                            <summary>
                              {membroLabel} — {conferencias.length} conferência(s)
                            </summary>

                            <div className="history-conference-list">
                              {conferencias.map((conferencia) => (
                                <div className="history-conference-card" key={conferencia.id}>
                                  {editandoId === conferencia.id ? (
                                    <div className="form-grid">
                                      <div className="form-row-2">
                                        <label>
                                          Sub
                                          <input
                                            type="text"
                                            value={editandoDados.sub}
                                            onChange={(evento) =>
                                              setEditandoDados((atual) => ({
                                                ...atual,
                                                sub: evento.target.value
                                              }))
                                            }
                                          />
                                        </label>

                                        <label>
                                          Dia
                                          <input
                                            type="text"
                                            value={editandoDados.diaSemana}
                                            onChange={(evento) =>
                                              setEditandoDados((atual) => ({
                                                ...atual,
                                                diaSemana: evento.target.value
                                              }))
                                            }
                                          />
                                        </label>
                                      </div>

                                      <div className="form-row-3">
                                        <label>
                                          Nome do leitor
                                          <input
                                            type="text"
                                            value={editandoDados.nomeLeitor}
                                            onChange={(evento) =>
                                              setEditandoDados((atual) => ({
                                                ...atual,
                                                nomeLeitor: evento.target.value
                                              }))
                                            }
                                          />
                                        </label>

                                        <label>
                                          User
                                          <input
                                            type="text"
                                            value={editandoDados.userLeitor}
                                            onChange={(evento) =>
                                              setEditandoDados((atual) => ({
                                                ...atual,
                                                userLeitor: evento.target.value
                                              }))
                                            }
                                          />
                                        </label>

                                        <label>
                                          ADM
                                          <input
                                            type="text"
                                            value={editandoDados.adm}
                                            onChange={(evento) =>
                                              setEditandoDados((atual) => ({
                                                ...atual,
                                                adm: evento.target.value
                                              }))
                                            }
                                          />
                                        </label>
                                      </div>

                                      <div className="actions-row">
                                        <button
                                          type="button"
                                          className="button-primary"
                                          onClick={() => salvarEdicao(conferencia)}
                                        >
                                          Salvar edição
                                        </button>

                                        <button
                                          type="button"
                                          className="button-secondary"
                                          onClick={cancelarEdicao}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="history-conference-header">
                                        <div>
                                          <span>Leitor</span>
                                          <strong>
                                            {conferencia.nomeLeitor || "Não informado"}
                                            {conferencia.userLeitor
                                              ? ` • @${conferencia.userLeitor}`
                                              : ""}
                                          </strong>
                                        </div>

                                        <div>
                                          <span>ADM</span>
                                          <strong>{conferencia.adm || "-"}</strong>
                                        </div>
                                      </div>

                                      <div className="history-chapters-list">
                                        {(conferencia.capitulos || []).map((capitulo, index) => (
                                          <div
                                            className="history-chapter-item"
                                            key={`${conferencia.id}-${capitulo.capituloId}-${index}`}
                                          >
                                            <div>
                                              <strong>
                                                {capitulo.obraTitulo
                                                  ? `${capitulo.obraTitulo} — `
                                                  : ""}
                                                {capitulo.titulo}
                                              </strong>

                                              <span>
                                                {capitulo.resultado?.estatisticas?.comentarios || 0}
                                                {" "}comentário(s) • mínimo{" "}
                                                {capitulo.resultado?.estatisticas?.minimoNecessario || 0}
                                                {" "}• I:{" "}
                                                {capitulo.resultado?.estatisticas?.distribuicao?.inicio || 0}
                                                {" "}M:{" "}
                                                {capitulo.resultado?.estatisticas?.distribuicao?.meio || 0}
                                                {" "}F:{" "}
                                                {capitulo.resultado?.estatisticas?.distribuicao?.fim || 0}
                                                {" "}G:{" "}
                                                {capitulo.resultado?.estatisticas?.distribuicao?.geral || 0}
                                              </span>
                                            </div>

                                            <span
                                              className={`status-pill ${
                                                capitulo.resultado?.aprovado
                                                  ? "status-approved"
                                                  : "status-rejected"
                                              }`}
                                            >
                                              {capitulo.resultado?.aprovado
                                                ? "Aprovado"
                                                : "Reprovado"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="actions-row">
                                        <button
                                          type="button"
                                          className="button-secondary"
                                          onClick={() => copiarTexto(conferencia.resumo || "")}
                                        >
                                          Copiar resumo
                                        </button>

                                        <button
                                          type="button"
                                          className="button-secondary"
                                          onClick={() => iniciarEdicao(conferencia)}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          className="button-danger"
                                          onClick={() => excluirConferencia(conferencia.id)}
                                        >
                                          Excluir
                                        </button>
                                      </div>

                                      {conferencia.resumo && (
                                        <details className="comments-details">
                                          <summary>Ver resumo copiado</summary>
                                          <pre className="code-preview">{conferencia.resumo}</pre>
                                        </details>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
