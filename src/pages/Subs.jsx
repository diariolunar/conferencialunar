import { useEffect, useMemo, useState } from "react";

import {
  listarSubs,
  salvarOuAtualizarSub
} from "../services/subsService.js";

export default function Subs() {
  const [subs, setSubs] = useState([]);
  const [subSelecionado, setSubSelecionado] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [modalAberto, setModalAberto] = useState(false);

  const [formSub, setFormSub] = useState({
    id: "",
    nome: "",
    codigo: "",
    adm: "",
    imagemPerfil: "",
    corPrimaria: "#6B21A8",
    corSecundaria: "#3B0764",
    corDestaque: "#F5C842",
    identidadeVisual: "",
    descricao: "",
    regras: ""
  });

  const subsOrdenados = useMemo(() => {
    return [...subs].sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""))
    );
  }, [subs]);

  async function carregarSubs() {
    setCarregando(true);
    setMensagem("");

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

  useEffect(() => {
    carregarSubs();
  }, []);

  function selecionarSub(sub) {
    setSubSelecionado(sub);
  }

  function abrirNovoSub() {
    setFormSub({
      id: "",
      nome: "",
      codigo: "",
      adm: "",
      imagemPerfil: "",
      corPrimaria: "#6B21A8",
      corSecundaria: "#3B0764",
      corDestaque: "#F5C842",
      identidadeVisual: "",
      descricao: "",
      regras: ""
    });

    setModalAberto(true);
  }

  function abrirEditarSub(sub) {
    setFormSub({
      id: sub.id || "",
      nome: sub.nome || "",
      codigo: sub.codigo || "",
      adm: sub.adm || "",
      imagemPerfil: sub.imagemPerfil || "",
      corPrimaria: sub.corPrimaria || "#6B21A8",
      corSecundaria: sub.corSecundaria || "#3B0764",
      corDestaque: sub.corDestaque || "#F5C842",
      identidadeVisual: sub.identidadeVisual || "",
      descricao: sub.descricao || "",
      regras: sub.regras || ""
    });

    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  async function salvarSubAtual(evento) {
    evento.preventDefault();

    if (!formSub.nome.trim()) {
      setMensagem("Informe o nome do sub.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const id = await salvarOuAtualizarSub(formSub);

      const lista = await listarSubs();

      setSubs(lista);

      const atualizado = lista.find((item) => item.id === id);

      if (atualizado) {
        setSubSelecionado(atualizado);
      }

      setMensagem(
        formSub.id
          ? "Sub atualizado com sucesso."
          : "Sub criado com sucesso."
      );

      setModalAberto(false);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar sub.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando subs...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Subs</h2>
          <p>Gerencie identidade visual, ADM e informações dos subs.</p>
        </div>

        <button
          type="button"
          className="button-primary"
          onClick={abrirNovoSub}
        >
          Novo sub
        </button>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="works-layout">
        <div className="card">
          <h3>Subs cadastrados</h3>

          {subsOrdenados.length === 0 ? (
            <div className="empty-state">Nenhum sub cadastrado.</div>
          ) : (
            <div className="works-list">
              {subsOrdenados.map((sub) => (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => selecionarSub(sub)}
                  className={`work-list-item ${
                    subSelecionado?.id === sub.id
                      ? "work-list-item-active"
                      : ""
                  }`}
                >
                  <div className="work-list-cover">
                    {sub.imagemPerfil ? (
                      <img src={sub.imagemPerfil} alt={sub.nome} />
                    ) : (
                      <span>Sem imagem</span>
                    )}
                  </div>

                  <div>
                    <strong>{sub.nome}</strong>

                    <span>
                      {sub.codigo || "Sem código"}
                      {sub.adm ? ` • ADM ${sub.adm}` : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          {!subSelecionado ? (
            <div className="empty-state">
              Selecione um sub para visualizar informações.
            </div>
          ) : (
            <>
              <div
                className="sub-hero-card"
                style={{
                  background: `linear-gradient(135deg, ${
                    subSelecionado.corPrimaria || "#6B21A8"
                  }, ${
                    subSelecionado.corSecundaria || "#3B0764"
                  })`
                }}
              >
                <div className="sub-hero-image">
                  {subSelecionado.imagemPerfil ? (
                    <img
                      src={subSelecionado.imagemPerfil}
                      alt={subSelecionado.nome}
                    />
                  ) : (
                    <span>Sem imagem</span>
                  )}
                </div>

                <div className="sub-hero-content">
                  <h3>{subSelecionado.nome}</h3>

                  <p>
                    {subSelecionado.codigo || "Sem código"}
                    {subSelecionado.adm
                      ? ` • ADM ${subSelecionado.adm}`
                      : ""}
                  </p>

                  {subSelecionado.identidadeVisual && (
                    <div className="sub-identity-box">
                      {subSelecionado.identidadeVisual}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => abrirEditarSub(subSelecionado)}
                >
                  Editar sub
                </button>
              </div>

              <div className="section-divider" />

              <div className="sub-color-preview">
                <div>
                  <span>Primária</span>

                  <div
                    className="color-preview"
                    style={{
                      background: subSelecionado.corPrimaria
                    }}
                  />
                </div>

                <div>
                  <span>Secundária</span>

                  <div
                    className="color-preview"
                    style={{
                      background: subSelecionado.corSecundaria
                    }}
                  />
                </div>

                <div>
                  <span>Destaque</span>

                  <div
                    className="color-preview"
                    style={{
                      background: subSelecionado.corDestaque
                    }}
                  />
                </div>
              </div>

              <div className="section-divider" />

              <div className="sub-info-grid">
                <div className="card">
                  <h3>Descrição</h3>

                  {subSelecionado.descricao ? (
                    <p>{subSelecionado.descricao}</p>
                  ) : (
                    <div className="empty-state">
                      Nenhuma descrição cadastrada.
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3>Regras</h3>

                  {subSelecionado.regras ? (
                    <pre className="code-preview">
                      {subSelecionado.regras}
                    </pre>
                  ) : (
                    <div className="empty-state">
                      Nenhuma regra cadastrada.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                {formSub.id ? "Editar sub" : "Novo sub"}
              </h3>

              <button type="button" onClick={fecharModal}>
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={salvarSubAtual}>
              <div className="form-row-2">
                <label>
                  Nome do sub
                  <input
                    type="text"
                    value={formSub.nome}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        nome: evento.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Código
                  <input
                    type="text"
                    value={formSub.codigo}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        codigo: evento.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <div className="form-row-2">
                <label>
                  ADM
                  <input
                    type="text"
                    value={formSub.adm}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        adm: evento.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Link da imagem
                  <input
                    type="url"
                    value={formSub.imagemPerfil}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        imagemPerfil: evento.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <div className="form-row-3">
                <label>
                  Cor primária
                  <input
                    type="color"
                    value={formSub.corPrimaria}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        corPrimaria: evento.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Cor secundária
                  <input
                    type="color"
                    value={formSub.corSecundaria}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        corSecundaria: evento.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Cor destaque
                  <input
                    type="color"
                    value={formSub.corDestaque}
                    onChange={(evento) =>
                      setFormSub((atual) => ({
                        ...atual,
                        corDestaque: evento.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Identidade visual
                <textarea
                  rows="3"
                  value={formSub.identidadeVisual}
                  onChange={(evento) =>
                    setFormSub((atual) => ({
                      ...atual,
                      identidadeVisual: evento.target.value
                    }))
                  }
                />
              </label>

              <label>
                Descrição
                <textarea
                  rows="5"
                  value={formSub.descricao}
                  onChange={(evento) =>
                    setFormSub((atual) => ({
                      ...atual,
                      descricao: evento.target.value
                    }))
                  }
                />
              </label>

              <label>
                Regras
                <textarea
                  rows="8"
                  value={formSub.regras}
                  onChange={(evento) =>
                    setFormSub((atual) => ({
                      ...atual,
                      regras: evento.target.value
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