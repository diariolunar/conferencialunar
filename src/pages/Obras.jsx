import { useEffect, useMemo, useState } from "react";

import {
  atualizarObra,
  listarObras,
  salvarOuMesclarObra
} from "../services/obrasService.js";

import {
  atualizarCapituloDaObra,
  excluirCapitulo,
  listarCapitulosDaObra,
  salvarCapituloDaObra,
  salvarCapitulosDaObra
} from "../services/capitulosService.js";

const TIPOS_CAPITULO = ["Normal", "Especial", "Poesia"];

function separarCapitulosEmLote(texto = "") {
  return String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => {
      const partes = linha.split("|").map((parte) => parte.trim());

      return {
        titulo: partes[0] || `Capítulo ${index + 1}`,
        link: partes[1] || "",
        tipo: partes[2] || "Normal",
        ordem: index + 1
      };
    });
}

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [capitulos, setCapitulos] = useState([]);

  const [modalObraAberto, setModalObraAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [formObra, setFormObra] = useState({
    titulo: "",
    autor: "",
    userAutor: "",
    link: "",
    capa: "",
    descricao: ""
  });

  const [formCapitulo, setFormCapitulo] = useState({
    titulo: "",
    link: "",
    tipo: "Normal",
    ordem: ""
  });

  const [capitulosEmLote, setCapitulosEmLote] = useState("");

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

  async function carregarCapitulos(obra) {
    if (!obra?.id) return;

    try {
      const lista = await listarCapitulosDaObra(obra.id);
      setCapitulos(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar capítulos da obra.");
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  async function selecionarObra(obra) {
    setObraSelecionada(obra);
    setFormObra({
      titulo: obra.titulo || "",
      autor: obra.autor || "",
      userAutor: obra.userAutor || "",
      link: obra.link || "",
      capa: obra.capa || "",
      descricao: obra.descricao || ""
    });

    await carregarCapitulos(obra);
  }

  function abrirNovaObra() {
    setObraSelecionada(null);
    setCapitulos([]);
    setFormObra({
      titulo: "",
      autor: "",
      userAutor: "",
      link: "",
      capa: "",
      descricao: ""
    });
    setModalObraAberto(true);
  }

  function abrirEdicaoObra() {
    if (!obraSelecionada) return;
    setModalObraAberto(true);
  }

  function fecharModalObra() {
    setModalObraAberto(false);
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
      if (obraSelecionada?.id) {
        await atualizarObra(obraSelecionada.id, formObra);

        const obraAtualizada = {
          ...obraSelecionada,
          ...formObra
        };

        setObraSelecionada(obraAtualizada);
        setMensagem("Obra atualizada com sucesso.");
      } else {
        const resultado = await salvarOuMesclarObra(formObra);

        if (resultado.mesclada) {
          setMensagem(
            `Obra já existente encontrada. As informações foram mescladas em "${resultado.obraExistente?.titulo}".`
          );
        } else {
          setMensagem("Obra cadastrada com sucesso.");
        }

        const lista = await listarObras();
        setObras(lista);

        const novaSelecionada = lista.find((obra) => obra.id === resultado.id);

        if (novaSelecionada) {
          await selecionarObra(novaSelecionada);
        }
      }

      setModalObraAberto(false);
      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar obra.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCapituloIndividual(evento) {
    evento.preventDefault();

    if (!obraSelecionada?.id) {
      setMensagem("Selecione uma obra antes de cadastrar capítulo.");
      return;
    }

    if (!formCapitulo.titulo.trim()) {
      setMensagem("Informe o título do capítulo.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      await salvarCapituloDaObra(obraSelecionada.id, {
        titulo: formCapitulo.titulo,
        link: formCapitulo.link,
        tipo: formCapitulo.tipo || "Normal",
        ordem: Number(formCapitulo.ordem || capitulos.length + 1)
      });

      setFormCapitulo({
        titulo: "",
        link: "",
        tipo: "Normal",
        ordem: ""
      });

      await carregarCapitulos(obraSelecionada);
      setMensagem("Capítulo salvo com sucesso.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar capítulo.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCapitulosEmLote(evento) {
    evento.preventDefault();

    if (!obraSelecionada?.id) {
      setMensagem("Selecione uma obra antes de cadastrar capítulos.");
      return;
    }

    const capitulosNovos = separarCapitulosEmLote(capitulosEmLote);

    if (capitulosNovos.length === 0) {
      setMensagem("Cole ao menos um capítulo no cadastro em lote.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const ordemInicial = capitulos.length + 1;

      await salvarCapitulosDaObra(
        obraSelecionada.id,
        capitulosNovos.map((capitulo, index) => ({
          ...capitulo,
          ordem: ordemInicial + index,
          tipo: TIPOS_CAPITULO.includes(capitulo.tipo)
            ? capitulo.tipo
            : "Normal"
        }))
      );

      setCapitulosEmLote("");
      await carregarCapitulos(obraSelecionada);

      setMensagem(`${capitulosNovos.length} capítulo(s) cadastrado(s).`);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar capítulos em lote.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarTipoCapitulo(capitulo, tipo) {
    if (!obraSelecionada?.id || !capitulo?.id) return;

    try {
      await atualizarCapituloDaObra(obraSelecionada.id, capitulo.id, {
        tipo
      });

      await carregarCapitulos(obraSelecionada);
      setMensagem("Tipo do capítulo atualizado.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar tipo do capítulo.");
    }
  }

  async function removerCapitulo(capitulo) {
    if (!obraSelecionada?.id || !capitulo?.id) return;

    const confirmar = window.confirm(
      `Deseja excluir o capítulo "${capitulo.titulo}"?`
    );

    if (!confirmar) return;

    try {
      await excluirCapitulo(obraSelecionada.id, capitulo.id);
      await carregarCapitulos(obraSelecionada);
      setMensagem("Capítulo excluído.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir capítulo.");
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
          <p>Cadastre obras, capítulos e tipos usados na conferência.</p>
        </div>

        <button type="button" className="button-primary" onClick={abrirNovaObra}>
          Nova obra
        </button>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="works-layout">
        <div className="card">
          <h3>Obras cadastradas</h3>

          {obrasOrdenadas.length === 0 ? (
            <div className="empty-state">Nenhuma obra cadastrada.</div>
          ) : (
            <div className="works-list">
              {obrasOrdenadas.map((obra) => (
                <button
                  type="button"
                  className={`work-list-item ${
                    obraSelecionada?.id === obra.id ? "work-list-item-active" : ""
                  }`}
                  key={obra.id}
                  onClick={() => selecionarObra(obra)}
                >
                  <div className="work-list-cover">
                    {obra.capa ? (
                      <img src={obra.capa} alt={obra.titulo} />
                    ) : (
                      <span>Sem capa</span>
                    )}
                  </div>

                  <div>
                    <strong>{obra.titulo || "Sem título"}</strong>
                    <span>
                      {obra.autor || "Autor não informado"}
                      {obra.userAutor ? ` • @${obra.userAutor}` : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          {!obraSelecionada ? (
            <div className="empty-state">
              Selecione uma obra para ver detalhes e capítulos.
            </div>
          ) : (
            <>
              <div className="work-details-header">
                <div className="work-details-cover">
                  {obraSelecionada.capa ? (
                    <img src={obraSelecionada.capa} alt={obraSelecionada.titulo} />
                  ) : (
                    <span>Sem capa</span>
                  )}
                </div>

                <div>
                  <h3>{obraSelecionada.titulo}</h3>
                  <p>
                    {obraSelecionada.autor || "Autor não informado"}
                    {obraSelecionada.userAutor
                      ? ` • @${obraSelecionada.userAutor}`
                      : ""}
                  </p>

                  {obraSelecionada.link && (
                    <a
                      href={obraSelecionada.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir no Wattpad
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  className="button-secondary"
                  onClick={abrirEdicaoObra}
                >
                  Editar obra
                </button>
              </div>

              {obraSelecionada.descricao && (
                <p className="work-description">{obraSelecionada.descricao}</p>
              )}

              <div className="section-divider" />

              <h3>Adicionar capítulo</h3>

              <form className="form-grid" onSubmit={salvarCapituloIndividual}>
                <div className="form-row-3">
                  <label>
                    Título
                    <input
                      type="text"
                      value={formCapitulo.titulo}
                      onChange={(evento) =>
                        setFormCapitulo((atual) => ({
                          ...atual,
                          titulo: evento.target.value
                        }))
                      }
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      value={formCapitulo.tipo}
                      onChange={(evento) =>
                        setFormCapitulo((atual) => ({
                          ...atual,
                          tipo: evento.target.value
                        }))
                      }
                    >
                      {TIPOS_CAPITULO.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Ordem
                    <input
                      type="number"
                      min="1"
                      value={formCapitulo.ordem}
                      onChange={(evento) =>
                        setFormCapitulo((atual) => ({
                          ...atual,
                          ordem: evento.target.value
                        }))
                      }
                      placeholder={String(capitulos.length + 1)}
                    />
                  </label>
                </div>

                <label>
                  Link do capítulo
                  <input
                    type="url"
                    value={formCapitulo.link}
                    onChange={(evento) =>
                      setFormCapitulo((atual) => ({
                        ...atual,
                        link: evento.target.value
                      }))
                    }
                  />
                </label>

                <button type="submit" className="button-primary" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar capítulo"}
                </button>
              </form>

              <div className="section-divider" />

              <h3>Adicionar vários capítulos</h3>

              <form className="form-grid" onSubmit={salvarCapitulosEmLote}>
                <label>
                  Capítulos em lote
                  <textarea
                    rows="8"
                    value={capitulosEmLote}
                    onChange={(evento) => setCapitulosEmLote(evento.target.value)}
                    placeholder={
                      "Um por linha:\nCapítulo 1 | https://link | Normal\nEspecial do Lobo | https://link | Especial"
                    }
                  />
                </label>

                <button type="submit" className="button-primary" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar capítulos em lote"}
                </button>
              </form>

              <div className="section-divider" />

              <h3>Capítulos cadastrados</h3>

              {capitulos.length === 0 ? (
                <div className="empty-state">Nenhum capítulo cadastrado.</div>
              ) : (
                <div className="chapter-list">
                  {capitulos.map((capitulo) => (
                    <div className="chapter-list-item" key={capitulo.id}>
                      <div>
                        <strong>
                          {capitulo.ordem ? `${capitulo.ordem}. ` : ""}
                          {capitulo.titulo}
                        </strong>

                        <span>
                          {capitulo.palavras || 0} palavra(s) •{" "}
                          {capitulo.paragrafos || 0} parágrafo(s)
                        </span>
                      </div>

                      <div className="chapter-list-actions">
                        <select
                          value={capitulo.tipo || "Normal"}
                          onChange={(evento) =>
                            alterarTipoCapitulo(capitulo, evento.target.value)
                          }
                        >
                          {TIPOS_CAPITULO.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>

                        {capitulo.link && (
                          <a
                            href={capitulo.link}
                            target="_blank"
                            rel="noreferrer"
                            className="button-secondary"
                          >
                            Abrir
                          </a>
                        )}

                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => removerCapitulo(capitulo)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalObraAberto && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{obraSelecionada ? "Editar obra" : "Nova obra"}</h3>

              <button type="button" onClick={fecharModalObra}>
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
                  onClick={fecharModalObra}
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