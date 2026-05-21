import { useEffect, useMemo, useState } from "react";

import { listarHistorico } from "../services/historicoService.js";
import { listarObras } from "../services/obrasService.js";
import { listarSubs } from "../services/subsService.js";

export default function Dashboard() {
  const [historico, setHistorico] = useState([]);
  const [obras, setObras] = useState([]);
  const [subs, setSubs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  async function carregarDashboard() {
    setCarregando(true);

    try {
      const [historicoEncontrado, obrasEncontradas, subsEncontrados] =
        await Promise.all([listarHistorico(), listarObras(), listarSubs()]);

      setHistorico(historicoEncontrado);
      setObras(obrasEncontradas);
      setSubs(subsEncontrados);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar dados do dashboard.");
    } finally {
      setCarregando(false);
    }
  }

  const estatisticas = useMemo(() => {
    const aprovadas = historico.filter((item) => item.aprovado).length;
    const reprovadas = historico.filter((item) => !item.aprovado).length;

    const comentarios = historico.reduce(
      (total, item) => total + Number(item.totalComentarios || 0),
      0
    );

    const capitulos = historico.reduce(
      (total, item) => total + Number(item.totalCapitulos || 0),
      0
    );

    const membros = new Set(
      historico.map((item) => item.userLeitor || item.nomeLeitor).filter(Boolean)
    );

    return {
      conferencias: historico.length,
      aprovadas,
      reprovadas,
      comentarios,
      capitulos,
      membros: membros.size,
      obras: obras.length,
      subs: subs.length
    };
  }, [historico, obras, subs]);

  const ultimasConferencias = historico.slice(0, 5);

  useEffect(() => {
    carregarDashboard();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Início</h2>
        <p>Visão geral do sistema Lunar Conferência Wattpad.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      {carregando ? (
        <div className="card">
          <div className="empty-state">Carregando dashboard...</div>
        </div>
      ) : (
        <>
          <div className="grid-cards">
            <div className="card stat-card">
              <p>Total de conferências</p>
              <strong>{estatisticas.conferencias}</strong>
            </div>

            <div className="card stat-card">
              <p>Aprovadas</p>
              <strong>{estatisticas.aprovadas}</strong>
            </div>

            <div className="card stat-card">
              <p>Reprovadas</p>
              <strong>{estatisticas.reprovadas}</strong>
            </div>

            <div className="card stat-card">
              <p>Membros</p>
              <strong>{estatisticas.membros}</strong>
            </div>

            <div className="card stat-card">
              <p>Capítulos</p>
              <strong>{estatisticas.capitulos}</strong>
            </div>

            <div className="card stat-card">
              <p>Comentários</p>
              <strong>{estatisticas.comentarios}</strong>
            </div>

            <div className="card stat-card">
              <p>Obras cadastradas</p>
              <strong>{estatisticas.obras}</strong>
            </div>

            <div className="card stat-card">
              <p>Subs cadastrados</p>
              <strong>{estatisticas.subs}</strong>
            </div>
          </div>

          <div className="card wide-card">
            <h3>Últimas conferências</h3>

            {ultimasConferencias.length === 0 ? (
              <div className="empty-state">
                Nenhuma conferência registrada ainda.
              </div>
            ) : (
              <div className="dashboard-list">
                {ultimasConferencias.map((conferencia) => (
                  <div className="dashboard-list-item" key={conferencia.id}>
                    <div>
                      <strong>{conferencia.nomeLeitor || "Leitor não identificado"}</strong>
                      <span>
                        {conferencia.sub || "Sem sub"} •{" "}
                        {conferencia.diaSemana || "Sem dia"} •{" "}
                        {conferencia.obraTitulo || "Obra não identificada"}
                      </span>
                    </div>

                    <span
                      className={
                        conferencia.aprovado
                          ? "status-pill status-approved"
                          : "status-pill status-rejected"
                      }
                    >
                      {conferencia.aprovado ? "Aprovada" : "Reprovada"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}