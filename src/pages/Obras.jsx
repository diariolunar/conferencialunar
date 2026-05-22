import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  listarObras,
  salvarOuMesclarObra
} from "../services/obrasService.js";

import { salvarCapitulosDaObra } from "../services/capitulosService.js";
import { buscarObraWattpad } from "../services/wattpadService.js";

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modoManual, setModoManual] = useState(false);

  const [linkWattpad, setLinkWattpad] = useState("");

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
    setLinkWattpad("");
    setModoManual(false);
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

  async function importarObraPeloWattpad(evento) {
    evento.preventDefault();

    if (!linkWattpad.trim()) {
      setMensagem("Cole o link ou ID da obra do Wattpad.");
      return;
    }

    setImportando(true);
    setMensagem("");

    try {
      const obraWattpad = await buscarObraWattpad({
        linkObra: linkWattpad
      });

      const resultado = await salvarOuMesclarObra({
        titulo: obraWattpad.titulo,
        autor: obraWattpad.autor,
        userAutor: obraWattpad.userAutor,
        link: obraWattpad.link,
        capa: obraWattpad.capa,
        descricao: obraWattpad.descricao
      });

      if (obraWattpad.capitulos?.length > 0) {
        await salvarCapitulosDaObra(resultado.id, obraWattpad.capitulos);
      }

      if (resultado.mesclada) {
        setMensagem(
          `Obra já existente encontrada. Informações e capítulos foram mesclados em "${resultado.obraExistente?.titulo}".`
        );
      } else {
        setMensagem("Obra importada do Wattpad com sucesso.");
      }

      setModalAberto(false);
      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem(
        erro.message ||
          "Erro ao importar obra do Wattpad. Você pode usar o cadastro manual."
      );
    } finally {
      setImportando(false);
    }
  }

  async function salvarObraManual(evento) {
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
        setMensagem("Obra cadastrada manualmente com sucesso.");
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
          <p>Importe obras do Wattpad e gerencie os capítulos cadastrados.</p>
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
              <div>
                <h3>Nova obra</h3>
                <p>Use o link do Wattpad como cadastro principal.</p>
              </div>

              <button type="button" onClick={fecharModal}>
                ×
              </button>
            </div>

            {!modoManual ? (
              <form className="form-grid" onSubmit={importarObraPeloWattpad}>
                <label>
                  Link ou ID da obra no Wattpad
                  <input
                    type="text"
                    value={linkWattpad}
                    onChange={(evento) => setLinkWattpad(evento.target.value)}
                    placeholder="https://www.wattpad.com/story/..."
                  />
                </label>

                <div className="notice-card">
                  O sistema vai buscar título, autor, capa, descrição e capítulos
                  automaticamente.
                </div>

                <div className="actions-row">
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={importando}
                  >
                    {importando ? "Importando..." : "Importar do Wattpad"}
                  </button>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setModoManual(true)}
                  >
                    Cadastro manual
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
            ) : (
              <form className="form-grid" onSubmit={salvarObraManual}>
                <div className="notice-card">
                  Cadastro manual deve ser usado apenas quando o Wattpad falhar
                  ou quando você quiser complementar dados.
                </div>

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
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={salvando}
                  >
                    {salvando ? "Salvando..." : "Salvar manualmente"}
                  </button>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setModoManual(false)}
                  >
                    Voltar para importação
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
            )}
          </div>
        </div>
      )}
    </section>
  );
}