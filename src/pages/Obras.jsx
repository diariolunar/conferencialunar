import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  listarObras,
  salvarOuMesclarObra
} from "../services/obrasService.js";

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [modalAberto, setModalAberto] = useState(false);

  const [formObra, setFormObra] = useState({
    titulo: "",
    autor: "",
    userAutor: "",
    link: "",
    capa: "",
    descricao: ""
  });

  const obrasOrdenadas = useMemo(() => {
    return [...obras].sort((a, b) =>
      String(a.titulo || "").localeCompare(String(b.titulo || ""))
    );
  }, [obras]);

  async function carregarObras() {
    setCarregando(true);
    setMensagem("");

    try {
      const lista = await listarObras();
      setObras(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  function abrirNovaObra() {
    setFormObra({
      titulo: "",
      autor: "",
      userAutor: "",
      link: "",
      capa: "",
      descricao: ""
    });

    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  async function salvarObraAtual(evento) {
    evento.preventDefault();

    if (!formObra.titulo.trim()) {
      setMensagem("Informe o título da obra.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const resultado = await salvarOuMesclarObra(formObra);

      if (resultado.mesclada) {
        setMensagem(
          `Obra já existente encontrada. As informações foram mescladas em "${resultado.obraExistente?.titulo}".`
        );
      } else {
        setMensagem("Obra cadastrada com sucesso.");
      }

      setModalAberto(false);
      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar obra.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando obras...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Obras</h2>
          <p>Gerencie as obras utilizadas nas conferências.</p>
        </div>

        <button type="button" className="button-primary" onClick={abrirNovaObra}>
          Nova obra
        </button>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Obras cadastradas</h3>

        {obrasOrdenadas.length === 0 ? (
          <div className="empty-state">Nenhuma obra cadastrada.</div>
        ) : (
          <div className="works-list">
            {obrasOrdenadas.map((obra) => (
              <div className="work-list-card" key={obra.id}>
                <div className="work-list-cover">
                  {obra.capa ? (
                    <img src={obra.capa} alt={obra.titulo} />
                  ) : (
                    <div className="obra-cover-placeholder">Sem capa</div>
                  )}
                </div>

                <div className="work-list-info">
                  <h3>{obra.titulo || "Sem título"}</h3>

                  <p>
                    {obra.autor || "Autor não informado"}
                    {obra.userAutor ? ` • @${obra.userAutor}` : ""}
                  </p>

                  {obra.link && <span>{obra.link}</span>}
                </div>

                <div className="work-list-actions">
                  <Link className="button-secondary" to={`/obras/${obra.id}`}>
                    Detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Nova obra</h3>

              <button type="button" onClick={fecharModal}>
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={salvarObraAtual}>
              <label>
                Título
                <input
                  type="text"
                  value={formObra.titulo}
                  onChange={(evento) =>
                    setFormObra((atual) => ({
                      ...atual,
                      titulo: evento.target.value
                    }))
                  }
                />
              </label>

              <div className="form-row-2">
                <label>
                  Autor
                  <input
                    type="text"
                    value={formObra.autor}
                    onChange={(evento) =>
                      setFormObra((atual) => ({
                        ...atual,
                        autor: evento.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  User do autor
                  <input
                    type="text"
                    value={formObra.userAutor}
                    onChange={(evento) =>
                      setFormObra((atual) => ({
                        ...atual,
                        userAutor: evento.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Link da obra
                <input
                  type="url"
                  value={formObra.link}
                  onChange={(evento) =>
                    setFormObra((atual) => ({
                      ...atual,
                      link: evento.target.value
                    }))
                  }
                />
              </label>

              <label>
                Link da capa
                <input
                  type="url"
                  value={formObra.capa}
                  onChange={(evento) =>
                    setFormObra((atual) => ({
                      ...atual,
                      capa: evento.target.value
                    }))
                  }
                />
              </label>

              <label>
                Descrição
                <textarea
                  rows="5"
                  value={formObra.descricao}
                  onChange={(evento) =>
                    setFormObra((atual) => ({
                      ...atual,
                      descricao: evento.target.value
                    }))
                  }
                />
              </label>

              <div className="actions-row">
                <button type="submit" className="button-primary" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>

                <button
                  type="button"
                  className="button-secondary"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}