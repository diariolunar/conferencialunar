import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  excluirObra,
  importarObraDoWattpad,
  listarObras,
  salvarObra
} from "../services/obrasService.js";

import { salvarCapitulosDaObra } from "../services/capitulosService.js";

export default function Obras() {
  const [obras, setObras] = useState([]);

  const [linkImportacao, setLinkImportacao] = useState("");

  const [importando, setImportando] = useState(false);

  const [previewImportacao, setPreviewImportacao] = useState(null);

  const [mensagem, setMensagem] = useState("");

  async function carregarObras() {
    try {
      const lista = await listarObras();
      setObras(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras.");
    }
  }

  async function prepararImportacao(evento) {
    evento.preventDefault();

    if (!linkImportacao.trim()) {
      setMensagem("Cole o link da obra do Wattpad.");
      return;
    }

    setImportando(true);
    setMensagem("");
    setPreviewImportacao(null);

    try {
      const dados = await importarObraDoWattpad(linkImportacao);

      setPreviewImportacao(dados);

      if (dados.aviso) {
        setMensagem(dados.aviso);
      } else {
        setMensagem("Importação preparada com sucesso.");
      }
    } catch (erro) {
      console.error(erro);
      setMensagem(
        erro.message || "Erro ao importar obra do Wattpad."
      );
    } finally {
      setImportando(false);
    }
  }

  async function salvarImportacao() {
    if (!previewImportacao?.obra) {
      return;
    }

    try {
      setImportando(true);

      const obraId = await salvarObra(previewImportacao.obra);

      if (previewImportacao.capitulos?.length) {
        await salvarCapitulosDaObra(
          obraId,
          previewImportacao.capitulos
        );
      }

      setMensagem("Obra salva com sucesso.");

      setPreviewImportacao(null);
      setLinkImportacao("");

      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar obra.");
    } finally {
      setImportando(false);
    }
  }

  async function handleExcluir(obraId) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta obra?"
    );

    if (!confirmar) return;

    try {
      await excluirObra(obraId);

      setMensagem("Obra removida.");

      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir obra.");
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Obras</h2>
        <p>
          Importe obras do Wattpad e gerencie capítulos para conferência.
        </p>
      </div>

      {mensagem && (
        <div className="notice-card">
          {mensagem}
        </div>
      )}

      <div className="card">
        <h3>Importar obra do Wattpad</h3>

        <form className="form-grid" onSubmit={prepararImportacao}>
          <label>
            Link da obra
            <input
              type="text"
              value={linkImportacao}
              onChange={(evento) =>
                setLinkImportacao(evento.target.value)
              }
              placeholder="https://www.wattpad.com/story/123456"
            />
          </label>

          <button
            type="submit"
            className="button-primary"
            disabled={importando}
          >
            {importando
              ? "Importando..."
              : "Preparar importação"}
          </button>
        </form>
      </div>

      {previewImportacao && (
        <div className="card">
          <h3>Prévia da importação</h3>

          <div className="obra-header-card">
            {previewImportacao.obra.capa ? (
              <img
                src={previewImportacao.obra.capa}
                alt={previewImportacao.obra.titulo}
              />
            ) : (
              <div className="obra-cover-placeholder">
                Sem capa
              </div>
            )}

            <div>
              <h3>
                {previewImportacao.obra.titulo}
              </h3>

              {previewImportacao.obra.link && (
                <a
                  href={previewImportacao.obra.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir obra no Wattpad
                </a>
              )}

              <p>
                {previewImportacao.obra.descricao ||
                  "Sem descrição encontrada."}
              </p>
            </div>
          </div>

          <div className="conference-summary-grid">
            <div>
              <span>Capítulos encontrados</span>
              <strong>
                {previewImportacao.totalCapitulos}
              </strong>
            </div>

            <div>
              <span>Fonte</span>
              <strong>
                {previewImportacao.fonte}
              </strong>
            </div>

            <div>
              <span>Wattpad ID</span>
              <strong>
                {previewImportacao.obra.wattpadId}
              </strong>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Título</th>
                  <th>Palavras</th>
                  <th>Parágrafos</th>
                </tr>
              </thead>

              <tbody>
                {previewImportacao.capitulos.map(
                  (capitulo) => (
                    <tr
                      key={`${capitulo.ordem}-${capitulo.titulo}`}
                    >
                      <td>{capitulo.ordem}</td>

                      <td>
                        {capitulo.link ? (
                          <a
                            href={capitulo.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {capitulo.titulo}
                          </a>
                        ) : (
                          capitulo.titulo
                        )}
                      </td>

                      <td>{capitulo.palavras}</td>

                      <td>{capitulo.paragrafos}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="button-primary"
              onClick={salvarImportacao}
              disabled={importando}
            >
              Salvar obra no sistema
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Obras cadastradas</h3>

        {obras.length === 0 ? (
          <div className="empty-state">
            Nenhuma obra cadastrada.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Wattpad ID</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id}>
                    <td>{obra.titulo}</td>

                    <td>{obra.wattpadId || "-"}</td>

                    <td>
                      <div className="table-actions">
                        <Link
                          className="button-secondary"
                          to={`/obras/${obra.id}`}
                        >
                          Detalhes
                        </Link>

                        <button
                          type="button"
                          className="button-danger"
                          onClick={() =>
                            handleExcluir(obra.id)
                          }
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