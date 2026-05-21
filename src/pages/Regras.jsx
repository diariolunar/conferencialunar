import { useEffect, useState } from "react";

import {
  buscarRegrasPadrao,
  REGRAS_PADRAO,
  salvarRegrasPadrao
} from "../services/regrasService.js";

export default function Regras() {
  const [regras, setRegras] = useState(REGRAS_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function carregarRegras() {
    setCarregando(true);

    try {
      const dados = await buscarRegrasPadrao();
      setRegras(dados);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar regras.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setRegras((estadoAtual) => ({
      ...estadoAtual,
      [campo]: Number(valor)
    }));
  }

  async function handleSalvar(evento) {
    evento.preventDefault();

    setSalvando(true);
    setMensagem("");

    try {
      await salvarRegrasPadrao(regras);
      setMensagem("Regras salvas com sucesso.");
      await carregarRegras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar regras.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregarRegras();
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Regras de conferência</h2>
        <p>Configure os mínimos usados na verificação das leituras.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Regra padrão</h3>

        {carregando ? (
          <div className="empty-state">Carregando regras...</div>
        ) : (
          <form className="form-grid" onSubmit={handleSalvar}>
            <label>
              Comentários mínimos em capítulo normal
              <input
                type="number"
                min="1"
                value={regras.minimoNormal}
                onChange={(evento) =>
                  atualizarCampo("minimoNormal", evento.target.value)
                }
              />
            </label>

            <label>
              Comentários mínimos em capítulo curto
              <input
                type="number"
                min="1"
                value={regras.minimoCurto}
                onChange={(evento) =>
                  atualizarCampo("minimoCurto", evento.target.value)
                }
              />
            </label>

            <label>
              Limite de palavras para capítulo curto
              <input
                type="number"
                min="1"
                value={regras.palavrasCapituloCurto}
                onChange={(evento) =>
                  atualizarCampo("palavrasCapituloCurto", evento.target.value)
                }
              />
            </label>

            <label>
              Comentários mínimos em capítulo longo
              <input
                type="number"
                min="1"
                value={regras.minimoLongo}
                onChange={(evento) =>
                  atualizarCampo("minimoLongo", evento.target.value)
                }
              />
            </label>

            <label>
              Limite de palavras para capítulo longo
              <input
                type="number"
                min="1"
                value={regras.palavrasCapituloLongo}
                onChange={(evento) =>
                  atualizarCampo("palavrasCapituloLongo", evento.target.value)
                }
              />
            </label>

            <label>
              Comentários mínimos em capítulo especial
              <input
                type="number"
                min="1"
                value={regras.minimoEspecial}
                onChange={(evento) =>
                  atualizarCampo("minimoEspecial", evento.target.value)
                }
              />
            </label>

            <label>
              Comentários mínimos em poesia
              <input
                type="number"
                min="1"
                value={regras.minimoPoesia}
                onChange={(evento) =>
                  atualizarCampo("minimoPoesia", evento.target.value)
                }
              />
            </label>

            <label>
              Palavras por minuto para cálculo de tempo
              <input
                type="number"
                min="1"
                value={regras.palavrasPorMinuto}
                onChange={(evento) =>
                  atualizarCampo("palavrasPorMinuto", evento.target.value)
                }
              />
            </label>

            <button type="submit" className="button-primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar regras"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}