const CACHE_TTL_MS = 1000 * 60 * 5;
const RATE_LIMIT_MS = 450;

const cache = globalThis.__wattpadCache || new Map();
const rateState = globalThis.__wattpadRateState || {
  ultimoRequest: 0
};

globalThis.__wattpadCache = cache;
globalThis.__wattpadRateState = rateState;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respeitarRateLimit() {
  const agora = Date.now();
  const diferenca = agora - rateState.ultimoRequest;

  if (diferenca < RATE_LIMIT_MS) {
    await esperar(RATE_LIMIT_MS - diferenca);
  }

  rateState.ultimoRequest = Date.now();
}

function pegarCache(chave) {
  const item = cache.get(chave);

  if (!item) return null;

  if (Date.now() - item.criadoEm > CACHE_TTL_MS) {
    cache.delete(chave);
    return null;
  }

  return item.valor;
}

function salvarCache(chave, valor) {
  cache.set(chave, {
    criadoEm: Date.now(),
    valor
  });
}

function extrairIdCapitulo(linkOuId = "") {
  const texto = String(linkOuId || "").trim();

  const matchWattpad = texto.match(/wattpad\.com\/(\d+)/i);
  if (matchWattpad?.[1]) return matchWattpad[1];

  const matchNumero = texto.match(/^(\d{5,})$/);
  if (matchNumero?.[1]) return matchNumero[1];

  return "";
}

function normalizarUser(user = "") {
  return String(user || "")
    .normalize("NFKC")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
}

function limparHtml(texto = "") {
  return String(texto || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contarPalavras(html = "") {
  const texto = limparHtml(html);
  return texto ? texto.match(/\S+/g)?.length || 0 : 0;
}

function extrairParagrafosDoHtml(html = "") {
  const matches = [...String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];

  return matches
    .map((match, index) => {
      const tagCompleta = match[0];
      const conteudo = match[1];

      const id =
        tagCompleta.match(/data-p-id=["']([^"']+)["']/i)?.[1] ||
        tagCompleta.match(/id=["']([^"']+)["']/i)?.[1] ||
        "";

      return {
        id,
        indice: index,
        texto: limparHtml(conteudo),
        palavras: contarPalavras(conteudo)
      };
    })
    .filter((paragrafo) => paragrafo.texto);
}

function classificarPosicao(indice, total) {
  if (total <= 1) return "inicio";

  const percentual = indice / Math.max(total - 1, 1);

  if (percentual <= 0.33) return "inicio";
  if (percentual <= 0.66) return "meio";
  return "fim";
}

async function fetchComTimeout(url, opcoes = {}, timeout = 12000) {
  await respeitarRateLimit();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resposta = await fetch(url, {
      ...opcoes,
      signal: controller.signal
    });

    return resposta;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonSeguro(url, fallback = null) {
  const cacheKey = `json:${url}`;
  const cacheado = pegarCache(cacheKey);

  if (cacheado) return cacheado;

  try {
    const resposta = await fetchComTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });

    if (!resposta.ok) return fallback;

    const dados = await resposta.json();

    salvarCache(cacheKey, dados);

    return dados;
  } catch {
    return fallback;
  }
}

async function fetchTextoSeguro(url) {
  const cacheKey = `text:${url}`;
  const cacheado = pegarCache(cacheKey);

  if (cacheado) return cacheado;

  try {
    const resposta = await fetchComTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });

    if (!resposta.ok) {
      throw new Error(`Wattpad respondeu com status ${resposta.status}.`);
    }

    const texto = await resposta.text();

    salvarCache(cacheKey, texto);

    return texto;
  } catch (erro) {
    if (erro.name === "AbortError") {
      throw new Error("Tempo limite excedido ao buscar o texto do capítulo.");
    }

    throw new Error(
      erro.message || "Não foi possível buscar o texto do capítulo no Wattpad."
    );
  }
}

async function fetchTextoCapitulo(capituloId) {
  const url = `https://www.wattpad.com/apiv2/?m=storytext&id=${capituloId}`;
  return fetchTextoSeguro(url);
}

async function fetchParagrafosApi(capituloId) {
  const url = `https://www.wattpad.com/v4/parts/${capituloId}/paragraphs`;
  const dados = await fetchJsonSeguro(url, { paragraphs: [] });

  return Array.isArray(dados?.paragraphs) ? dados.paragraphs : [];
}

function montarUrlComentariosGerais(capituloId, afterResourceId = "") {
  const url = new URL(
    `https://www.wattpad.com/v5/comments/namespaces/parts/resources/${capituloId}/comments`
  );

  url.searchParams.set("limit", "100");

  if (afterResourceId) {
    url.searchParams.set("after", afterResourceId);
  }

  return url.toString();
}

async function fetchComentariosGeraisCapitulo(capituloId) {
  const todosComentarios = [];

  let afterResourceId = "";
  let pagina = 0;

  while (pagina < 12) {
    const url = montarUrlComentariosGerais(capituloId, afterResourceId);
    const dados = await fetchJsonSeguro(url, { comments: [], pagination: {} });

    const comentarios = Array.isArray(dados?.comments) ? dados.comments : [];

    todosComentarios.push(...comentarios);

    const proximo = dados?.pagination?.after?.resourceId;

    if (!proximo || comentarios.length === 0) {
      break;
    }

    afterResourceId = proximo;
    pagina += 1;
  }

  return todosComentarios;
}

