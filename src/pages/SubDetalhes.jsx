import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  atualizarSub,
  buscarSubPorId
} from "../services/subsService.js";

import FeedbackModal from "../components/FeedbackModal.jsx";

function transformarImagemDrive(url = "") {
  const texto = String(url || "").trim();

  if (!texto.includes("drive.google.com")) {
    return texto;
  }

  const match = texto.match(/\/d\/([^/]+)/);

  if (!match?.[1]) {
    return texto;
  }

  return `https://lh3.googleusercontent.com/d/${match[1]}`;
}

export default function SubDetalhes() {
  const { subId } = useParams();

  const [sub, setSub] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editando, setEditando] = useState(false);

  const [formSub, setFormSub] = useState({
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

  async function carregarSub() {
    setCarregando(true);
    setMensagem("");

    try {
      const encontrado = await buscarSubPorId(subId);

      if (!encontrado) {
        setMensagem("Sub não encontrado.");
        setSub(null);
        return;
      }

      setSub(encontrado);

      setFormSub({
        nome: encontrado.nome || "",
        codigo: encontrado.codigo || "",
        adm: encontrado.adm || "",
        imagemPerfil: encontrado.imagemPerfil || "",
        corPrimaria: encontrado.corPrimaria || "#6B21A8",
        corSecundaria: encontrado.corSecundaria || "#3B0764",
        corDestaque: encontrado.corDestaque || "#F5C842",
        identidadeVisual: encontrado.identidadeVisual || "",
        descricao: encontrado.descricao || "",
        regras: encontrado.regras || ""
      });
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar sub.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSub();
  }, [subId]);

  async function salvarEdicao(evento) {
    evento.preventDefault();

    if (!formSub.nome.trim()) {
      setMensagem("Informe o nome do sub.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      await atualizarSub(subId, formSub);

      setMensagem("Sub atualizado com sucesso.");
      setEditando(false);
      await carregarSub();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar sub.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando sub...</div>
        </div>
      </section>
    );
  }

  if (!sub) {
    return (
      <section className="page">
        <FeedbackModal
          mensagem={mensagem}
          carregando={carregando || salvando}
          onClose={() => setMensagem("")}
        />

        <Link className="button-secondary" to="/subs">
          Voltar para subs
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>{sub.nome}</h2>
          <p>Informações, identidade visual e regras do sub.</p>
        </div>

        <div className="actions-row">
          <Link className="button-secondary" to="/subs">
            Voltar
          </Link>

          <button
            type="button"
            className="button-primary"
            onClick={() => setEditando((valor) => !valor)}
          >
            {editando ? "Cancelar edição" : "Editar sub"}
          </button>
        </div>
      </div>

      <FeedbackModal
        mensagem={mensagem}
        carregando={carregando || salvando}
        onClose={() => setMensagem("")}
      />

      <div
        className="sub-hero-card"
        style={{
          background: `linear-gradient(135deg, ${
            sub.corPrimaria || "#6B21A8"
          }, ${sub.corSecundaria || "#3B0764"})`
        }}
      >
        <div className="sub-hero-image">
          {sub.imagemPerfil ? (
            <img
              src={transformarImagemDrive(sub.imagemPerfil)}
              alt={sub.nome}
            />
          ) : (
            <span>Sem imagem</span>
          )}
        </div>

        <div className="sub-hero-content">
          <h3>{sub.nome}</h3>

          <p>
            {sub.codigo || "Sem código"}
            {sub.adm ? ` • ADM ${sub.adm}` : ""}
          </p>

          {sub.identidadeVisual && (
            <div className="sub-identity-box">
              {sub.identidadeVisual}
            </div>
          )}
        </div>
      </div>

      {editando ? (
        <div className="card">
          <h3>Editar sub</h3>

          <form className="form-grid" onSubmit={salvarEdicao}>
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
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>Cores do sub</h3>

            <div className="sub-color-preview">
              <div>
                <span>Primária</span>

                <div
                  className="color-preview"
                  style={{
                    background: sub.corPrimaria
                  }}
                />
              </div>

              <div>
                <span>Secundária</span>

                <div
                  className="color-preview"
                  style={{
                    background: sub.corSecundaria
                  }}
                />
              </div>

              <div>
                <span>Destaque</span>

                <div
                  className="color-preview"
                  style={{
                    background: sub.corDestaque
                  }}
                />
              </div>
            </div>
          </div>

          <div className="sub-info-grid">
            <div className="card">
              <h3>Descrição</h3>

              {sub.descricao ? (
                <p>{sub.descricao}</p>
              ) : (
                <div className="empty-state">Nenhuma descrição cadastrada.</div>
              )}
            </div>

            <div className="card">
              <h3>Regras</h3>

              {sub.regras ? (
                <pre className="code-preview">{sub.regras}</pre>
              ) : (
                <div className="empty-state">Nenhuma regra cadastrada.</div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
