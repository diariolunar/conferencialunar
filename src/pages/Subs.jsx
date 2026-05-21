import { useEffect, useState } from "react";

import {
  atualizarSub,
  criarSub,
  excluirSub,
  listarSubs
} from "../services/subsService.js";

export default function Subs() {
  const [subs, setSubs] = useState([]);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function carregarSubs() {
    setCarregando(true);

    try {
      const lista = await listarSubs();
      setSubs(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar subs.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarSub(evento) {
    evento.preventDefault();

    if (!nome.trim()) {
      setMensagem("Informe o nome do sub.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      await criarSub(nome.trim());
      setNome("");
      setMensagem("Sub cadastrado com sucesso.");
      await carregarSubs();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao cadastrar sub.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlternarSub(sub) {
    try {
      await atualizarSub(sub.id, {
        ativo: !sub.ativo
      });

      await carregarSubs();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar sub.");
    }
  }

  async function handleExcluirSub(subId) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este sub?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirSub(subId);
      setMensagem("Sub excluído com sucesso.");
      await carregarSubs();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir sub.");
    }
  }

  useEffect(() => {
    carregarSubs();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Subs</h2>
        <p>Gerencie os subs usados nas conferências.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Novo sub</h3>

        <form className="form-grid" onSubmit={handleCriarSub}>
          <label>
            Nome do sub
            <input
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Ex: A-11 Sussurros Infinitos"
            />
          </label>

          <button type="submit" className="button-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar sub"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Subs cadastrados</h3>

        {carregando ? (
          <div className="empty-state">Carregando subs...</div>
        ) : subs.length === 0 ? (
          <div className="empty-state">Nenhum sub cadastrado ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sub</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.nome}</td>
                    <td>{sub.ativo ? "Ativo" : "Inativo"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => handleAlternarSub(sub)}
                        >
                          {sub.ativo ? "Desativar" : "Ativar"}
                        </button>

                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleExcluirSub(sub.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}