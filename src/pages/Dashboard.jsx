import { useEffect, useMemo, useState } from "react";

import {
  calcularDashboardHistorico,
  listarHistoricoConferencias
} from "../services/historicoService.js";

const DIAS_ORDEM = ["segunda", "terça", "quarta", "quinta", "sexta"];

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
  const diasSemAcento = DIAS_ORDEM.map(normalizarDiaOrdem);

  return diasSemAcento.indexOf(diaNormalizado);
}

function ordenarPorDia(lista = []) {
  return [...lista].sort(([diaA], [diaB]) => {
    const indexA = obterIndiceDia(diaA);
    const indexB = obterIndiceDia(diaB);

    if (indexA === -1 && indexB === -1) return diaA.localeCompare(diaB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

export default function Dashboard() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const dashboard = useMemo(
    () => calcularDashboardHistorico(historico),
    [historico]
  );

  async function carregarDashboard() {
    setCarregando(true);
    setMensagem("");

    try {
      const lista = await listarHistoricoConferencias();
      setHistorico(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar dashboard.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando dashboard...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Dashboard</h2>
          <p>Visão geral das conferências, subs, leitores e obras.</p>
        </div>

        <button type="button" className="button-secondary" onClick={carregarDashboard}>
          Atualizar
        </button>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Resumo geral</h3>

        <div className="sub-stats-grid">
          <div>
            <span>Conferências</span>
            <strong>{dashboard.totalConferencias}</strong>
          </div>

          <div>
            <span>Capítulos</span>
            <strong>{dashboard.totalCapitulos}</strong>
          </div>

          <div>
            <span>Aprovados</span>
            <strong>{dashboard.aprovados}</strong>
          </div>

          <div>
            <span>Reprovados</span>
            <strong>{dashboard.reprovados}</strong>
          </div>

          <div>
            <span>Comentários válidos</span>
            <strong>{dashboard.comentarios}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Por dia</h3>

          {Object.keys(dashboard.porDia || {}).length === 0 ? (
            <div className="empty-state">Nenhum dado por dia.</div>
          ) : (
            <div className="dashboard-list">
              {ordenarPorDia(Object.entries(dashboard.porDia)).map(
                ([dia, dados]) => (
                  <div className="dashboard-list-item" key={dia}>
                    <div>
                      <strong>{dia}</strong>
                      <span>
                        {dados.total} capítulo(s) • {dados.comentarios} comentário(s)
                      </span>
                    </div>

                    <div>
                      ✅ {dados.aprovados} / ❌ {dados.reprovados}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Por sub</h3>

          {Object.keys(dashboard.porSub || {}).length === 0 ? (
            <div className="empty-state">Nenhum dado por sub.</div>
          ) : (
            <div className="dashboard-list">
              {Object.entries(dashboard.porSub)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([sub, dados]) => (
                  <div className="dashboard-list-item" key={sub}>
                    <div>
                      <strong>{sub}</strong>
                      <span>
                        {dados.total} capítulo(s) • {dados.comentarios} comentário(s)
                      </span>
                    </div>

                    <div>
                      ✅ {dados.aprovados} / ❌ {dados.reprovados}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Ranking de membros</h3>

          {dashboard.rankingMembros.length === 0 ? (
            <div className="empty-state">Nenhum membro ranqueado.</div>
          ) : (
            <div className="dashboard-list">
              {dashboard.rankingMembros.slice(0, 15).map((membro, index) => (
                <div className="dashboard-list-item" key={membro.nome}>
                  <div>
                    <strong>
                      #{index + 1} {membro.nome}
                    </strong>
                    <span>
                      {membro.total} capítulo(s) • {membro.comentarios} comentário(s)
                    </span>
                  </div>

                  <div>
                    ✅ {membro.aprovados} / ❌ {membro.reprovados}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Obras mais lidas</h3>

          {dashboard.rankingObras.length === 0 ? (
            <div className="empty-state">Nenhuma obra ranqueada.</div>
          ) : (
            <div className="dashboard-list">
              {dashboard.rankingObras.slice(0, 15).map((obra, index) => (
                <div className="dashboard-list-item" key={obra.nome}>
                  <div>
                    <strong>
                      #{index + 1} {obra.nome}
                    </strong>
                    <span>
                      {obra.total} capítulo(s) • {obra.comentarios} comentário(s)
                    </span>
                  </div>

                  <div>
                    ✅ {obra.aprovados} / ❌ {obra.reprovados}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
