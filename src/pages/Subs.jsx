import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  listarSubs,
  salvarOuAtualizarSub
} from "../services/subsService.js";

export default function Subs() {
  const [subs, setSubs] = useState([]);
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
      await salvarOuAtualizarSub(formSub);
      setMensagem("Sub criado com sucesso.");
      setModalAberto(false);
      await carregarSubs();
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
          <p>Gerencie os subs usados nas conferências.</p>
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

      <div className="card">
        <h3>Subs cadastrados</h3>

        {subsOrdenados.length === 0 ? (
          <div className="empty-state">Nenhum sub cadastrado.</div>
        ) : (
          <div className="works-list">
            {subsOrdenados.map((sub) => (
              <div className="work-list-card" key={sub.id}>
                <div className="work-list-cover">
                  {sub.imagemPerfil ? (
                    <img src={sub.imagemPerfil} alt={sub.nome} />
                  ) : (
                    <div className="obra-cover-placeholder">Sem imagem</div>
                  )}
                </div>

                <div className="work-list-info">
                  <h3>{sub.nome || "Sem nome"}</h3>

                  <p>
                    {sub.codigo || "Sem código"}
                    {sub.adm ? ` • ADM ${sub.adm}` : ""}
                  </p>

                  {sub.identidadeVisual && <span>{sub.identidadeVisual}</span>}
                </div>

                <div className="work-list-actions">
                  <Link className="button-secondary" to={`/subs/${sub.id}`}>
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
              <h3>Novo sub</h3>

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