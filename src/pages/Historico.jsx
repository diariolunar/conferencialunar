import { useEffect, useMemo, useState } from "react";

import {
  excluirConferencia,
  limparHistoricoGeral,
  limparHistoricoPorSub,
  listarHistorico
} from "../services/historicoService.js";

import { DIAS_SEMANA } from "../utils/diasSemana.js";

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [semanaSelecionada, setSemanaSelecionada] = useState("todas");

  async function carregarHistorico() {
    setCarregando(true);

    try {
      const lista = await listarHistorico();
      setHistorico(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar histórico.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleExcluir(conferenciaId) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta conferência?"
    );

    if (!confirmar) return;

    try {
      await excluirConferencia(conferenciaId);
      setMensagem("Conferência excluída com sucesso.");
      await carregarHistorico();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir conferência.");
    }
  }

  async function handleLimparSub(sub) {
    const confirmar = window.confirm(
      `Tem certeza que deseja limpar o histórico do sub "${sub}"?`
    );

    if (!confirmar) return;

    try {
      await limparHistoricoPorSub(sub);
      setMensagem("Histórico do sub removido.");
      await carregarHistorico();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao limpar histórico do sub.");
    }
  }

  async function handleLimparTudo() {
    const confirmar = window.confirm(
      "Tem certeza que deseja apagar TODO o histórico?"
    );

    if (!confirmar) return;

    try {
      await limparHistoricoGeral();
      setMensagem("Histórico geral removido.");
      await carregarHistorico();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao limpar histórico geral.");
    }
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto || "");
      setMensagem("Resumo copiado com sucesso.");
    } catch {
      setMensagem("Não foi possível copiar o resumo.");
    }
  }

  const semanasDisponiveis = useMemo(() => {
    const mapa = new Map();

    historico.forEach((registro) => {
      if (registro.chaveSemana) {
        mapa.set(
          registro.chaveSemana,
          registro.labelSemana || registro.chaveSemana
        );
      }
    });

    return Array.from(mapa.entries()).map(([chave, label]) => ({
      chave,
      label
    }));
  }, [historico]);

  const historicoFiltrado = useMemo(() => {
    if (semanaSelecionada === "todas") {
      return historico;
    }

    return historico.filter(
      (registro) => registro.chaveSemana === semanaSelecionada
    );
  }, [historico, semanaSelecionada]);

  const historicoAgrupado = useMemo(() => {
    const estrutura = {};

    historicoFiltrado.forEach((registro) => {
      const sub = registro.sub || "Sem sub";
      const dia = registro.diaSemana || "Sem dia";
      const membro = registro.nomeLeitor || registro.userLeitor || "Sem leitor";

      if (!estrutura[sub]) {
        estrutura[sub] = {};
      }

      DIAS_SEMANA.forEach((diaSemana) => {
        if (!estrutura[sub][diaSemana]) {
          estrutura[sub][diaSemana] = {};
        }
      });

      if (!estrutura[sub][dia]) {
        estrutura[sub][dia] = {};
      }

      if (!estrutura[sub][dia][membro]) {
        estrutura[sub][dia][membro] = [];
      }

      estrutura[sub][dia][membro].push(registro);
    });

    return estrutura;
  }, [historicoFiltrado]);

  const estatisticasGerais = useMemo(() => {
    const aprovadas = historicoFiltrado.filter(
      (registro) => registro.aprovado
    ).length;

    const reprovadas = historicoFiltrado.filter(
      (registro) => !registro.aprovado
    ).length;

    const comentarios = historicoFiltrado.reduce(
      (total, registro) => total + Number(registro.totalComentarios || 0),
      0
    );

    const capitulos = historicoFiltrado.reduce(
      (total, registro) => total + Number(registro.totalCapitulos || 0),
      0
    );

    const membrosUnicos = new Set(
      historicoFiltrado.map(
        (registro) => registro.userLeitor || registro.nomeLeitor
      )
    );

    return {
      conferencias: historicoFiltrado.length,
      aprovadas,
      reprovadas,
      comentarios,
      capitulos,
      membros: membrosUnicos.size
    };
  }, [historicoFiltrado]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Histórico</h2>
        <p>Histórico organizado por semana, sub, dia e membro.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Painel semanal</h3>

        <div className="form-row-2">
          <label>
            Semana
            <select
              value={semanaSelecionada}
              onChange={(evento) => setSemanaSelecionada(evento.target.value)}
            >
              <option value="todas">Todas as semanas</option>

              {semanasDisponiveis.map((semana) => (
                <option key={semana.chave} value={semana.chave}>
                  {semana.label}
                </option>
              ))}
            </select>
          </label>

          <div className="history-filter-actions">
            <button
              type="button"
              className="button-danger"
              onClick={handleLimparTudo}
            >
              Limpar histórico geral
            </button>
          </div>
        </div>
      </div>

      <div className="grid-cards">
        <div className="card stat-card">
          <p>Total de conferências</p>
          <strong>{estatisticasGerais.conferencias}</strong>
        </div>

        <div className="card stat-card">
          <p>Aprovadas</p>
          <strong>{estatisticasGerais.aprovadas}</strong>
        </div>

        <div className="card stat-card">
          <p>Reprovadas</p>
          <strong>{estatisticasGerais.reprovadas}</strong>
        </div>

        <div className="card stat-card">
          <p>Membros</p>
          <strong>{estatisticasGerais.membros}</strong>
        </div>

        <div className="card stat-card">
          <p>Capítulos</p>
          <strong>{estatisticasGerais.capitulos}</strong>
        </div>

        <div className="card stat-card">
          <p>Comentários</p>
          <strong>{estatisticasGerais.comentarios}</strong>
        </div>
      </div>

      {carregando ? (
        <div className="card">
          <div className="empty-state">Carregando histórico...</div>
        </div>
      ) : historicoFiltrado.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            Nenhuma conferência encontrada para este filtro.
          </div>
        </div>
      ) : (
        Object.entries(historicoAgrupado).map(([sub, dias]) => {
          const registrosDoSub = historicoFiltrado.filter(
            (registro) => registro.sub === sub
          );

          const aprovadasSub = registrosDoSub.filter(
            (registro) => registro.aprovado
          ).length;

          const reprovadasSub = registrosDoSub.filter(
            (registro) => !registro.aprovado
          ).length;

          const comentariosSub = registrosDoSub.reduce(
            (total, registro) => total + Number(registro.totalComentarios || 0),
            0
          );

          const capitulosSub = registrosDoSub.reduce(
            (total, registro) => total + Number(registro.totalCapitulos || 0),
            0
          );

          const membrosSub = new Set(
            registrosDoSub.map(
              (registro) => registro.userLeitor || registro.nomeLeitor
            )
          );

          return (
            <div className="card" key={sub}>
              <div className="history-sub-header">
                <div>
                  <h3>{sub}</h3>

                  <div className="sub-stats-grid">
                    <div>
                      <span>Conferências</span>
                      <strong>{registrosDoSub.length}</strong>
                    </div>

                    <div>
                      <span>Membros</span>
                      <strong>{membrosSub.size}</strong>
                    </div>

                    <div>
                      <span>Aprovadas</span>
                      <strong>{aprovadasSub}</strong>
                    </div>

                    <div>
                      <span>Reprovadas</span>
                      <strong>{reprovadasSub}</strong>
                    </div>

                    <div>
                      <span>Capítulos</span>
                      <strong>{capitulosSub}</strong>
                    </div>

                    <div>
                      <span>Comentários</span>
                      <strong>{comentariosSub}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="button-danger"
                  onClick={() => handleLimparSub(sub)}
                >
                  Limpar sub
                </button>
              </div>

              <div className="history-days-grid">
                {DIAS_SEMANA.map((dia) => {
                  const membros = dias[dia] || {};
                  const temMembros = Object.keys(membros).length > 0;

                  return (
                    <div className="history-day-card" key={dia}>
                      <h4>{dia}</h4>

                      {!temMembros ? (
                        <div className="empty-state">
                          Nenhuma conferência neste dia.
                        </div>
                      ) : (
                        <div className="history-members-list">
                          {Object.entries(membros).map(
                            ([membro, conferencias]) => (
                              <details
                                key={membro}
                                className="history-member-details"
                              >
                                <summary>{membro}</summary>

                                <div className="history-conference-list">
                                  {conferencias.map((conferencia) => (
                                    <div
                                      className="history-conference-card"
                                      key={conferencia.id}
                                    >
                                      <div className="history-conference-header">
                                        <div>
                                          <span>Obra</span>
                                          <strong>
                                            {conferencia.obraTitulo}
                                          </strong>
                                        </div>

                                        <div>
                                          <span>Status</span>
                                          <strong>
                                            {conferencia.aprovado
                                              ? "Aprovado"
                                              : "Reprovado"}
                                          </strong>
                                        </div>
                                      </div>

                                      <div className="history-chapters-list">
                                        {(conferencia.capitulos || []).map(
                                          (capitulo, index) => (
                                            <div
                                              key={`${capitulo.titulo}-${index}`}
                                              className="history-chapter-item"
                                            >
                                              <strong>{capitulo.titulo}</strong>

                                              <span>
                                                {
                                                  capitulo.resultado
                                                    ?.estatisticas?.comentarios
                                                }{" "}
                                                comentários
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>

                                      <div className="actions-row">
                                        <button
                                          type="button"
                                          className="button-secondary"
                                          onClick={() =>
                                            copiarTexto(conferencia.resumo || "")
                                          }
                                        >
                                          Copiar resumo
                                        </button>

                                        <button
                                          type="button"
                                          className="button-danger"
                                          onClick={() =>
                                            handleExcluir(conferencia.id)
                                          }
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}