function combinarParagrafos(paragrafosHtml = [], paragrafosApi = []) {
  const totalReal = paragrafosHtml.length;
  const mapaApi = new Map();

  paragrafosApi.forEach((paragrafoApi) => {
    if (paragrafoApi.id) {
      mapaApi.set(paragrafoApi.id, paragrafoApi);
    }
  });

  return paragrafosHtml.map((paragrafoHtml, index) => {
    const api = mapaApi.get(paragrafoHtml.id) || {};

    return {
      id: paragrafoHtml.id,
      indice: index,
      texto: paragrafoHtml.texto || "",
      palavras: Number(paragrafoHtml.palavras || 0),
      commentCount: Number(api.commentCount || 0),
      posicao: classificarPosicao(index, totalReal)
    };
  });
}

function criarMapaParagrafos(paragrafos = []) {
  const mapa = new Map();

  paragrafos.forEach((paragrafo) => {
    if (paragrafo.id) {
      mapa.set(paragrafo.id, paragrafo);
    }
  });

  return mapa;
}

function extrairParagrafoIdDoComentario(comentario = {}, capituloId = "") {
  if (comentario.resource?.namespace !== "paragraphs") return "";

  const resourceId = comentario.resource?.resourceId || "";

  if (!resourceId) return "";

  return resourceId.replace(`${capituloId}_`, "");
}

function normalizarComentario({ comentario, capituloId, mapaParagrafos }) {
  const paragrafoId = extrairParagrafoIdDoComentario(comentario, capituloId);
  const paragrafo = paragrafoId ? mapaParagrafos.get(paragrafoId) : null;

  const ehComentarioGeral = comentario.resource?.namespace === "parts";

  return {
    id:
      comentario.commentId?.resourceId ||
      `${comentario.resource?.resourceId || capituloId}-${comentario.created || ""}`,
    texto: comentario.text || "",
    user: comentario.user?.name || "",
    avatar: comentario.user?.avatar || "",
    criadoEm: comentario.created || "",
    modificadoEm: comentario.modified || "",
    link: comentario.deeplink || "",
    paragrafoId,
    paragrafoIndice: paragrafo?.indice ?? null,
    posicao: ehComentarioGeral ? "geral" : paragrafo?.posicao || "geral",
    tipo: ehComentarioGeral ? "geral" : "paragrafo"
  };
}

function filtrarComentariosDoUsuario({
  comentarios = [],
  capituloId,
  paragrafos = [],
  userLeitor = ""
}) {
  const userNormalizado = normalizarUser(userLeitor);
  const mapaParagrafos = criarMapaParagrafos(paragrafos);

  if (!userNormalizado) return [];

  return comentarios
    .filter((comentario) => {
      const nomeComentario = normalizarUser(comentario.user?.name || "");
      return nomeComentario === userNormalizado;
    })
    .map((comentario) =>
      normalizarComentario({
        comentario,
        capituloId,
        mapaParagrafos
      })
    );
}

function removerComentariosDuplicados(comentarios = []) {
  const vistos = new Set();

  return comentarios.filter((comentario) => {
    const chave = comentario.id;

    if (!chave || vistos.has(chave)) return false;

    vistos.add(chave);
    return true;
  });
}

function contarDistribuicaoComentarios(comentarios = []) {
  return {
    inicio: comentarios.filter((comentario) => comentario.posicao === "inicio").length,
    meio: comentarios.filter((comentario) => comentario.posicao === "meio").length,
    fim: comentarios.filter((comentario) => comentario.posicao === "fim").length,
    geral: comentarios.filter((comentario) => comentario.posicao === "geral").length
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  try {
    const { capituloId, linkCapitulo, userLeitor } = req.body || {};
    const id = extrairIdCapitulo(capituloId || linkCapitulo);

    if (!id) {
      return res.status(400).json({
        erro: true,
        mensagem: "ID ou link do capítulo não informado."
      });
    }

    const [html, paragrafosApi, comentariosGerais] = await Promise.all([
      fetchTextoCapitulo(id),
      fetchParagrafosApi(id),
      fetchComentariosGeraisCapitulo(id)
    ]);

    const paragrafosHtml = extrairParagrafosDoHtml(html);
    const paragrafos = combinarParagrafos(paragrafosHtml, paragrafosApi);

    const comentariosUsuario = removerComentariosDuplicados(
      filtrarComentariosDoUsuario({
        comentarios: comentariosGerais,
        capituloId: id,
        paragrafos,
        userLeitor
      })
    );

    const palavras = paragrafos.reduce(
      (total, paragrafo) => total + Number(paragrafo.palavras || 0),
      0
    );

    const comentariosTotaisCapitulo = comentariosGerais.length;

    const distribuicaoComentariosUsuario =
      contarDistribuicaoComentarios(comentariosUsuario);

    return res.status(200).json({
      sucesso: true,
      capituloId: id,
      palavras,
      paragrafos: paragrafos.length,
      comentariosTotaisCapitulo,
      comentariosUsuarioTotal: comentariosUsuario.length,
      distribuicaoComentarios: distribuicaoComentariosUsuario,
      comentariosUsuario,
      paragrafosDetalhados: paragrafos,
      cache: {
        ativo: true,
        ttlMs: CACHE_TTL_MS
      },
      rateLimit: {
        intervaloMs: RATE_LIMIT_MS
      },
      avisos: {
        textoEncontrado: paragrafos.length > 0,
        comentariosEncontrados: comentariosGerais.length > 0
      }
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: true,
      tipo: "WATTPAD_FETCH_ERROR",
      mensagem:
        erro.message ||
        "Erro interno ao buscar detalhes do capítulo no Wattpad.",
      sugestao:
        "Tente novamente em alguns segundos. Se persistir, aprove manualmente com justificativa."
    });
  }
}