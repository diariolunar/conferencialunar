import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buscarObraPorId } from "../services/obrasService.js";

import {
  excluirCapitulo,
  listarCapitulosDaObra,
  salvarCapituloDaObra
} from "../services/capitulosService.js";

const TIPOS_CAPITULO = ["Normal", "Especial", "Poesia"];

export default function ObraDetalhes() {
  const { obraId } = useParams();

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);

  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [palavras, setPalavras] = useState("");
  const [paragrafos, setParagrafos] = useState("");
  const [ordem, setOrdem] = useState("");
  const [tipo, setTipo] = useState("Normal");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function carregarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      const obraEncontrada = await buscarObraPorId(obraId);

      if (!obraEncontrada) {
        setObra(null);
        setCapitulos([]);
        setMensagem("Obra não encontrada.");
        return;
      }

      const capitulosEncontrados = await listarCapitulosDaObra(obraId);

      setObra(obraEncontrada);
      setCapitulos(capitulosEncontrados);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar detalhes da obra.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvarCapitulo(evento) {
    evento.preventDefault();

    if (!titulo.trim()) {
      setMensagem("Informe o título real do capítulo.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      await salvarCapituloDaObra(obraId, {
        titulo: titulo.trim(),
        link: link.trim(),
        palavras: Number(palavras || 0),
        paragrafos: Number(paragrafos || 0),
        ordem: Number(ordem || capitulos.length + 1),
        tipo
      });

      setTitulo("");
      setLink("");
      setPalavras("");
      setParagrafos("");
      setOrdem("");
      setTipo("Normal");

      setMensagem("Capítulo salvo com sucesso.");
      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar capítulo.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirCapitulo(capituloId) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este capítulo?"
    );

    if (!confirmar) return;

    try {
      await excluirCapitulo(obraId, capituloId);
      setMensagem("Capítulo excluído com sucesso.");
      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir capítulo.");
    }
  }

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando detalhes da obra...</div>
        </div>
      </section>
    );
  }

  if (!obra) {
    return (
      <section className="page">
        <div className="page-title">
          <h2>Obra não encontrada</h2>
          <p>Volte para a lista de obras e tente novamente.</p>
        </div>

        <Link to="/obras" className="button-secondary">
          Voltar para obras
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>{obra.titulo}</h2>
          <p>Capítulos cadastrados para reconhecimento na conferência.</p>
        </div>

        <Link to="/obras" className="button-secondary">
          Voltar
        </Link>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="obra-header-card">
        {obra.capa ? (
          <img src={obra.capa} alt={`Capa da obra ${obra.titulo}`} />
        ) : (
          <div className="obra-cover-placeholder">Sem capa</div>
        )}

        <div>
          <h3>{obra.titulo}</h3>

          {obra.link ? (
            <a href={obra.link} target="_blank" rel="noreferrer">
              Abrir obra no Wattpad
            </a>
          ) : (
            <p>Obra sem link cadastrado.</p>
          )}

          {obra.descricao && <p>{obra.descricao}</p>}

          <p>
            Wattpad ID: <strong>{obra.wattpadId || "-"}</strong>
          </p>

          <p>
            Capítulos cadastrados: <strong>{capitulos.length}</strong>
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Cadastrar capítulo manualmente</h3>

        <form className="form-grid" onSubmit={handleSalvarCapitulo}>
          <label>
            Título real do capítulo
            <input
              type="text"
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="Ex: A do meio"
            />
          </label>

          <label>
            Link do capítulo
            <input
              type="url"
              value={link}
              onChange={(evento) => setLink(evento.target.value)}
              placeholder="https://www.wattpad.com/..."
            />
          </label>

          <div className="form-row-3">
            <label>
              Ordem interna
              <input
                type="number"
                min="1"
                value={ordem}
                onChange={(evento) => setOrdem(evento.target.value)}
                placeholder={String(capitulos.length + 1)}
              />
            </label>

            <label>
              Palavras
              <input
                type="number"
                min="0"
                value={palavras}
                onChange={(evento) => setPalavras(evento.target.value)}
                placeholder="0"
              />
            </label>

            <label>
              Parágrafos
              <input
                type="number"
                min="0"
                value={paragrafos}
                onChange={(evento) => setParagrafos(evento.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <label>
            Tipo padrão do capítulo
            <select
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
            >
              {TIPOS_CAPITULO.map((tipoCapitulo) => (
                <option key={tipoCapitulo} value={tipoCapitulo}>
                  {tipoCapitulo}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="button-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar capítulo"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Capítulos cadastrados</h3>

        {capitulos.length === 0 ? (
          <div className="empty-state">
            Nenhum capítulo cadastrado para esta obra.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Título real</th>
                  <th>Tipo</th>
                  <th>Palavras</th>
                  <th>Parágrafos</th>
                  <th>Link</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {capitulos.map((capitulo) => (
                  <tr key={capitulo.id}>
                    <td>{capitulo.ordem || "-"}</td>
                    <td>{capitulo.titulo}</td>
                    <td>{capitulo.tipo || "Normal"}</td>
                    <td>{capitulo.palavras || 0}</td>
                    <td>{capitulo.paragrafos || 0}</td>
                    <td>
                      {capitulo.link ? (
                        <a href={capitulo.link} target="_blank" rel="noreferrer">
                          Abrir capítulo
                        </a>
                      ) : (
                        "Sem link"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-danger"
                        onClick={() => handleExcluirCapitulo(capitulo.id)}
                      >
                        Excluir
                      </button>
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