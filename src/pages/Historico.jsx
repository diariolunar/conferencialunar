import { useEffect, useMemo, useState } from "react";

import {
  agruparHistoricoPorSubDiaMembro,
  calcularResumoHistorico,
  listarHistoricoConferencias
} from "../services/historicoService.js";

const DIAS_PADRAO = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function ordenarDias(dias = []) {
  return [...dias].sort((a, b) => {
    const indexA = DIAS_PADRAO.indexOf(a);
    const indexB = DIAS_PADRAO.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [filtroSub, setFiltroSub] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

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

      {mensagem && <div className="notice-card">{mensagem}</div>}

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

            return (
              <div className="card" key={sub}>
                <div className="history-sub-header">
                  <div>
                    <h3>{sub}</h3>
                    <p>Conferências agrupadas por dia e membro.</p>
                  </div>
                </div>

                {diasDoSub.map((dia) => (
                  <div className="history-day-card" key={`${sub}-${dia}`}>
                    <h4>{dia}</h4>

                    <div className="history-members-list">
                      {Object.entries(dias[dia]).map(([membro, conferencias]) => (
                        <details className="history-member-details" key={`${sub}-${dia}-${membro}`}>
                          <summary>
                            {membro} — {conferencias.length} conferência(s)
                          </summary>

                          <div className="history-conference-list">
                            {conferencias.map((conferencia) => (
                              <div className="history-conference-card" key={conferencia.id}>
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

                                {conferencia.resumo && (
                                  <details className="comments-details">
                                    <summary>Ver resumo copiado</summary>
                                    <pre className="code-preview">{conferencia.resumo}</pre>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
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