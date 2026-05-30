import { useEffect, useMemo, useState } from "react";

import {
  excluirAutor,
  listarAutores,
  salvarOuAtualizarAutor
} from "../services/autoresService.js";

import { normalizarTexto } from "../utils/normalizarTexto.js";

export default function Autores() {
  const [autores, setAutores] = useState([]);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [formAutor, setFormAutor] = useState({
    id: "",
    nome: "",
    user: "",
    linkPerfil: ""
  });

  const autoresFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return [...autores]
      .filter((autor) => {
        if (!termo) return true;

        const alvo = normalizarTexto(
          [autor.nome, autor.user, autor.linkPerfil].filter(Boolean).join(" ")
        );

        return alvo.includes(termo);
      })
      .sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base"
        })
      );
  }, [autores, busca]);

  async function carregarAutores() {
    setCarregando(true);
    setMensagem("");

    try {
      const lista = await listarAutores();
      setAutores(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar autores.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAutores();
  }, []);

  function limparFormulario() {
    setFormAutor({
      id: "",
      nome: "",
      user: "",
      linkPerfil: ""
    });
  }

  function editarAutor(autor) {
    setFormAutor({
      id: autor.id || "",
      nome: autor.nome || "",
      user: autor.user || "",
      linkPerfil: autor.linkPerfil || ""
    });
  }

  async function salvarAutorAtual(evento) {
    evento.preventDefault();

    if (!formAutor.nome.trim()) {
      setMensagem("Informe o nome do autor.");
      return;
    }

    if (!formAutor.user.trim()) {
      setMensagem("Informe o user do autor.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      await salvarOuAtualizarAutor({
        ...formAutor,
        user: formAutor.user.replace(/^@/, "").trim()
      });

      setMensagem(formAutor.id ? "Autor atualizado." : "Autor cadastrado.");
      limparFormulario();
      await carregarAutores();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar autor.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerAutor(autorId) {
    const confirmar = window.confirm("Deseja realmente excluir este autor?");

    if (!confirmar) return;

    try {
      await excluirAutor(autorId);
      setMensagem("Autor excluído.");
      await carregarAutores();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir autor.");
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando autores...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Autores</h2>
        <p>Cadastre autores para selecionar automaticamente nas obras.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>{formAutor.id ? "Editar autor" : "Cadastrar autor"}</h3>

        <form className="form-grid" onSubmit={salvarAutorAtual}>
          <div className="form-row-2">
            <label>
              Nome do autor
              <input
                type="text"
                value={formAutor.nome}
                onChange={(evento) =>
                  setFormAutor((atual) => ({
                    ...atual,
                    nome: evento.target.value
                  }))
                }
                placeholder="Nome"
              />
            </label>

            <label>
              User do Wattpad
              <input
                type="text"
                value={formAutor.user}
                onChange={(evento) =>
                  setFormAutor((atual) => ({
                    ...atual,
                    user: evento.target.value
                  }))
                }
                placeholder="@user"
              />
            </label>
          </div>

          <label>
            Link do perfil no Wattpad
            <input
              type="url"
              value={formAutor.linkPerfil}
              onChange={(evento) =>
                setFormAutor((atual) => ({
                  ...atual,
                  linkPerfil: evento.target.value
                }))
              }
              placeholder="https://www.wattpad.com/user/..."
            />
          </label>

          <div className="actions-row">
            <button type="submit" className="button-primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar autor"}
            </button>

            {formAutor.id && (
              <button
                type="button"
                className="button-secondary"
                onClick={limparFormulario}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="page-title-row">
          <div>
            <h3>Autores cadastrados</h3>
            <p>
              {autoresFiltrados.length} autor(es) exibido(s) de {autores.length}.
            </p>
          </div>

          <label className="search-field">
            Buscar autor
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome ou user"
            />
          </label>
        </div>

        {autoresFiltrados.length === 0 ? (
          <div className="empty-state">Nenhum autor encontrado.</div>
        ) : (
          <div className="dashboard-list">
            {autoresFiltrados.map((autor) => (
              <div className="dashboard-list-item" key={autor.id}>
                <div>
                  <strong>{autor.nome}</strong>
                  <span>
                    @{autor.user}
                    {autor.linkPerfil ? ` • ${autor.linkPerfil}` : ""}
                  </span>
                </div>

                <div className="actions-row">
                  {autor.linkPerfil && (
                    <a
                      className="button-secondary"
                      href={autor.linkPerfil}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Perfil
                    </a>
                  )}

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => editarAutor(autor)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => removerAutor(autor.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}