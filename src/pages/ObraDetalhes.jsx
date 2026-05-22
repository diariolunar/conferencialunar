import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  atualizarObra,
  buscarObraPorId
} from "../services/obrasService.js";

import {
  atualizarCapituloDaObra,
  atualizarDetalhesCapitulo,
  excluirCapitulo,
  listarCapitulosDaObra,
  salvarCapituloDaObra,
  salvarCapitulosDaObra
} from "../services/capitulosService.js";

import { buscarDetalhesCapituloWattpad } from "../services/capitulosDetalhesService.js";

const TIPOS_CAPITULO = ["Normal", "Especial", "Poesia"];

function separarCapitulosEmLote(texto = "", ordemInicial = 1) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => {
      const partes = linha.split("|").map((parte) => parte.trim());

      return {
        titulo: partes[0] || `Capítulo ${ordemInicial + index}`,
        link: partes[1] || "",
        tipo: TIPOS_CAPITULO.includes(partes[2]) ? partes[2] : "Normal",
        palavras: 0,
        paragrafos: 0,
        comentariosTotais: 0,
        distribuicaoComentarios: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        },
        ordem: ordemInicial + index
      };
    });
}

export default function ObraDetalhes() {
  const { obraId } = useParams();

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);

  const [tituloObra, setTituloObra] = useState("");
  const [autor, setAutor] = useState("");
  const [userAutor, setUserAutor] = useState("");
  const [capa, setCapa] = useState("");
  const [linkObra, setLinkObra] = useState("");

  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [palavras, setPalavras] = useState("");
  const [paragrafos, setParagrafos] = useState("");
  const [ordem, setOrdem] = useState("");
  const [tipo, setTipo] = useState("Normal");

  const [capitulosEmLote, setCapitulosEmLote] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvandoObra, setSalvandoObra] = useState(false);
  const [salvandoCapitulo, setSalvandoCapitulo] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [atualizandoCapituloId, setAtualizandoCapituloId] = useState("");
  const [atualizandoTodos, setAtualizandoTodos] = useState(false);
  const [alterandoTipoId, setAlterandoTipoId] = useState("");

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

      setTituloObra(obraEncontrada.titulo || "");
      setAutor(obraEncontrada.autor || "");
      setUserAutor(obraEncontrada.userAutor || "");
      setCapa(obraEncontrada.capa || "");
      setLinkObra(obraEncontrada.link || "");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar detalhes da obra.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvarObra(evento) {
    evento.preventDefault();

    if (!tituloObra.trim()) {
      setMensagem("Informe o título da obra.");
      return;
    }

    setSalvandoObra(true);
    setMensagem("");

    try {
      await atualizarObra(obraId, {
        titulo: tituloObra.trim(),
        autor: autor.trim(),
        userAutor: userAutor.replace(/^@/, "").trim(),
        capa: capa.trim(),
        link: linkObra.trim()
      });

      setMensagem("Dados da obra atualizados com sucesso.");
      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar obra.");
    } finally {
      setSalvandoObra(false);
    }
  }

  async function handleSalvarCapitulo(evento) {
    evento.preventDefault();

    if (!titulo.trim()) {
      setMensagem("Informe o título real do capítulo.");
      return;
    }

    setSalvandoCapitulo(true);
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
      setSalvandoCapitulo(false);
    }
  }

  async function handleSalvarCapitulosEmLote(evento) {
    evento.preventDefault();

    if (!capitulosEmLote.trim()) {
      setMensagem("Cole ao menos um capítulo para cadastrar em lote.");
      return;
    }

    setSalvandoLote(true);
    setMensagem("");

    try {
      const ordemInicial = capitulos.length + 1;
      const capitulosNovos = separarCapitulosEmLote(
        capitulosEmLote,
        ordemInicial
      );

      const resultado = await salvarCapitulosDaObra(obraId, capitulosNovos);

      setCapitulosEmLote("");

      setMensagem(
        `${resultado.total} capítulo(s) processado(s): ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s).`
      );

      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar capítulos em lote.");
    } finally {
      setSalvandoLote(false);
    }
  }

  async function handleAlterarTipoCapitulo(capitulo, novoTipo) {
    setAlterandoTipoId(capitulo.id);
    setMensagem("");

    try {
      await atualizarCapituloDaObra(obraId, capitulo.id, {
        tipo: novoTipo
      });

      setMensagem("Tipo do capítulo atualizado.");
      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar tipo do capítulo.");
    } finally {
      setAlterandoTipoId("");
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

  async function atualizarDetalhesDeUmCapitulo(capitulo) {
    if (!capitulo.link && !capitulo.wattpadId) {
      setMensagem("Este capítulo não possui link ou ID do Wattpad.");
      return;
    }

    setAtualizandoCapituloId(capitulo.id);
    setMensagem("");

    try {
      const detalhes = await buscarDetalhesCapituloWattpad({
        capituloId: capitulo.wattpadId,
        linkCapitulo: capitulo.link
      });

      await atualizarDetalhesCapitulo(obraId, capitulo.id, detalhes);

      setMensagem(
        `Detalhes atualizados: ${detalhes.palavras} palavras, ${detalhes.paragrafos} parágrafos.`
      );

      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao atualizar detalhes do capítulo.");
    } finally {
      setAtualizandoCapituloId("");
    }
  }

  async function atualizarDetalhesDeTodos() {
    const confirmar = window.confirm(
      "Deseja buscar palavras, parágrafos e comentários de todos os capítulos? Isso pode demorar."
    );

    if (!confirmar) return;

    setAtualizandoTodos(true);
    setMensagem("");

    try {
      let atualizados = 0;
      let falhas = 0;

      for (const capitulo of capitulos) {
        if (!capitulo.link && !capitulo.wattpadId) {
          falhas += 1;
          continue;
        }

        setMensagem(
          `Atualizando ${atualizados + falhas + 1}/${capitulos.length}: ${capitulo.titulo}`
        );

        try {
          const detalhes = await buscarDetalhesCapituloWattpad({
            capituloId: capitulo.wattpadId,
            linkCapitulo: capitulo.link
          });

          await atualizarDetalhesCapitulo(obraId, capitulo.id, detalhes);

          atualizados += 1;
        } catch (erro) {
          console.error("Erro ao atualizar capítulo:", capitulo.titulo, erro);
          falhas += 1;
        }
      }

      setMensagem(
        `${atualizados} capítulo(s) atualizado(s). ${falhas} capítulo(s) com falha ou sem link.`
      );

      await carregarDados();
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao atualizar detalhes dos capítulos.");
    } finally {
      setAtualizandoTodos(false);
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
          <p>Edite dados da obra e revise os capítulos cadastrados.</p>
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

          <p>
            {obra.autor || "Autor não informado"}
            {obra.userAutor ? ` • @${obra.userAutor}` : ""}
          </p>

          {obra.link ? (
            <a href={obra.link} target="_blank" rel="noreferrer">
              Abrir obra no Wattpad
            </a>
          ) : (
            <p>Obra sem link cadastrado.</p>
          )}

          <p>
            Wattpad ID: <strong>{obra.wattpadId || "-"}</strong>
          </p>

          <p>
            Capítulos cadastrados: <strong>{capitulos.length}</strong>
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Editar dados da obra</h3>

        <form className="form-grid" onSubmit={handleSalvarObra}>
          <label>
            Título da obra
            <input
              type="text"
              value={tituloObra}
              onChange={(evento) => setTituloObra(evento.target.value)}
              placeholder="Título da obra"
            />
          </label>

          <div className="form-row-2">
            <label>
              Nome do autor
              <input
                type="text"
                value={autor}
                onChange={(evento) => setAutor(evento.target.value)}
                placeholder="Nome do autor"
              />
            </label>

            <label>
              User do autor no Wattpad
              <input
                type="text"
                value={userAutor}
                onChange={(evento) => setUserAutor(evento.target.value)}
                placeholder="@user"
              />
            </label>
          </div>

          <label>
            Link da capa
            <input
              type="url"
              value={capa}
              onChange={(evento) => setCapa(evento.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            Link da obra
            <input
              type="url"
              value={linkObra}
              onChange={(evento) => setLinkObra(evento.target.value)}
              placeholder="https://www.wattpad.com/story/..."
            />
          </label>

          <button type="submit" className="button-primary" disabled={salvandoObra}>
            {salvandoObra ? "Salvando..." : "Salvar dados da obra"}
          </button>
        </form>
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
              placeholder="Ex: Especial - As Grandes Casas de Aurealis"
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

          <button
            type="submit"
            className="button-primary"
            disabled={salvandoCapitulo}
          >
            {salvandoCapitulo ? "Salvando..." : "Salvar capítulo"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Cadastrar vários capítulos</h3>

        <form className="form-grid" onSubmit={handleSalvarCapitulosEmLote}>
          <label>
            Capítulos em lote
            <textarea
              rows="8"
              value={capitulosEmLote}
              onChange={(evento) => setCapitulosEmLote(evento.target.value)}
              placeholder={
                "Um por linha, neste formato:\nTítulo do capítulo | link do capítulo | tipo\n\nExemplo:\nCapítulo 1 | https://www.wattpad.com/123456 | Normal\nEspecial do Lobo | https://www.wattpad.com/789101 | Especial"
              }
            />
          </label>

          <div className="notice-card">
            Se o capítulo já existir, ele será atualizado em vez de duplicado.
          </div>

          <button type="submit" className="button-primary" disabled={salvandoLote}>
            {salvandoLote ? "Salvando..." : "Salvar capítulos em lote"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="page-title-row">
          <div>
            <h3>Capítulos cadastrados</h3>
            <p>
              Busque palavras, parágrafos e comentários reais do Wattpad para
              melhorar a conferência.
            </p>
          </div>

          <button
            type="button"
            className="button-primary"
            onClick={atualizarDetalhesDeTodos}
            disabled={atualizandoTodos || capitulos.length === 0}
          >
            {atualizandoTodos ? "Atualizando..." : "Atualizar todos"}
          </button>
        </div>

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
                  <th>Comentários</th>
                  <th>Distribuição</th>
                  <th>Link</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {capitulos.map((capitulo) => (
                  <tr key={capitulo.id}>
                    <td>{capitulo.ordem || "-"}</td>

                    <td>{capitulo.titulo}</td>

                    <td>
                      <select
                        value={capitulo.tipo || "Normal"}
                        onChange={(evento) =>
                          handleAlterarTipoCapitulo(
                            capitulo,
                            evento.target.value
                          )
                        }
                        disabled={
                          atualizandoTodos ||
                          alterandoTipoId === capitulo.id
                        }
                      >
                        {TIPOS_CAPITULO.map((tipoCapitulo) => (
                          <option key={tipoCapitulo} value={tipoCapitulo}>
                            {tipoCapitulo}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>{capitulo.palavras || 0}</td>

                    <td>{capitulo.paragrafos || 0}</td>

                    <td>{capitulo.comentariosTotais || 0}</td>

                    <td>
                      I: {capitulo.distribuicaoComentarios?.inicio || 0} / M:{" "}
                      {capitulo.distribuicaoComentarios?.meio || 0} / F:{" "}
                      {capitulo.distribuicaoComentarios?.fim || 0} / G:{" "}
                      {capitulo.distribuicaoComentarios?.geral || 0}
                    </td>

                    <td>
                      {capitulo.link ? (
                        <a href={capitulo.link} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      ) : (
                        "Sem link"
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => atualizarDetalhesDeUmCapitulo(capitulo)}
                          disabled={
                            atualizandoTodos ||
                            atualizandoCapituloId === capitulo.id
                          }
                        >
                          {atualizandoCapituloId === capitulo.id
                            ? "Buscando..."
                            : "Buscar dados"}
                        </button>

                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleExcluirCapitulo(capitulo.id)}
                          disabled={atualizandoTodos}
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