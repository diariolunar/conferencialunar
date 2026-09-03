import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  buscarAutorPorId,
  sincronizarAutorWattpad
} from "../services/autoresService.js";
import { listarObras } from "../services/obrasService.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

function primeiraLetra(valor = "?") {
  return String(valor || "?").trim().slice(0, 1).toUpperCase() || "?";
}

function formatarNumero(valor) {
  return new Intl.NumberFormat("pt-BR").format(Number(valor || 0));
}

function AvatarAutor({ autor, nome }) {
  const [falhou, setFalhou] = useState(false);
  const avatar =
    autor.avatar ||
    (autor.user
      ? `https://img.wattpad.com/useravatar/${encodeURIComponent(
          autor.user
        )}.128.333425.jpg`
      : "");

  if (!avatar || falhou) {
    return (
      <div className="author-detail-avatar author-detail-avatar-fallback" aria-hidden="true">
        {primeiraLetra(nome)}
      </div>
    );
  }

  return (
    <img
      className="author-detail-avatar"
      src={avatar}
      alt={`Foto de perfil de ${nome}`}
      onError={() => setFalhou(true)}
    />
  );
}

export default function AutorDetalhes() {
  const { autorId } = useParams();
  const [autor, setAutor] = useState(null);
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setMensagem("");

      try {
        const [autorInicial, obrasEncontradas] = await Promise.all([
          buscarAutorPorId(autorId),
          listarObras()
        ]);

        if (!ativo) return;
        let autorEncontrado = autorInicial;

        if (
          autorEncontrado?.user &&
          (!autorEncontrado.avatar || !autorEncontrado.perfilAtualizadoEm)
        ) {
          try {
            const perfilAtualizado = await sincronizarAutorWattpad(autorEncontrado);
            autorEncontrado = { ...autorEncontrado, ...perfilAtualizado };
          } catch (erroPerfil) {
            console.warn("Perfil do autor não pôde ser sincronizado:", erroPerfil);
          }
        }

        if (!ativo) return;
        setAutor(autorEncontrado);
        setObras(obrasEncontradas);
        if (!autorEncontrado) setMensagem("Autor não encontrado.");
      } catch (erro) {
        console.error(erro);
        if (ativo) setMensagem("Erro ao carregar o perfil do autor.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [autorId]);

  const obrasVinculadas = useMemo(() => {
    if (!autor) return [];

    const userNormalizado = normalizarTexto(autor.user || "");
    return obras.filter(
      (obra) =>
        obra.autorId === autor.id ||
        (userNormalizado &&
          normalizarTexto(obra.userAutor || "") === userNormalizado)
    );
  }, [autor, obras]);

  if (carregando) {
    return (
      <section className="page">
        <div className="card">
          <div className="empty-state">Carregando perfil...</div>
        </div>
      </section>
    );
  }

  if (!autor) {
    return (
      <section className="page">
        <div className="card author-detail-empty">
          <p>{mensagem || "Autor não encontrado."}</p>
          <Link className="button-secondary" to="/autores">
            Voltar para autores
          </Link>
        </div>
      </section>
    );
  }

  const nome = autor.nome || autor.user || "Autor sem nome";

  return (
    <section className="page author-detail-page">
      <Link className="back-link" to="/autores">
        ← Voltar para autores
      </Link>

      <div className="author-detail-hero card">
        <div className="author-detail-avatar-wrap">
          <AvatarAutor autor={autor} nome={nome} />
        </div>

        <div className="author-detail-info">
          <div className="author-detail-title-row">
            <div>
              <p className="eyebrow">Perfil do autor</p>
              <h2>{nome}</h2>
              <p className="author-detail-user">@{autor.user}</p>
            </div>
            {autor.verificado && <span className="author-verified-badge">✓ Verificado</span>}
          </div>

          {autor.descricaoPerfil ? (
            <p className="author-detail-bio">{autor.descricaoPerfil}</p>
          ) : (
            <p className="author-detail-bio author-detail-bio-muted">
              Perfil do Wattpad ainda sem descrição cadastrada.
            </p>
          )}

          <div className="author-stats" aria-label="Estatísticas do autor">
            <div><strong>{formatarNumero(autor.seguidores)}</strong><span>seguidores</span></div>
            <div><strong>{formatarNumero(autor.seguindo)}</strong><span>seguindo</span></div>
            <div><strong>{formatarNumero(autor.historiasPublicadas)}</strong><span>histórias</span></div>
            <div><strong>{obrasVinculadas.length}</strong><span>obras cadastradas</span></div>
          </div>

          <a
            className="button-primary author-wattpad-button"
            href={
              autor.linkPerfil ||
              `https://www.wattpad.com/user/${encodeURIComponent(autor.user || "")}`
            }
            target="_blank"
            rel="noreferrer"
          >
            Abrir perfil no Wattpad ↗
          </a>
        </div>
      </div>

      <div className="card">
        <div className="page-title-row author-works-heading">
          <div>
            <h3>Obras cadastradas</h3>
            <p>{obrasVinculadas.length} obra(s) vinculada(s) a este autor.</p>
          </div>
        </div>

        {obrasVinculadas.length === 0 ? (
          <div className="empty-state">Nenhuma obra vinculada a este autor ainda.</div>
        ) : (
          <div className="author-linked-works-grid">
            {obrasVinculadas.map((obra) => (
              <Link className="author-work-card" to={`/obras/${obra.id}`} key={obra.id}>
                <div className="author-work-cover">
                  {obra.capa ? (
                    <img src={obra.capa} alt={`Capa de ${obra.titulo}`} />
                  ) : (
                    <span>Sem capa</span>
                  )}
                </div>
                <div className="author-work-info">
                  <h4>{obra.titulo || "Obra sem título"}</h4>
                  <span>Wattpad ID: {obra.wattpadId || "-"}</span>
                  <strong>Ver detalhes →</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
